import { motion } from "framer-motion";
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
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const featuredPost = {
  title: "The Future of Credentialing: Why Behavioral Validation Matters",
  excerpt:
    "Traditional credentials are failing both candidates and employers. Here's how mentor-gated behavioral validation is changing the game.",
  author: "Dr. Sarah Chen",
  role: "Chief Learning Officer",
  date: "January 25, 2026",
  readTime: "8 min read",
  category: "Industry Insights",
  image: "https://api.a0.dev/assets/image?text=Futuristic credential validation concept with holographic badges and neural connections&aspect=16:9&seed=blog_featured",
};

const blogPosts = [
  {
    title: "5 Signs Your Employees Have a Readiness Gap",
    excerpt:
      "Discover the hidden indicators that your new hires might not be as workplace-ready as their resumes suggest.",
    author: "Michael Torres",
    date: "January 22, 2026",
    readTime: "5 min read",
    category: "For Employers",
    image: "https://api.a0.dev/assets/image?text=Business team analyzing workplace readiness data&aspect=16:9&seed=blog_1",
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
  return (
    <div className="min-h-screen bg-black text-white">
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
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <BookOpen className="w-4 h-4" />
                The 3rd Academy Blog
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Insights on
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Credentialing & Careers
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 mb-8"
            >
              Explore articles on behavioral validation, career readiness, and the
              future of work from our team of experts.
            </motion.p>

            {/* Search */}
            <motion.div
              variants={itemVariants}
              className="max-w-md mx-auto relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search articles..."
                className="w-full pl-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  index === 0
                    ? "bg-indigo-600/20 border border-indigo-500/50 text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">Featured</h2>
            </div>

            <a href="#" className="group block">
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                <div className="relative grid md:grid-cols-2 gap-8 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
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
                    <p className="text-gray-400 mb-6">{featuredPost.excerpt}</p>
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
            </a>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {blogPosts.map((post, index) => (
              <motion.a
                key={index}
                href="#"
                variants={itemVariants}
                className="group block"
              >
                <div className="relative h-full">
                  <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                  <div className="relative h-full rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-indigo-500/30 transition-colors">
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
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
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
              </motion.a>
            ))}
          </motion.div>

          {/* Load More */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Load More Articles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
              <div className="relative p-8 md:p-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-center">
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
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
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
    </div>
  );
};

export default Blog;
