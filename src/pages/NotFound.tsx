import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <BackgroundVideo />

      <div className="container px-4 md:px-6 relative z-10">
        <motion.div
          className="max-w-lg mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Number */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              404
            </span>
          </motion.div>

          {/* Card */}
          <motion.div
            className="relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Glow effect */}
            <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />

            <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-indigo-400" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold mb-4">
                <span className="text-white">
                  Page Not Found
                </span>
              </h1>

              <p className="text-gray-400 mb-8">
                Oops! The page you're looking for doesn't exist or has been moved.
                Let's get you back on track.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
                    asChild
                  >
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      Return Home
                    </Link>
                  </Button>
                </motion.div>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Suggested Links */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-gray-500 text-sm mb-4">Or try one of these:</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { label: "Platform", href: "/platform" },
                { label: "About", href: "/about" },
                { label: "Get Started", href: "/join" },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
