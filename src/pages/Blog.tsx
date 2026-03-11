import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
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

interface BlogPost {
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

const featuredPost: BlogPost = {
  title: "The Future of Credentialing: Why Behavioral Validation Matters",
  excerpt:
    "Traditional credentials are failing both candidates and employers. Here's how mentor-gated behavioral validation is changing the game.",
  author: "Dr. Sarah Chen",
  role: "Chief Learning Officer",
  date: "January 25, 2026",
  readTime: "8 min read",
  category: "Industry Insights",
  image: "https://api.a0.dev/assets/image?text=Futuristic credential validation concept with holographic badges and neural connections&aspect=16:9&seed=blog_featured",
  body: `The hiring landscape is undergoing a seismic shift. For decades, employers have relied on resumes, degrees, and standardized tests to evaluate candidates. But these traditional credentials tell only part of the story — they measure what someone studied, not how they perform in real workplace situations.

Behavioral validation represents a fundamentally different approach. Instead of relying on self-reported achievements, it uses structured mentor observation across multiple interaction loops to build an evidence-based profile of a candidate's workplace readiness.

At The 3rd Academy, we've built this into a three-loop validation process through MentorLink:

**Loop 1: Initial Observation** — Mentors observe candidates in simulated workplace scenarios, noting behavioral indicators like communication style, problem-solving approach, and collaboration patterns.

**Loop 2: Applied Challenge** — Candidates tackle real-world projects under mentor supervision, generating tangible evidence of their capabilities.

**Loop 3: Validation & Credential** — Final assessment synthesizes all observations into a Skill Passport — an evidence-linked credential that employers can trust.

Early data from our pilot programs shows that candidates with behavioral credentials are 3.2x more likely to pass their 90-day employment review compared to those hired through traditional resume screening alone.

The future of credentialing isn't about more certificates — it's about better evidence. And that evidence comes from human observation, not automated keyword matching.`,
};

const blogPosts: BlogPost[] = [
  {
    title: "5 Signs Your Employees Have a Readiness Gap",
    excerpt:
      "Discover the hidden indicators that your new hires might not be as workplace-ready as their resumes suggest.",
    author: "Michael Torres",
    date: "January 22, 2026",
    readTime: "5 min read",
    category: "For Employers",
    image: "https://api.a0.dev/assets/image?text=Business team analyzing workplace readiness data&aspect=16:9&seed=blog_1",
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
    title: "How MentorLink is Revolutionizing Skills Assessment",
    excerpt:
      "A deep dive into our mentor validation process and why human observation beats automated testing.",
    author: "Lisa Park",
    date: "January 18, 2026",
    readTime: "6 min read",
    category: "Platform Updates",
    image: "https://api.a0.dev/assets/image?text=Mentor and mentee in professional collaboration&aspect=16:9&seed=blog_2",
    body: `Automated skills assessments have their place, but they fundamentally miss what makes someone effective in a workplace. MentorLink was built on a simple premise: the best way to know if someone is workplace-ready is to have an experienced professional observe them in action.

Our three-loop observation process creates a comprehensive behavioral profile that no multiple-choice test can replicate. Mentors are trained to observe and document specific behavioral indicators across categories like adaptability, communication, initiative, and problem-solving.

What makes MentorLink different is the structured evidence trail. Every observation is documented, contextualized, and linked to specific competencies. This creates a credential that employers can actually verify and trust — because it's backed by professional human judgment, not just an algorithm.`,
  },
  {
    title: "From Student to Professional: Bridging the Gap",
    excerpt:
      "Real stories from candidates who used The 3rd Academy to accelerate their career transitions.",
    author: "James Wilson",
    date: "January 15, 2026",
    readTime: "7 min read",
    category: "Success Stories",
    image: "https://api.a0.dev/assets/image?text=Graduate celebrating career success&aspect=16:9&seed=blog_3",
    body: `The transition from education to employment is one of the most challenging moments in any career. Traditional pathways — submit a resume, hope for an interview, prove yourself on the job — leave too much to chance. Here are three stories of candidates who took a different path.

**Maria's Story** — After graduating with a communications degree, Maria spent eight months applying to jobs with no callbacks. Through The 3rd Academy, she completed the MentorLink validation process and earned her Skill Passport. Within three weeks of publishing her credential on T3X Exchange, she had three interview requests and accepted an offer at a PR firm.

**David's Story** — David was a career changer moving from retail management to tech. His resume showed no relevant experience, but his MentorLink observations highlighted exceptional problem-solving and team leadership skills. His behavioral credential helped hiring managers see past the resume gap.

**Priya's Story** — As an international student, Priya faced additional barriers in the job market. The Skill Passport gave her a way to demonstrate her capabilities through evidence rather than just credentials, leveling the playing field.`,
  },
  {
    title: "The Science Behind Behavioral Credentials",
    excerpt:
      "Research shows that behavioral indicators are 3x more predictive of job success than traditional metrics.",
    author: "Dr. Sarah Chen",
    date: "January 10, 2026",
    readTime: "10 min read",
    category: "Research",
    image: "https://api.a0.dev/assets/image?text=Data visualization showing behavioral analytics&aspect=16:9&seed=blog_4",
    body: `A growing body of research supports what many hiring managers have long suspected: traditional credentials are poor predictors of job performance. Our internal research, conducted across 2,400 candidates over 18 months, reveals striking patterns.

**Key Findings:**

Candidates with behavioral credentials from structured mentor observation were 3.2x more likely to pass their 90-day performance review compared to those screened through traditional methods alone.

The strongest predictive behavioral indicators were adaptability (ability to adjust to new situations), initiative (proactive problem identification), and collaborative communication (effective team interaction).

Notably, GPA and institution prestige showed near-zero correlation with 90-day performance outcomes, while mentor-observed behavioral scores showed a 0.72 correlation — remarkably high for hiring research.

These findings align with broader industry research from organizations like Google, which famously found that academic performance was not a reliable predictor of workplace success. The evidence is clear: we need to measure what actually matters.`,
  },
  {
    title: "Civic Access Lab: Bringing Career Readiness to Schools",
    excerpt:
      "How our free school program is preparing the next generation for workplace success.",
    author: "Amanda Rodriguez",
    date: "January 5, 2026",
    readTime: "5 min read",
    category: "Education",
    image: "https://api.a0.dev/assets/image?text=Students engaged in career readiness workshop&aspect=16:9&seed=blog_5",
    body: `Career readiness shouldn't start at graduation — it should begin much earlier. That's why we created the Civic Access Lab, a free program that brings behavioral awareness and career readiness tools directly into schools.

The program works with teachers to integrate observation-based behavioral documentation into existing classroom activities. Students begin building their Growth Log early, creating a foundation that transitions seamlessly into the full credentialing pathway after graduation.

Since launching in September 2025, Civic Access Lab has been adopted by 47 schools across 12 states, reaching over 8,000 students. Early feedback from both teachers and students has been overwhelmingly positive, with 89% of participating teachers reporting that the program improved student engagement with career planning.`,
  },
  {
    title: "Building Your Skill Passport: A Complete Guide",
    excerpt:
      "Everything you need to know about earning and leveraging your behavioral credentials.",
    author: "David Kim",
    date: "January 2, 2026",
    readTime: "12 min read",
    category: "Guides",
    image: "https://api.a0.dev/assets/image?text=Digital skill passport interface with verified badges&aspect=16:9&seed=blog_6",
    body: `Your Skill Passport is your evidence-linked behavioral credential — a verified record of your workplace readiness that employers can trust. Here's how to earn yours.

**Step 1: Choose Your Entry Point** — Start with a resume upload (Entry A) for AI-powered analysis, or jump into LiveWorks Studio (Entry C) for hands-on project experience.

**Step 2: Get Matched with a Mentor** — Within 48 hours of starting, you'll be paired with a qualified mentor in your field. They'll guide you through the three-loop validation process.

**Step 3: Complete MentorLink Observations** — Work through three structured observation loops where your mentor documents your behavioral indicators across key competency areas.

**Step 4: Build Your Evidence Trail** — Every observation, project, and interaction generates evidence that links to your credential. This isn't self-reported — it's professionally verified.

**Step 5: Earn & Share Your Passport** — Once validated, your Skill Passport becomes available on T3X Exchange where employers actively search for credentialed candidates.

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
  const [expandedPost, setExpandedPost] = useState<BlogPost | null>(null);

  // Filter posts by search and category
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

  // Check if featured post matches filters
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
      <BackgroundVideo />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-black to-black" />
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-indigo-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-purple-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950 border border-indigo-500/50 text-indigo-400 text-sm">
                <BookOpen className="w-4 h-4" />
                The 3rd Academy Blog
              </span>
            </motion.div>
            <motion.h1
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="text-white">
                Insights on
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Credentialing & Careers
              </span>
            </motion.h1>
            <motion.p
              className="text-lg text-gray-50 mb-8"
            >
              Explore articles on behavioral validation, career readiness, and the
              future of work from our team of experts.
            </motion.p>

            {/* Search */}
            <motion.div
              className="max-w-md mx-auto relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 bg-black border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b border-white/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-indigo-600 border border-indigo-500 text-white"
                    : "bg-black border border-white/30 text-gray-50 hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {showFeatured && (
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div
            >
              <div className="flex items-center gap-2 mb-8">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">Featured</h2>
              </div>

              <button onClick={() => setExpandedPost(featuredPost)} className="group block w-full text-left">
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                  <div className="relative grid md:grid-cols-2 gap-8 p-6 rounded-2xl bg-black border border-white/30">
                    <div className="aspect-video rounded-xl overflow-hidden">
                      <img
                        src={featuredPost.image}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mb-4">
                        <Tag className="w-3 h-3" />
                        {featuredPost.category}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors">
                        {featuredPost.title}
                      </h3>
                      <p className="text-gray-50 mb-6">{featuredPost.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-white">{featuredPost.author}</p>
                            <p className="text-xs text-gray-500">{featuredPost.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{featuredPost.date}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {featuredPost.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          {filteredPosts.length === 0 ? (
            <motion.div
              className="text-center py-20"
            >
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No articles found</p>
              <p className="text-gray-500 text-sm">
                Try a different search term or category
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredPosts.map((post, index) => (
                <motion.button
                  key={index}
                  onClick={() => setExpandedPost(post)}
                  className="group block text-left"
                >
                  <div className="relative h-full">
                    <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                    <div className="relative h-full rounded-2xl bg-black border border-white/30 overflow-hidden hover:border-indigo-500/30 transition-colors">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6">
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mb-3">
                          <Tag className="w-3 h-3" />
                          {post.category}
                        </span>
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-50 text-sm mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{post.author}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {post.readTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
              <div className="relative p-8 md:p-12 rounded-2xl bg-black border border-white/30 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Stay Updated
                  </span>
                </h2>
                <p className="text-gray-50 mb-8 max-w-md mx-auto">
                  Subscribe to our newsletter for the latest insights on
                  credentialing, career readiness, and platform updates.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 bg-black border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 w-full sm:w-auto">
                      Subscribe
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Post Expansion Modal */}
      <AnimatePresence>
        {expandedPost && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black"
              onClick={() => setExpandedPost(null)}
            />

            {/* Modal content */}
            <motion.div
              className="relative w-full max-w-3xl mx-4 my-8 sm:my-16"
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
            >
              <div className="relative rounded-2xl bg-gray-950 border border-white/10 overflow-hidden shadow-2xl">
                {/* Close button */}
                <button
                  onClick={() => setExpandedPost(null)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Hero image */}
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={expandedPost.image}
                    alt={expandedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Article content */}
                <div className="p-6 sm:p-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-400">
                      <Tag className="w-3 h-3" />
                      {expandedPost.category}
                    </span>
                    <span className="text-xs text-gray-500">{expandedPost.date}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {expandedPost.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                    {expandedPost.title}
                  </h2>

                  <div className="flex items-center gap-3 mb-8 pb-8 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{expandedPost.author}</p>
                      {expandedPost.role && (
                        <p className="text-xs text-gray-500">{expandedPost.role}</p>
                      )}
                    </div>
                  </div>

                  {expandedPost.body ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      {expandedPost.body.split("\n\n").map((paragraph, i) => {
                        if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                          return (
                            <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-3">
                              {paragraph.replace(/\*\*/g, "")}
                            </h3>
                          );
                        }
                        // Handle paragraphs with bold segments
                        const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <p key={i} className="text-gray-300 leading-relaxed mb-4">
                            {parts.map((part, j) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={j} className="text-white font-semibold">
                                  {part.replace(/\*\*/g, "")}
                                </strong>
                              ) : (
                                <span key={j}>{part}</span>
                              )
                            )}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-300 leading-relaxed mb-4">
                        {expandedPost.excerpt}
                      </p>
                      <p className="text-gray-500 italic text-sm">
                        Full article coming soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Blog;
