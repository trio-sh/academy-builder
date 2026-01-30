import { supabase } from "./supabase";

// Common skills to detect in resumes
const SKILL_KEYWORDS: Record<string, string[]> = {
  // Programming Languages
  programming: [
    "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go",
    "rust", "php", "swift", "kotlin", "scala", "perl", "r", "matlab",
  ],
  // Frontend
  frontend: [
    "react", "vue", "angular", "svelte", "html", "css", "sass", "less",
    "tailwind", "bootstrap", "jquery", "webpack", "vite", "next.js", "nuxt",
  ],
  // Backend
  backend: [
    "node.js", "express", "django", "flask", "spring", "rails", "laravel",
    "asp.net", "fastapi", "graphql", "rest", "api", "microservices",
  ],
  // Databases
  databases: [
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
    "firebase", "supabase", "dynamodb", "cassandra", "sqlite",
  ],
  // Cloud & DevOps
  cloud: [
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "ci/cd", "linux", "nginx", "apache", "heroku", "vercel", "netlify",
  ],
  // Data & AI
  data: [
    "machine learning", "deep learning", "data science", "pandas", "numpy",
    "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision",
  ],
  // Design
  design: [
    "figma", "sketch", "adobe xd", "photoshop", "illustrator", "ui/ux",
    "user research", "wireframing", "prototyping", "design systems",
  ],
  // Soft Skills
  soft_skills: [
    "communication", "leadership", "teamwork", "problem solving", "critical thinking",
    "time management", "project management", "agile", "scrum", "collaboration",
  ],
  // Business
  business: [
    "marketing", "sales", "analytics", "strategy", "product management",
    "customer service", "excel", "powerpoint", "presentation", "stakeholder",
  ],
};

// Education keywords
const EDUCATION_KEYWORDS = [
  "bachelor", "master", "phd", "doctorate", "associate", "degree",
  "university", "college", "school", "graduated", "graduation",
  "b.s.", "b.a.", "m.s.", "m.a.", "mba", "certificate", "certification",
];

// Experience keywords
const EXPERIENCE_KEYWORDS = [
  "experience", "worked", "employed", "position", "role", "job",
  "intern", "internship", "full-time", "part-time", "contract", "freelance",
  "manager", "developer", "engineer", "analyst", "designer", "specialist",
  "coordinator", "assistant", "director", "lead", "senior", "junior",
];

export interface ParsedResume {
  skills: string[];
  skillCategories: Record<string, string[]>;
  potentialExperience: string[];
  potentialEducation: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
  };
  rawText: string;
}

/**
 * Extract text from a PDF file using basic parsing
 * Note: For production, use a proper PDF library or backend service
 */
async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        // Basic PDF text extraction (simplified)
        // In production, use pdf.js or a backend service for proper extraction
        let text = "";

        // Convert to string and try to extract text content
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(uint8Array);

        // Look for text streams in PDF
        const textMatches = rawText.match(/\((.*?)\)/g);
        if (textMatches) {
          text = textMatches
            .map((match) => match.slice(1, -1))
            .filter((t) => t.length > 2 && !/^[\x00-\x1F]+$/.test(t))
            .join(" ");
        }

        // If no text found, try another method
        if (!text || text.length < 50) {
          // Look for text between BT and ET markers
          const btMatches = rawText.match(/BT([\s\S]*?)ET/g);
          if (btMatches) {
            text = btMatches
              .map((block) => {
                const tjMatches = block.match(/\[(.*?)\]TJ|\((.*?)\)Tj/g);
                if (tjMatches) {
                  return tjMatches
                    .map((m) => {
                      const textMatch = m.match(/\((.*?)\)/g);
                      return textMatch ? textMatch.map((t) => t.slice(1, -1)).join("") : "";
                    })
                    .join(" ");
                }
                return "";
              })
              .join(" ");
          }
        }

        // Clean up the extracted text
        text = text
          .replace(/\\[nrt]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        resolve(text);
      } catch (error) {
        // If parsing fails, return empty string (user will need to enter skills manually)
        console.warn("PDF parsing limited - manual skill entry recommended");
        resolve("");
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract email addresses from text
 */
function extractEmails(text: string): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches?.[0];
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text: string): string | undefined {
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
  const matches = text.match(phoneRegex);
  return matches?.[0];
}

