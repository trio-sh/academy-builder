import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Clock,
  User,
  ArrowRight,
  Search,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  role?: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  body?: string;
}

export const featuredPost: BlogPost = {
  id: "future-of-credentialing",
  title: "The Future of Credentialing: Why Behavioral Validation Matters",
  excerpt:
    "Traditional credentials are failing both candidates and employers. Here's how mentor-gated behavioral validation is changing the game.",
  author: "Dr. Sarah Chen",
  role: "Chief Learning Officer",
  date: "January 25, 2026",
  readTime: "8 min read",
  category: "Industry Insights",
  image: "https://api.a0.dev/assets/image?text=Futuristic+credential+validation&aspect=16:9&seed=blog_featured",
  body: `The hiring landscape is undergoing a seismic shift. For decades, employers have relied on resumes, degrees, and standardized tests to evaluate candidates. But these traditional credentials tell only part of the story — they measure what someone studied, not how they perform in real workplace situations.

Behavioral validation represents a fundamentally different approach. Instead of relying on self-reported achievements, it uses structured mentor observation across multiple interaction loops to build an evidence-based profile of a candidate's workplace readiness.

At The 3rd Academy, we've built this into a three-loop validation process through MentorLink:

**Loop 1: Initial Observation** — Mentors observe candidates in simulated workplace scenarios, noting behavioral indicators like communication style, problem-solving approach, and collaboration patterns.

**Loop 2: Applied Challenge** — Candidates tackle real-world projects under mentor supervision, generating tangible evidence of their capabilities.

**Loop 3: Validation & Credential** — Final assessment synthesizes all observations into a Behavioral Evidence Report — an evidence-linked credential that employers can trust.

Early data from our pilot programs shows that candidates with behavioral credentials are 3.2x more likely to pass their 90-day employment review compared to those hired through traditional resume screening alone.

The future of credentialing isn't about more certificates — it's about better evidence. And that evidence comes from human observation, not automated keyword matching.`,
};

