import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Twitter, Linkedin, Mail } from "lucide-react";
import { blogPosts, featuredPost } from "./Blog";
import { LedgerSection } from "@/components/ledger";

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const allPosts = [featuredPost, ...blogPosts];
  const post = allPosts.find((p) => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!post) {
    return (
      <PublicLayout>
        <section className="paper-grain min-h-[80vh] flex items-center justify-center pt-32">
          <div className="text-center max-w-lg mx-auto px-6">
            <div className="mono-label text-foreground/50 mb-4">§ 404 · Entry not filed</div>
            <h1 className="display-serif text-5xl md:text-7xl text-foreground leading-[0.95] mb-8">
              Post not <span className="italic display-serif-italic ink-vermilion">found.</span>
            </h1>
            <Button
              onClick={() => navigate("/blog")}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to the journal
            </Button>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const relatedPosts = blogPosts
    .filter((p) => p.category === post.category && p.id !== post.id)
    .slice(0, 3);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="paper-grain pt-40 pb-16 border-b border-foreground/40">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 mono-label text-foreground/60 hover:text-foreground mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to the journal
          </Link>

          <div className="mono-label text-foreground/60 mb-6">
            {post.category} · {post.date} · {post.readTime}
          </div>

          <h1 className="display-serif text-[3rem] sm:text-[4rem] md:text-[5.5rem] text-foreground leading-[0.98] mb-8">
            {post.title}
          </h1>

          <p className="display-serif text-2xl md:text-3xl leading-snug text-foreground/85 border-l-2 border-foreground pl-6 max-w-2xl">
            {post.excerpt}
          </p>

          <div className="mt-12 pt-6 border-t border-foreground flex flex-wrap items-center gap-6 justify-between">
            <div>
              <div className="mono-label text-foreground/50 mb-1">By</div>
              <div className="display-serif italic text-xl text-foreground">
                {post.author}
              </div>
              {post.role && <div className="mono-label text-foreground/50 mt-1">{post.role}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="mono-label text-foreground/50">Share:</span>
              <button className="p-2 border border-foreground/25 hover:border-foreground text-foreground rounded-none">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="p-2 border border-foreground/25 hover:border-foreground text-foreground rounded-none">
                <Linkedin className="w-4 h-4" />
              </button>
              <button className="p-2 border border-foreground/25 hover:border-foreground text-foreground rounded-none">
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured image */}
      <section className="paper-grain py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover grayscale-[30%]"
            />
          </div>
        </div>
      </section>

      {/* Article body */}
      <section className="paper-grain py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <article className="display-serif text-[1.375rem] leading-[1.65] text-foreground whitespace-pre-line first-letter:text-7xl first-letter:font-normal first-letter:float-left first-letter:pr-3 first-letter:pt-2 first-letter:leading-none">
            {post.body}
          </article>
        </div>
      </section>

      {/* Related */}
      {relatedPosts.length > 0 && (
        <LedgerSection>
          <div className="mono-label text-foreground/60 mb-8 pb-3 border-b border-foreground/25">
            More from {post.category}
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {relatedPosts.map((rp) => (
              <Link key={rp.id} to={`/blog/${rp.id}`} className="block group border-t border-foreground pt-6">
                <div className="aspect-[4/3] overflow-hidden mb-4">
                  <img
                    src={rp.image}
                    alt={rp.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                </div>
                <div className="mono-label text-foreground/50 mb-2">
                  {rp.category} · {rp.readTime}
                </div>
                <h3 className="display-serif text-2xl leading-tight text-foreground group-hover:italic transition-all">
                  {rp.title}
                </h3>
              </Link>
            ))}
          </div>
        </LedgerSection>
      )}

      {/* Newsletter */}
      <LedgerSection>
        <div className="max-w-3xl mx-auto text-center">
          <div className="mono-label text-foreground/60 mb-6">§ Subscribe</div>
          <h2 className="display-serif text-4xl md:text-5xl text-foreground leading-[0.95] mb-8">
            Never miss an <span className="italic display-serif-italic">entry</span>.
          </h2>
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

export default BlogPost;
