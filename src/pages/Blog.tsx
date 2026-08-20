import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { LedgerHero, LedgerSection, rise } from "@/components/ledger";
import { cn } from "@/lib/utils";

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
  "Founder's Desk",
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
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Journal · Reading"
        meta="Essays on evidence, observation, and hiring"
        stamp="Weekly"
        title={
          <>
            <span className="block">The 3rd Academy</span>
            <span className="block italic display-serif-italic ink-vermilion">Journal.</span>
          </>
        }
        ledeSide={
          <div>
            <div className="mono-label text-foreground/60 mb-3">Search the archive</div>
            <div className="relative border-b-2 border-foreground">
              <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
              <Input
                placeholder="Type a title or author…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-none border-0 bg-transparent px-0 py-4 text-lg display-serif focus-visible:ring-0 pr-8"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 mono-label text-foreground/60 hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        }
      />

      {/* Categories strip */}
      <section className="paper-grain border-t border-foreground/40 py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="mono-label text-foreground/50">Filter:</span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "text-sm border-b transition-all",
                selectedCategory === c
                  ? "text-foreground border-foreground pb-1 font-medium"
                  : "text-foreground/60 border-transparent hover:text-foreground hover:border-foreground/60 pb-1"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      {showFeatured && (
        <LedgerSection first className="py-20">
          <div className="mono-label text-foreground/60 mb-6">Featured essay · Front page</div>
          <Link to={`/blog/${featuredPost.id}`} className="group block border-t-2 border-b border-foreground pt-8 pb-10">
            <div className="grid md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-7">
                <div className="mono-label text-foreground/50 mb-4">
                  {featuredPost.category} · {featuredPost.date} · {featuredPost.readTime}
                </div>
                <h2 className="display-serif text-4xl md:text-6xl lg:text-7xl text-foreground leading-[0.98] group-hover:italic transition-all">
                  {featuredPost.title}
                </h2>
                <p className="mt-8 display-serif text-2xl leading-snug text-foreground/85 max-w-2xl">
                  {featuredPost.excerpt}
                </p>
                <div className="mt-8 flex items-baseline gap-3">
                  <span className="mono-label text-foreground/60">By</span>
                  <span className="display-serif italic text-lg text-foreground">
                    {featuredPost.author}
                  </span>
                  {featuredPost.role && (
                    <span className="mono-label text-foreground/50">· {featuredPost.role}</span>
                  )}
                </div>
              </div>
              <div className="md:col-span-5 aspect-[4/5] overflow-hidden">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </Link>
        </LedgerSection>
      )}

      {/* Grid */}
      <LedgerSection>
        <div className="mono-label text-foreground/60 mb-8 pb-3 border-b border-foreground/25">
          All entries — {filteredPosts.length} of {filteredPosts.length}
        </div>
        {filteredPosts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="marginalia mb-6">No entries match this search.</p>
            <Button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All Posts"); }}
              variant="ghost"
              className="text-foreground hover:bg-foreground/5 rounded-none underline underline-offset-8 decoration-1"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredPosts.map((post, i) => (
              <motion.article
                key={post.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={rise}
                custom={i}
              >
                <Link to={`/blog/${post.id}`} className="block group border-t border-foreground pt-6">
                  <div className="aspect-[4/3] overflow-hidden mb-5">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                  <div className="mono-label text-foreground/50 mb-2">
                    {post.category} · {post.readTime}
                  </div>
                  <h3 className="display-serif text-2xl leading-tight text-foreground mb-3 group-hover:italic transition-all">
                    {post.title}
                  </h3>
                  <p className="text-foreground/70 text-[0.9375rem] leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mono-label text-foreground/60">
                    {post.author} · {post.date}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </LedgerSection>

      {/* Newsletter */}
      <LedgerSection>
        <div className="max-w-3xl mx-auto text-center">
          <div className="mono-label text-foreground/60 mb-6">§ Subscribe</div>
          <h2 className="display-serif text-4xl md:text-6xl text-foreground leading-[0.95] mb-8">
            Have the <span className="italic display-serif-italic">journal</span> delivered.
          </h2>
          <p className="text-foreground/80 mb-10">
            The essays, monthly, to your inbox. No advertising. Unsubscribe with one click.
          </p>
          <form className="flex flex-col sm:flex-row items-stretch gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="you@yourwork.com"
              className="flex-1 rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 py-4 text-lg display-serif text-center"
            />
            <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-6">
              Subscribe →
            </Button>
          </form>
        </div>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Blog;