export const blogPosts: BlogPost[] = [
  {
    id: "readiness-gap-signs",
    title: "5 Signs Your Employees Have a Readiness Gap",
    excerpt:
      "Discover the hidden indicators that your new hires might not be as workplace-ready as their resumes suggest.",
    author: "Michael Torres",
    date: "January 22, 2026",
    readTime: "5 min read",
    category: "For Employers",
    image: "https://api.a0.dev/assets/image?text=Business+team+analyzing+data&aspect=16:9&seed=blog_1",
    body: `Every employer has experienced it: a new hire who looked perfect on paper but struggled to perform in the actual workplace. The readiness gap — the disconnect between credentials and real-world capability — costs businesses billions annually in turnover, retraining, and lost productivity.

Here are five warning signs that your organization may be affected:

**1. High Early Turnover** — If new hires consistently leave within the first 90 days, it's often a sign that the role didn't match their actual capabilities, not just expectations.

**2. Extended Ramp-Up Times** — When new employees take significantly longer than expected to reach full productivity, it suggests their skills weren't as job-ready as their resume indicated.

**3. Team Friction** — Behavioral readiness includes soft skills like communication and collaboration. If new hires consistently create team friction, the hiring process may not be evaluating these critical competencies.

**4. Supervisor Overload** — Managers spending excessive time coaching basic professional behaviors signals a gap between what was hired and what was needed.

**5. Client-Facing Issues** — When new hires struggle in client interactions despite strong technical credentials, behavioral readiness is likely the missing piece.

The solution isn't more screening — it's better evidence. Behavioral credentials from mentor observation provide the missing data point that resumes simply can't capture.`,
  },
  {
    id: "mentorlink-revolution",
    title: "How MentorLink is Revolutionizing Skills Assessment",
    excerpt:
      "A deep dive into our mentor validation process and why human observation beats automated testing.",
    author: "Lisa Park",
    date: "January 18, 2026",
    readTime: "6 min read",
    category: "Platform Updates",
    image: "https://api.a0.dev/assets/image?text=Mentor+and+mentee+collaboration&aspect=16:9&seed=blog_2",
    body: `Automated skills assessments have their place, but they fundamentally miss what makes someone effective in a workplace. MentorLink was built on a simple premise: the best way to know if someone is workplace-ready is to have an experienced professional observe them in action.

Our three-loop observation process creates a comprehensive behavioral profile that no multiple-choice test can replicate. Mentors are trained to observe and document specific behavioral indicators across categories like adaptability, communication, initiative, and problem-solving.

What makes MentorLink different is the structured evidence trail. Every observation is documented, contextualized, and linked to specific competencies. This creates a credential that employers can actually verify and trust — because it's backed by professional human judgment, not just an algorithm.`,
  },
  {
    id: "student-to-professional",
    title: "From Student to Professional: Bridging the Gap",
    excerpt:
      "Real stories from candidates who used The 3rd Academy to accelerate their career transitions.",
    author: "James Wilson",
    date: "January 15, 2026",
    readTime: "7 min read",
    category: "Success Stories",
    image: "https://api.a0.dev/assets/image?text=Graduate+celebrating+success&aspect=16:9&seed=blog_3",
    body: `The transition from education to employment is one of the most challenging moments in any career. Traditional pathways — submit a resume, hope for an interview, prove yourself on the job — leave too much to chance. Here are three stories of candidates who took a different path.

**Maria's Story** — After graduating with a communications degree, Maria spent eight months applying to jobs with no callbacks. Through The 3rd Academy, she completed the MentorLink validation process and earned her Behavioral Evidence Report. Within three weeks of publishing her credential on T3X Exchange, she had three interview requests and accepted an offer at a PR firm.

**David's Story** — David was a career changer moving from retail management to tech. His resume showed no relevant experience, but his MentorLink observations highlighted exceptional problem-solving and team leadership skills. His behavioral credential helped hiring managers see past the resume gap.

**Priya's Story** — As an international student, Priya faced additional barriers in the job market. The Behavioral Evidence Report gave her a way to demonstrate her capabilities through evidence rather than just credentials, leveling the playing field.`,
  },
  {
    id: "science-behavioral-credentials",
    title: "The Science Behind Behavioral Credentials",
    excerpt:
      "Research shows that behavioral indicators are 3x more predictive of job success than traditional metrics.",
    author: "Dr. Sarah Chen",
    date: "January 10, 2026",
    readTime: "10 min read",
    category: "Research",
    image: "https://api.a0.dev/assets/image?text=Data+visualization+analytics&aspect=16:9&seed=blog_4",
    body: `A growing body of research supports what many hiring managers have long suspected: traditional credentials are poor predictors of job performance. Our internal research, conducted across 2,400 candidates over 18 months, reveals striking patterns.

**Key Findings:**

Candidates with behavioral credentials from structured mentor observation were 3.2x more likely to pass their 90-day performance review compared to those screened through traditional methods alone.

The strongest predictive behavioral indicators were adaptability (ability to adjust to new situations), initiative (proactive problem identification), and collaborative communication (effective team interaction).

Notably, GPA and institution prestige showed near-zero correlation with 90-day performance outcomes, while mentor-observed behavioral scores showed a 0.72 correlation — remarkably high for hiring research.

These findings align with broader industry research from organizations like Google, which famously found that academic performance was not a reliable predictor of workplace success. The evidence is clear: we need to measure what actually matters.`,
  },
  {
    id: "civic-access-lab",
    title: "Civic Access Lab: Bringing Career Readiness to Schools",
    excerpt:
      "How our free school program is preparing the next generation for workplace success.",
    author: "Amanda Rodriguez",
    date: "January 5, 2026",
    readTime: "5 min read",
    category: "Education",
    image: "https://api.a0.dev/assets/image?text=Students+career+readiness&aspect=16:9&seed=blog_5",
    body: `Career readiness shouldn't start at graduation — it should begin much earlier. That's why we created the Civic Access Lab, a free program that brings behavioral awareness and career readiness tools directly into schools.

The program works with teachers to integrate observation-based behavioral documentation into existing classroom activities. Students begin building their Growth Log early, creating a foundation that transitions seamlessly into the full credentialing pathway after graduation.

Since launching in September 2025, Civic Access Lab has been adopted by 47 schools across 12 states, reaching over 8,000 students. Early feedback from both teachers and students has been overwhelmingly positive, with 89% of participating teachers reporting that the program improved student engagement with career planning.`,
  },
  {
    id: "skill-passport-guide",
    title: "Building Your Behavioral Evidence Report: A Complete Guide",
    excerpt:
      "Everything you need to know about earning and leveraging your behavioral credentials.",
    author: "David Kim",
    date: "January 2, 2026",
    readTime: "12 min read",
    category: "Guides",
    image: "https://api.a0.dev/assets/image?text=Digital+skill+passport&aspect=16:9&seed=blog_6",
    body: `Your Behavioral Evidence Report is your evidence-linked behavioral credential — a verified record of your workplace readiness that employers can trust. Here's how to earn yours.

**Step 1: Choose Your Entry Point** — Start with a resume upload (Entry A) for AI-powered analysis, or jump into LiveWorks Studio (Entry C) for hands-on project experience.

**Step 2: Get Matched with a Mentor** — Within 48 hours of starting, you'll be paired with a qualified mentor in your field. They'll guide you through the three-loop validation process.

**Step 3: Complete MentorLink Observations** — Work through three structured observation loops where your mentor documents your behavioral indicators across key competency areas.

**Step 4: Build Your Evidence Trail** — Every observation, project, and interaction generates evidence that links to your credential. This isn't self-reported — it's professionally verified.

**Step 5: Earn & Share Your Passport** — Once validated, your Behavioral Evidence Report becomes available on T3X Exchange where employers actively search for credentialed candidates.

The entire process typically takes 4–6 weeks, and your credential never expires — though you can continue adding evidence to strengthen your profile over time.`,
  },
];

