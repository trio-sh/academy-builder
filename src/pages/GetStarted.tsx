import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  FileText,
  Briefcase,
  Upload,
  ArrowRight,
  CheckCircle2,
  Linkedin,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

const entryPaths = [
  {
    id: "resume",
    entry: "Entry A",
    title: "Resume Upload",
    description: "Start with your resume. Our Resume Enhancer identifies observation areas for your assigned mentor.",
    icon: FileText,
    gradient: "from-indigo-600 to-indigo-700",
    features: [
      "Resume analysis without bias",
      "Observation areas identified",
      "Basic Profile created",
      "Mentor-matched within 48 hours",
    ],
    recommended: true,
  },
  {
    id: "liveworks",
    entry: "Entry C",
    title: "LiveWorks Studio",
    description: "Jump straight into real projects. Complete work under mentor supervision and build evidence.",
    icon: Briefcase,
    gradient: "from-purple-600 to-purple-700",
    features: [
      "Real project experience",
      "Paid opportunities",
      "Mentor supervision included",
      "Evidence generation",
    ],
    recommended: false,
  },
];

const GetStarted = () => {
  const [selectedPath, setSelectedPath] = useState<string | null>("resume");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signUp, signInWithLinkedIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp(email, password, {
        firstName,
        lastName,
        role: "candidate",
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      setStep(3);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInSignUp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { error: oauthError } = await signInWithLinkedIn();

      if (oauthError) {
        setError(oauthError.message || "Failed to sign up with LinkedIn");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleCompleteSetup = () => {
    toast({
      title: "Setup complete!",
      description: "Welcome to The 3rd Academy. Let's begin your journey.",
    });
    navigate("/dashboard/candidate");
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <motion.section
          className="py-16 md:py-24 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-black to-black" />
          <motion.div
            className="absolute top-20 right-20 w-64 h-64 bg-indigo-900 rounded-full opacity-20 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-sm text-gray-300 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Start Your Journey
              </motion.div>
              <motion.h1
                className="text-4xl md:text-5xl font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                  Begin Your
                </span>{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Credentialing Path
                </span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Choose your entry point and start building your evidence-based
                behavioral profile with mentor guidance.
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* Entry Path Selection */}
        <section className="py-12 md:py-16 bg-black">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              {/* Progress */}
              <motion.div
                className="flex items-center justify-center gap-4 mb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <motion.div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                        step >= s
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                          : "bg-white/10 text-gray-400 border border-white/10"
                      )}
                      whileHover={{ scale: 1.05 }}
                    >
                      {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </motion.div>
                    {s < 3 && (
                      <div className={cn(
                        "w-16 h-0.5 transition-colors duration-300",
                        step > s ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-white/10"
                      )} />
                    )}
                  </div>
                ))}
              </motion.div>

              {step === 1 && (
                <motion.div
                  className="space-y-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.h2 variants={itemVariants} className="text-2xl font-bold text-center text-white mb-8">
                    Choose Your Entry Point
                  </motion.h2>

                  <motion.div variants={containerVariants} className="grid md:grid-cols-2 gap-6">
                    {entryPaths.map((path) => (
                      <motion.button
                        key={path.id}
                        variants={itemVariants}
                        onClick={() => setSelectedPath(path.id)}
                        className={cn(
                          "group relative p-8 rounded-3xl text-left transition-all duration-500",
                          selectedPath === path.id
                            ? "bg-white/10 border-2 border-indigo-500/50"
                            : "bg-white/5 border border-white/10 hover:border-white/30"
                        )}
                        whileHover={{ y: -5 }}
                      >
                        {selectedPath === path.id && (
                          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl" />
                        )}

                        <div className="relative">
                          {path.recommended && (
                            <span className="absolute -top-4 left-0 px-3 py-1 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full">
                              Recommended
                            </span>
                          )}

                          <div className="flex items-center gap-3 mb-4 mt-2">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                              selectedPath === path.id ? path.gradient : "from-white/10 to-white/5"
                            )}>
                              <path.icon className={cn("w-7 h-7", selectedPath === path.id ? "text-white" : "text-gray-400")} />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{path.entry}</span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-2">{path.title}</h3>
                          <p className="text-gray-400 mb-6">{path.description}</p>

                          <ul className="space-y-3">
                            {path.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className={cn("w-4 h-4", selectedPath === path.id ? "text-emerald-400" : "text-gray-500")} />
                                <span className="text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex justify-center pt-6">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="lg"
                        onClick={() => setStep(2)}
                        disabled={!selectedPath}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-6 rounded-xl font-bold text-lg shadow-2xl shadow-indigo-600/30"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div className="max-w-md mx-auto" variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl" />
                    <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                      <h2 className="text-2xl font-bold text-center text-white mb-8">Create Your Account</h2>

                      {/* Error Message */}
                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                            <Input
                              id="firstName"
                              placeholder="John"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              disabled={isLoading}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                            <Input
                              id="lastName"
                              placeholder="Doe"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              disabled={isLoading}
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-gray-300">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-gray-300">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Create a password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                          />
                        </div>
                      </div>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-gray-500">Or continue with</span></div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleLinkedInSignUp}
                        disabled={isLoading}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        <Linkedin className="mr-2 h-4 w-4" />
                        LinkedIn
                      </Button>

                      <div className="flex gap-4 pt-6">
                        <Button
                          variant="outline"
                          onClick={() => setStep(1)}
                          disabled={isLoading}
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleSignUp}
                          disabled={isLoading || !firstName || !lastName || !email || !password}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              Continue
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="mt-4 text-center text-xs text-gray-500">
                        By creating an account, you agree to our{" "}
                        <a href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms</a> and{" "}
                        <a href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>.
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {step === 3 && selectedPath === "resume" && (
                <motion.div className="max-w-md mx-auto" variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl" />
                    <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                      <h2 className="text-2xl font-bold text-center text-white mb-8">Upload Your Resume</h2>

                      <motion.div className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer" whileHover={{ scale: 1.02 }}>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-white font-medium mb-2">Drop your resume here</p>
                        <p className="text-sm text-gray-500 mb-4">PDF, DOC, or DOCX up to 10MB</p>
                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">Browse Files</Button>
                      </motion.div>

                      <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <h3 className="text-sm font-medium text-white mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                          {["Resume Enhancer analyzes your resume", "Observation areas identified for your mentor", "Basic Profile created (non-credentialed)", "Mentor matched within 48 hours"].map((item) => (
                            <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-white/20 text-white hover:bg-white/10">Back</Button>
                        <Button onClick={handleCompleteSetup} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">Complete Setup<CheckCircle2 className="ml-2 h-4 w-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {step === 3 && selectedPath === "liveworks" && (
                <motion.div className="max-w-md mx-auto" variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-20 blur-xl" />
                    <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                      <h2 className="text-2xl font-bold text-center text-white mb-8">Set Up Your Profile</h2>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="headline" className="text-gray-300">Professional Headline</Label>
                          <Input id="headline" placeholder="e.g., Full Stack Developer" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skills" className="text-gray-300">Primary Skills</Label>
                          <Input id="skills" placeholder="e.g., React, Node.js, Python" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="experience" className="text-gray-300">Years of Experience</Label>
                          <Input id="experience" type="number" placeholder="e.g., 3" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <h3 className="text-sm font-medium text-white mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                          {["Browse available projects", "Apply to projects matching your skills", "Complete work under mentor supervision", "Build evidence for your Skill Passport"].map((item) => (
                            <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-white/20 text-white hover:bg-white/10">Back</Button>
                        <Button onClick={handleCompleteSetup} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">Complete Setup<CheckCircle2 className="ml-2 h-4 w-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default GetStarted;
