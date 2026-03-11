import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import {
  Users,
  Briefcase,
  GraduationCap,
  School,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type UserRole = "candidate" | "mentor" | "employer" | "school_admin";

const roleOptions = [
  {
    id: "candidate" as UserRole,
    title: "Job Seeker",
    description: "Build your behavioral credential and find opportunities",
    icon: Users,
    gradient: "from-indigo-600 to-indigo-700",
    features: ["Get mentor-observed", "Earn Skill Passport", "Access job marketplace"],
  },
  {
    id: "mentor" as UserRole,
    title: "Mentor",
    description: "Guide candidates and provide behavioral observations",
    icon: GraduationCap,
    gradient: "from-purple-600 to-purple-700",
    features: ["Observe candidates", "Write endorsements", "Shape careers"],
  },
  {
    id: "employer" as UserRole,
    title: "Employer",
    description: "Find pre-vetted, behaviorally-credentialed talent",
    icon: Briefcase,
    gradient: "from-emerald-600 to-emerald-700",
    features: ["Access T3X marketplace", "Post LiveWorks projects", "Hire confidently"],
  },
  {
    id: "school_admin" as UserRole,
    title: "School / Institution",
    description: "Credential your students with behavioral evidence",
    icon: School,
    gradient: "from-amber-600 to-amber-700",
    features: ["Manage cohorts", "Track student progress", "Issue credentials"],
  },
];

const Join = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Additional fields for specific roles
  const [companyName, setCompanyName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getDashboardRoute = (role: UserRole) => {
    const routes: Record<UserRole, string> = {
      candidate: "/dashboard/candidate",
      mentor: "/dashboard/mentor",
      employer: "/dashboard/employer",
      school_admin: "/dashboard/school",
    };
    return routes[role];
  };

  const handleSignUp = async () => {
    if (!selectedRole) return;
    setError("");
    setIsLoading(true);

    try {
      const metadata: Record<string, any> = {
        firstName,
        lastName,
        role: selectedRole,
      };

      // Add role-specific metadata
      if (selectedRole === "employer") {
        metadata.companyName = companyName;
        metadata.industry = industry;
      } else if (selectedRole === "school_admin") {
        metadata.schoolName = schoolName;
      } else if (selectedRole === "mentor") {
        metadata.industry = industry;
        metadata.yearsExperience = parseInt(yearsExperience) || 0;
      } else if (selectedRole === "candidate") {
        metadata.entryPath = "resume_upload";
      }

      const { error: signUpError } = await signUp(email, password, metadata);

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

  const handleComplete = () => {
    if (selectedRole) {
      navigate(getDashboardRoute(selectedRole));
    }
  };

  const selectedRoleInfo = roleOptions.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-black">
      <BackgroundVideo />
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <motion.section
          className="py-12 md:py-16 relative overflow-hidden"
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
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black border border-white/30 text-sm text-gray-50 mb-6"
              >
                <UserPlus className="w-4 h-4 text-indigo-400" />
                Join The 3rd Academy
              </div>
              <h1
                className="text-4xl md:text-5xl font-bold mb-4"
              >
                <span className="text-white">
                  Create Your
                </span>{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Account
                </span>
              </h1>
              <p className="text-lg text-gray-50">
                Choose how you want to participate in the behavioral credentialing ecosystem.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Main Content */}
        <section className="py-8 md:py-12 bg-black">
          <div className="container px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-center gap-4 mb-12">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                        step >= s
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                          : "bg-black text-gray-50 border border-white/30"
                      )}
                    >
                      {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </div>
                    {s < 3 && (
                      <div className={cn("w-16 h-0.5 transition-colors duration-300", step > s ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-black")} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Role Selection */}
              {step === 1 && (
                <div className="space-y-8">
                  <h2 className="text-2xl font-bold text-center text-white mb-8">
                    I want to join as...
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    {roleOptions.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={cn(
                          "group relative p-6 rounded-2xl text-left transition-all duration-500",
                          selectedRole === role.id
                            ? "bg-black border-2 border-indigo-500/50"
                            : "bg-black border border-white/30 hover:border-white/30"
                        )}
                        whileHover={{ y: -5 }}
                      >
                        {selectedRole === role.id && (
                          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl opacity-20 blur-xl" />
                        )}

                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                                selectedRole === role.id ? role.gradient : "from-white/10 to-white/5"
                              )}
                            >
                              <role.icon className={cn("w-6 h-6", selectedRole === role.id ? "text-white" : "text-gray-50")} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{role.title}</h3>
                            </div>
                          </div>

                          <p className="text-gray-50 text-sm mb-4">{role.description}</p>

                          <ul className="space-y-2">
                            {role.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className={cn("w-4 h-4", selectedRole === role.id ? "text-emerald-400" : "text-gray-500")} />
                                <span className="text-gray-50">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={!selectedRole}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-6 rounded-xl font-bold text-lg"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                      Sign In
                    </Link>
                  </p>
                </div>
              )}

              {/* Step 2: Account Details */}
              {step === 2 && (
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl" />
                    <div className="relative p-8 rounded-2xl bg-black border border-white/30">
                      <div className="flex items-center gap-3 mb-6">
                        {selectedRoleInfo && (
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", selectedRoleInfo.gradient)}>
                            <selectedRoleInfo.icon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-bold text-white">Create {selectedRoleInfo?.title} Account</h2>
                        </div>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/30 border border-red-500/20 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-50">First Name</Label>
                            <Input
                              id="firstName"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              disabled={isLoading}
                              className="bg-black border-white/20 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-50">Last Name</Label>
                            <Input
                              id="lastName"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              disabled={isLoading}
                              className="bg-black border-white/20 text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-gray-50">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="bg-black border-white/20 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-gray-50">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="bg-black border-white/20 text-white"
                          />
                        </div>

                        {/* Role-specific fields */}
                        {selectedRole === "employer" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="companyName" className="text-gray-50">Company Name</Label>
                              <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                disabled={isLoading}
                                className="bg-black border-white/20 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="industry" className="text-gray-50">Industry</Label>
                              <Input
                                id="industry"
                                placeholder="e.g., Technology, Healthcare"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                disabled={isLoading}
                                className="bg-black border-white/20 text-white"
                              />
                            </div>
                          </>
                        )}

                        {selectedRole === "school_admin" && (
                          <div className="space-y-2">
                            <Label htmlFor="schoolName" className="text-gray-50">School / Institution Name</Label>
                            <Input
                              id="schoolName"
                              value={schoolName}
                              onChange={(e) => setSchoolName(e.target.value)}
                              disabled={isLoading}
                              className="bg-black border-white/20 text-white"
                            />
                          </div>
                        )}

                        {selectedRole === "mentor" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="industry" className="text-gray-50">Industry / Expertise</Label>
                              <Input
                                id="industry"
                                placeholder="e.g., Software Engineering"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                disabled={isLoading}
                                className="bg-black border-white/20 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="yearsExperience" className="text-gray-50">Years of Experience</Label>
                              <Input
                                id="yearsExperience"
                                type="number"
                                value={yearsExperience}
                                onChange={(e) => setYearsExperience(e.target.value)}
                                disabled={isLoading}
                                className="bg-black border-white/20 text-white"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button
                          variant="outline"
                          onClick={() => setStep(1)}
                          disabled={isLoading}
                          className="flex-1 border-white/20 text-white hover:bg-black"
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
                              Create Account
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <div className="max-w-md mx-auto text-center">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl opacity-20 blur-xl" />
                    <div className="relative p-8 rounded-2xl bg-black border border-white/30">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>

                      <h2 className="text-2xl font-bold text-white mb-2">Welcome to The 3rd Academy!</h2>
                      <p className="text-gray-50 mb-6">
                        Your {selectedRoleInfo?.title} account has been created. Check your email to verify your account, then start exploring.
                      </p>

                      <Button
                        onClick={handleComplete}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                      >
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Join;
