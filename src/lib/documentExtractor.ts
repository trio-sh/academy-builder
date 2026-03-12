import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_TEXT_LENGTH = 50; // Minimum chars to consider document as text-based (not scanned)

export interface DocumentExtractionResult {
  success: boolean;
  text: string;
  fileName: string;
  fileSize: number;
  error?: string;
}

function sanitizeText(text: string): string {
  // Remove null bytes and other control characters that PostgreSQL cannot store
  return text.replace(/\u0000/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function isAllowedFile(file: File): { allowed: boolean; reason?: string } {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return { allowed: false, reason: "Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { allowed: false, reason: "File is too large. Maximum size is 5MB." };
  }
  return { allowed: true };
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: { str?: string }) => item.str || "")
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n").replace(/\s+/g, " ").trim();
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export async function extractDocumentText(file: File): Promise<DocumentExtractionResult> {
  const validation = isAllowedFile(file);
  if (!validation.allowed) {
    return { success: false, text: "", fileName: file.name, fileSize: file.size, error: validation.reason };
  }

  try {
    let text = "";
    const ext = getFileExtension(file.name);

    if (file.type === "application/pdf" || ext === ".pdf") {
      text = await extractTextFromPDF(file);
    } else if (
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".doc" || ext === ".docx"
    ) {
      text = await extractTextFromDocx(file);
    } else if (file.type === "text/plain" || ext === ".txt") {
      text = await file.text();
    } else {
      return { success: false, text: "", fileName: file.name, fileSize: file.size, error: "Unsupported file type." };
    }

    // Sanitize: remove null bytes and control chars that PostgreSQL cannot store
    text = sanitizeText(text);

    if (text.length < MIN_TEXT_LENGTH) {
      return {
        success: false,
        text: "",
        fileName: file.name,
        fileSize: file.size,
        error: "This document appears to be scanned or image-based. Please upload a text-based document instead.",
      };
    }

    return { success: true, text: text.trim(), fileName: file.name, fileSize: file.size };
  } catch (error) {
    console.error("Document extraction error:", error);
    return {
      success: false,
      text: "",
      fileName: file.name,
      fileSize: file.size,
      error: "Failed to extract text from document. Please ensure it is a valid text-based file.",
    };
  }
}
