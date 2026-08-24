import { useState, useMemo } from "react";
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
  category: string;
  image: string;
  /* Editorial metadata — omitted until an article has actually been
     written. A Journal card renders only category + title (+ byline on
     the featured essay). Per Post-Launch Note 8. */
  excerpt?: string;
  author?: string;
  role?: string;
  date?: string;
  readTime?: string;
  body?: string;
}

export const featuredPost: BlogPost = {
  id: "the-missing-record",
  title: "The Missing Record: What Work Has Never Known How to Keep",
  author: "Dr. Tony Mofoke",
  role: "Founder and Chief Executive Officer",
  category: "Founder's Desk",
  image: "https://api.a0.dev/assets/image?text=Editorial+book+illustration&aspect=16:9&seed=journal_founders_desk",
};

/**
 * Journal placeholder cards.
 *
 * Titles are editorial placeholders that establish the intended
 * spectrum of the Journal. No excerpt, no author, no date, no read
 * time — a card renders only category, title, and image, and does not
 * open an article page. Per Post-Launch Note 8.
 *
 * Do not restore invented author names, dates, read times, excerpts,
 * research claims, or any content that implies an article already
 * exists.
 */
export const blogPosts: BlogPost[] = [
  {
    id: "when-the-resume-stops-talking",
    title: "When the Résumé Stops Talking: What Employers Still Need to Know",
    category: "For Employers",
    image: "https://api.a0.dev/assets/image?text=Business+team+analyzing+data&aspect=16:9&seed=blog_1",
  },
  {
    id: "from-observation-to-record",
    title: "From Observation to Record: What Makes Evidence Worth Reading",
    category: "Platform / Evidence",
    image: "https://api.a0.dev/assets/image?text=Mentor+and+mentee+collaboration&aspect=16:9&seed=blog_2",
  },
  {
    id: "first-job-first-test",
    title: "The First Job Is Not the First Test",
    category: "Career Transition",
    image: "https://api.a0.dev/assets/image?text=Graduate+celebrating+success&aspect=16:9&seed=blog_3",
  },
  {
    id: "what-behavioral-evidence-can-tell-us",
    title: "What Behavioral Evidence Can — and Cannot — Tell Us",
    category: "Research",
    image: "https://api.a0.dev/assets/image?text=Data+visualization+analytics&aspect=16:9&seed=blog_4",
  },
  {
    id: "before-the-first-job",
    title: "Before the First Job: Building Workplace Awareness Earlier",
    category: "Education",
    image: "https://api.a0.dev/assets/image?text=Students+career+readiness&aspect=16:9&seed=blog_5",
  },
  {
    id: "how-to-read-a-ber",
    title: "How to Read a Behavioral Evidence Report",
    category: "Guide",
    image: "https://api.a0.dev/assets/image?text=Digital+skill+passport&aspect=16:9&seed=blog_6",
  },
];

const categories = [
  "All Posts",
  "Founder's Desk",
  "For Employers",
  "Platform / Evidence",
  "Career Transition",
  "Research",
  "Education",
  "Guide",
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
      (featuredPost.author?.toLowerCase().includes(query) ?? false) ||
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

      {/* Featured — category, title, byline. Not yet clickable; the launch
          essay activates once the founder essay is completed. */}
      {showFeatured && (
        <LedgerSection first className="py-20">
          <div className="mono-label text-foreground/60 mb-6">Featured essay · Front page</div>
          <div className="border-t-2 border-b border-foreground pt-8 pb-10">
            <div className="grid md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-7">
                <div className="mono-label text-foreground/50 mb-4 flex items-center gap-3">
                  <span>{featuredPost.category}</span>
                  <span className="stamp-tech">Coming soon</span>
                </div>
                <h2 className="display-serif text-4xl md:text-6xl lg:text-7xl text-foreground leading-[0.98]">
                  {featuredPost.title}
                </h2>
                {featuredPost.author && (
                  <div className="mt-8 flex flex-wrap items-baseline gap-3">
                    <span className="mono-label text-foreground/60">By</span>
                    <span className="display-serif italic text-lg text-foreground">
                      {featuredPost.author}
                    </span>
                    {featuredPost.role && (
                      <span className="mono-label text-foreground/50">· {featuredPost.role}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-5 aspect-[4/5] overflow-hidden">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
            </div>
          </div>
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
                <div className="block border-t border-foreground pt-6 opacity-90">
                  <div className="aspect-[4/3] overflow-hidden mb-5">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <div className="mono-label text-foreground/50 mb-3 flex items-center gap-2 flex-wrap">
                    <span>{post.category}</span>
                    <span className="stamp-tech">Coming soon</span>
                  </div>
                  <h3 className="display-serif text-2xl leading-tight text-foreground">
                    {post.title}
                  </h3>
                </div>
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