const categories = [
  "All Posts",
  "Industry Insights",
  "For Employers",
  "Platform Updates",
  "Success Stories",
  "Research",
  "Education",
  "Guides",
];

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Posts");

  const filteredPosts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return blogPosts.filter((post) => {
      const matchesCategory = selectedCategory === "All Posts" || post.category === selectedCategory;
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const showFeatured = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const matchesCategory = selectedCategory === "All Posts" || featuredPost.category === selectedCategory;
    const matchesSearch =
      !query ||
      featuredPost.title.toLowerCase().includes(query) ||
      featuredPost.excerpt.toLowerCase().includes(query) ||
      featuredPost.author.toLowerCase().includes(query) ||
      featuredPost.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 border border-indigo-500 text-white text-sm">
                <BookOpen className="w-4 h-4" />
                The 3rd Academy Blog
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Insights on </span>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Career Readiness
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Explore our latest thinking on behavioral credentials, mentor validation, and the future of hiring.
            </p>

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedCategory === category
                    ? "bg-indigo-600 border border-indigo-500 text-white"
                    : "bg-gray-900 border border-gray-700 text-gray-50 hover:border-gray-600 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {showFeatured && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">Featured</h2>
            </div>

            <Link to={`/blog/${featuredPost.id}`} className="block">
              <div className="grid md:grid-cols-2 gap-8 p-6 rounded-2xl bg-gray-950 border border-gray-800 hover:border-indigo-500">
                <div className="aspect-video rounded-xl overflow-hidden">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium">
                      {featuredPost.category}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{featuredPost.readTime}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{featuredPost.title}</h3>
                  <p className="text-gray-400 mb-6">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{featuredPost.author}</p>
                      <p className="text-xs text-gray-500">{featuredPost.role || "Contributor"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No articles found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All Posts");
                }}
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-900"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.id}`}
                  className="block h-full rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden hover:border-indigo-500"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 rounded-full bg-gray-800 text-indigo-400 text-xs">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{post.author}</p>
                          <p className="text-xs text-gray-500">{post.date}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-indigo-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="p-8 md:p-12 rounded-2xl bg-gray-950 border border-gray-800 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Stay Updated
                </span>
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Subscribe to our newsletter for the latest insights on
                credentialing, career readiness, and platform updates.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
                />
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 w-full sm:w-auto">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
