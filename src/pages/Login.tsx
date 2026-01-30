import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Login = () => {
  const [userType, setUserType] = useState("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || getDashboardRoute(userType);

  function getDashboardRoute(role: string) {
    const routes: Record<string, string> = {
      candidate: "/dashboard/candidate",
      mentor: "/dashboard/mentor",
      employer: "/dashboard/employer",
    };
    return routes[role] || "/dashboard/candidate";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      navigate(from, { replace: true });
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-16">
        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 relative overflow-hidden">
          {/* Background */}
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

          <div className="container px-4 md:px-6 relative z-10">
            <motion.div
              className="max-w-md mx-auto"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Logo */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-2 mb-8"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                    THE 3RD ACADEMY
                  </span>
                </div>
              </motion.div>

              {/* Card */}
              <motion.div variants={itemVariants} className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />

                <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <h1 className="text-2xl font-bold text-center mb-2">
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Welcome Back
                    </span>
                  </h1>
                  <p className="text-center text-gray-400 mb-6">
                    Sign in to continue your journey
                  </p>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {/* User Type Tabs */}
                  <Tabs value={userType} onValueChange={setUserType} className="mb-6">
                    <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
                      <TabsTrigger
                        value="candidate"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-400"
                      >
                        Candidate
                      </TabsTrigger>
                      <TabsTrigger
                        value="mentor"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-400"
                      >
                        Mentor
                      </TabsTrigger>
                      <TabsTrigger
                        value="employer"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-400"
                      >
                        Employer
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-gray-300">Password</Label>
                        <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                      />
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  {/* Sign Up Link */}
                  <p className="mt-6 text-center text-sm text-gray-400">
                    Don't have an account?{" "}
                    <Link to="/get-started" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      Get Started
                    </Link>
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
