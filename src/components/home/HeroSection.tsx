import { motion } from "framer-motion";
import { ArrowRight, FileText, Users, Briefcase, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const floatingVariants = {
  animate: {
    y: [0, -15, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source
            src="https://bloujipdkyjsgzwxnoej.supabase.co/storage/v1/object/public/storage/homelivebg.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
      </div>

      {/* Animated Background Blobs */}
      <motion.div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-600 rounded-full opacity-15 blur-[120px]"
        animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-600 rounded-full opacity-15 blur-[120px]"
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-pink-600 rounded-full opacity-10 blur-[100px]"
        animate={{ scale: [1, 1.4, 1], x: [0, 50, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating decorative images */}
      <motion.div
        className="absolute top-32 right-[8%] w-48 h-48 rounded-2xl overflow-hidden opacity-20 hidden lg:block"
        variants={floatingVariants}
        animate="animate"
      >
        <img
          src="https://api.a0.dev/assets/image?text=professional%20mentor%20guiding%20young%20professional%20in%20modern%20office%20setting%20warm%20lighting&aspect=1:1&seed=hero_float1"
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>
      <motion.div
        className="absolute bottom-40 left-[5%] w-36 h-36 rounded-2xl overflow-hidden opacity-15 hidden lg:block"
        variants={floatingVariants}
        animate="animate"
      >
        <img
          src="https://api.a0.dev/assets/image?text=diverse%20team%20collaborating%20on%20project%20modern%20workspace&aspect=1:1&seed=hero_float2"
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div
        className="relative container px-4 md:px-6 pt-32 pb-20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-sm text-indigo-300 mb-8"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Mentor-Gated Behavioral Validation
              </div>

              {/* Headline */}
              <motion.h1
                className="text-5xl md:text-7xl font-bold leading-[1.1] mb-8"
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <span className="text-white">
                  Beyond
                </span>
                <br />
                <span className="text-white">
                  Credentials.
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Workplace Ready.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <p
                className="text-lg md:text-xl text-gray-300 max-w-xl mb-10 leading-relaxed"
              >
                The 3rd Academy bridges the gap between what your resume says and what
                employers actually need — through sustained mentor observation and
                evidence-based behavioral validation.
              </p>

              {/* CTAs */}
              <div
                className="flex flex-col sm:flex-row items-start gap-4"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-7 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-600/30"
                    asChild
                  >
                    <Link to="/get-started">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 px-10 py-7 rounded-2xl text-lg"
                    asChild
                  >
                    <Link to="/employers">
                      <Play className="mr-2 h-5 w-5" />
                      For Employers
                    </Link>
                  </Button>
                </motion.div>
              </div>

              {/* Trust indicators */}
              <div
                className="flex items-center gap-6 mt-10 text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Mentor-matched in 48h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Evidence-based</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image + Stats */}
            <div
              className="relative hidden lg:block"
            >
              {/* Main hero image */}
              <motion.div
                className="relative rounded-3xl overflow-hidden shadow-2xl shadow-indigo-600/20 border border-white/10"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="https://api.a0.dev/assets/image?text=futuristic%20digital%20skill%20passport%20holographic%20interface%20with%20glowing%20blue%20purple%20gradients%20showing%20behavioral%20scores%20and%20mentor%20endorsements%20dark%20background&aspect=4:3&seed=hero_main"
                  alt="Skill Passport Interface"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </motion.div>

              {/* Floating stat cards */}
              <motion.div
                className="absolute -left-8 top-1/4 bg-black border border-white/20 rounded-2xl p-4 shadow-xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="text-2xl font-bold text-indigo-400">95%</div>
                <div className="text-xs text-gray-400">Satisfaction Rate</div>
              </motion.div>

              <motion.div
                className="absolute -right-4 bottom-1/4 bg-black border border-white/20 rounded-2xl p-4 shadow-xl"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="text-2xl font-bold text-emerald-400">500+</div>
                <div className="text-xs text-gray-400">Mentor-Verified</div>
              </motion.div>
            </div>
          </div>

          {/* Entry Points Cards */}
          <div
            className="grid md:grid-cols-3 gap-6 mt-20"
          >
            <EntryPointCard
              icon={<FileText className="w-6 h-6" />}
              title="Resume Upload"
              description="Start with your resume. Our enhancer identifies areas for mentor focus."
              entry="Entry A"
              image="https://api.a0.dev/assets/image?text=professional%20resume%20being%20analyzed%20by%20AI%20with%20highlighted%20sections%20and%20glowing%20data%20points%20dark%20theme&aspect=16:9&seed=entry_resume"
              delay={0}
            />
            <EntryPointCard
              icon={<Users className="w-6 h-6" />}
              title="Civic Access Lab"
              description="For schools — engage students early in career awareness."
              entry="Entry B"
              image="https://api.a0.dev/assets/image?text=students%20in%20modern%20classroom%20using%20tablets%20for%20career%20planning%20with%20holographic%20displays%20futuristic&aspect=16:9&seed=entry_civic"
              delay={0.1}
            />
            <EntryPointCard
              icon={<Briefcase className="w-6 h-6" />}
              title="LiveWorks Studio"
              description="Complete real projects under mentor supervision."
              entry="Entry C"
              image="https://api.a0.dev/assets/image?text=team%20working%20on%20real%20project%20in%20modern%20co-working%20space%20with%20screens%20showing%20project%20milestones&aspect=16:9&seed=entry_liveworks"
              delay={0.2}
            />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

interface EntryPointCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  entry: string;
  image: string;
  delay: number;
}

function EntryPointCard({ icon, title, description, entry, image, delay }: EntryPointCardProps) {
  return (
    <motion.div
      className="group relative"
      transition={{ duration: 0.8, delay: 0.5 + delay }}
      whileHover={{ y: -10 }}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />

      {/* Glass card */}
      <div className="relative bg-black border border-white/10 rounded-3xl overflow-hidden group-hover:border-white/30 transition-all duration-500 h-full">
        {/* Image */}
        <div className="relative h-36 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium text-indigo-300 bg-black rounded-full border border-indigo-500/30">
            {entry}
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
              {icon}
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