/**
 * Extract LinkedIn URL from text
 */
function extractLinkedIn(text: string): string | undefined {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/gi;
  const matches = text.match(linkedinRegex);
  return matches?.[0];
}

/**
 * Extract skills from text
 */
function extractSkills(text: string): { skills: string[]; categories: Record<string, string[]> } {
  const lowerText = text.toLowerCase();
  const foundSkills: Set<string> = new Set();
  const categories: Record<string, string[]> = {};

  for (const [category, keywords] of Object.entries(SKILL_KEYWORDS)) {
    categories[category] = [];
    for (const keyword of keywords) {
      // Check for exact word match (with word boundaries)
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(lowerText)) {
        const skill = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        foundSkills.add(skill);
        categories[category].push(skill);
      }
    }
  }

  // Remove empty categories
  for (const category of Object.keys(categories)) {
    if (categories[category].length === 0) {
      delete categories[category];
    }
  }

  return {
    skills: Array.from(foundSkills).sort(),
    categories,
  };
}

/**
 * Extract potential education entries
 */
function extractEducation(text: string): string[] {
  const lines = text.split(/[.\n]/);
  const education: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (EDUCATION_KEYWORDS.some((keyword) => lowerLine.includes(keyword))) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        education.push(cleaned);
      }
    }
  }

  return education.slice(0, 5); // Limit to 5 entries
}

/**
 * Extract potential experience entries
 */
function extractExperience(text: string): string[] {
  const lines = text.split(/[.\n]/);
  const experience: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (EXPERIENCE_KEYWORDS.some((keyword) => lowerLine.includes(keyword))) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        experience.push(cleaned);
      }
    }
  }

  return experience.slice(0, 10); // Limit to 10 entries
}

/**
 * Parse a resume file and extract information
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  let text = "";

  if (file.type === "application/pdf") {
    text = await extractTextFromPDF(file);
  } else if (
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // For Word documents, we'd need a backend service or library
    // For now, return empty with a note
    console.warn("Word document parsing requires backend service");
    text = "";
  } else if (file.type === "text/plain") {
    text = await file.text();
  }

  // Extract information
  const { skills, categories } = extractSkills(text);

  return {
    skills,
    skillCategories: categories,
    potentialExperience: extractExperience(text),
    potentialEducation: extractEducation(text),
    contactInfo: {
      email: extractEmails(text),
      phone: extractPhones(text),
      linkedin: extractLinkedIn(text),
    },
    rawText: text,
  };
}

/**
 * Parse resume and update candidate profile with extracted skills
 */
export async function parseAndUpdateProfile(
  file: File,
  userId: string
): Promise<{ success: boolean; parsed: ParsedResume; error?: string }> {
  try {
    const parsed = await parseResume(file);

    if (parsed.skills.length > 0) {
      // Get existing skills
      const { data: candidateProfile } = await supabase
        .from("candidate_profiles")
        .select("skills")
        .eq("profile_id", userId)
        .single();

      const existingSkills = candidateProfile?.skills || [];

      // Merge skills (avoid duplicates)
      const mergedSkills = Array.from(
        new Set([...existingSkills, ...parsed.skills])
      );

      // Update profile with new skills
      await supabase
        .from("candidate_profiles")
        .update({
          skills: mergedSkills,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", userId);

      // Create growth log entry
      await supabase.from("growth_log_entries").insert({
        candidate_id: userId,
        event_type: "resume_upload",
        title: "Resume Parsed",
        description: `Extracted ${parsed.skills.length} skills from resume`,
        source_component: "ResumeParser",
        metadata: {
          skillsFound: parsed.skills.length,
          categories: Object.keys(parsed.skillCategories),
        },
      });
    }

    return { success: true, parsed };
  } catch (error) {
    console.error("Error parsing resume:", error);
    return {
      success: false,
      parsed: {
        skills: [],
        skillCategories: {},
        potentialExperience: [],
        potentialEducation: [],
        contactInfo: {},
        rawText: "",
      },
      error: "Failed to parse resume",
    };
  }
}

export const ResumeParser = {
  parseResume,
  parseAndUpdateProfile,
  extractSkills,
};

export default ResumeParser;
