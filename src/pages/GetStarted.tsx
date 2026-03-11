import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import {
  FileText,
  Briefcase,
  Upload,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
  Users,
  GraduationCap,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { parseResume } from "@/lib/resumeParser";
import { analyzeResume } from "@/services/resumeEnhancer";
import { findMentorMatches } from "@/lib/mentorMatching";

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
  const [selectedRole, setSelectedRole] = useState<UserRole>("candidate");
  const [selectedPath, setSelectedPath] = useState<string | null>("resume");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Track whether the user just signed up in this session (don't redirect them away)
  const justSignedUpRef = useRef(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Role-specific fields
  const [companyName, setCompanyName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [industry, setIndustry] = useState("");

  // LiveWorks profile state
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  // Resume upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { signUp, user, isAuthenticated, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getDashboardRoute = (role: string) => {
    const routes: Record<string, string> = {
      candidate: "/dashboard/candidate",
      mentor: "/dashboard/mentor",
      employer: "/dashboard/employer",
      school_admin: "/dashboard/school",
      admin: "/dashboard/admin",
    };
    return routes[role] || "/dashboard/candidate";
  };

  // If user is already authenticated with completed onboarding and didn't just sign up, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && profile && profile.onboarding_completed && !justSignedUpRef.current) {
      navigate(getDashboardRoute(profile.role), { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  // If user is authenticated but onboarding NOT completed (returning user), skip to step 3
  useEffect(() => {
    if (isAuthenticated && profile && !profile.onboarding_completed && !justSignedUpRef.current) {
      // Pre-set their role from profile so step 3 renders correctly
      const role = profile.role as UserRole;
      if (role && role !== selectedRole) {
        setSelectedRole(role);
      }
      // For candidates, try to detect their entry path from candidate_profiles
      if (role === "candidate") {
        supabase
          .from("candidate_profiles")
          .select("entry_path")
          .eq("profile_id", profile.id)
          .single()
          .then(({ data }) => {
            if (data?.entry_path === "liveworks") {
              setSelectedPath("liveworks");
            } else {
              setSelectedPath("resume");
            }
          });
      }
      setStep(3);
    }
  }, [isAuthenticated, profile]);

  // Returning user = authenticated but hasn't completed onboarding (skipped to step 3)
  const isReturningUser = isAuthenticated && profile && !profile.onboarding_completed && !justSignedUpRef.current;

  // Map UI path IDs to database entry_path values
  const getEntryPath = (pathId: string | null): 'resume_upload' | 'liveworks' | 'civic_access' => {
    switch (pathId) {
      case 'resume':
        return 'resume_upload';
      case 'liveworks':
        return 'liveworks';
      default:
        return 'resume_upload';
    }
  };

  const selectedRoleInfo = roleOptions.find((r) => r.id === selectedRole);

  const handleSignUp = async () => {
    setError("");
    setIsLoading(true);

    // Set BEFORE calling signUp to prevent race condition with onAuthStateChange
    justSignedUpRef.current = true;

    try {
      const metadata: Record<string, unknown> = {
        firstName,
        lastName,
        role: selectedRole,
      };

      // Add role-specific metadata
      if (selectedRole === "candidate") {
        metadata.entryPath = getEntryPath(selectedPath);
      } else if (selectedRole === "employer") {
        metadata.companyName = companyName;
        metadata.industry = industry;
      } else if (selectedRole === "school_admin") {
        metadata.schoolName = schoolName;
      } else if (selectedRole === "mentor") {
        metadata.industry = industry;
        metadata.yearsExperience = parseInt(yearsExperience) || 0;
      }

      const { error: signUpError } = await signUp(email, password, metadata as Parameters<typeof signUp>[2]);

      if (signUpError) {
        setError(signUpError.message || "Failed to create account");
        justSignedUpRef.current = false;
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
      justSignedUpRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!user?.id) {
      navigate(getDashboardRoute(selectedRole));
      return;
    }

    setIsCompletingSetup(true);

    try {
      // If LiveWorks path, save the profile fields first
      if (selectedRole === "candidate" && selectedPath === "liveworks") {
        const skillsArray = skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        await supabase
          .from("candidate_profiles")
          .upsert(
            {
              profile_id: user.id,
              headline: headline || null,
              skills: skillsArray,
              years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
              entry_path: "liveworks",
              has_basic_profile: true,
              observation_areas: [
                "integrity_ethics",
                "accountability_ownership",
                "execution_reliability",
                "communication_pressure",
                "collaboration_conflict",
              ],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "profile_id" }
          );

        // Update the main profile headline too
        if (headline) {
          await supabase
            .from("profiles")
            .update({ headline, updated_at: new Date().toISOString() })
            .eq("id", user.id);
        }

        await supabase.from("growth_log_entries").insert({
          candidate_id: user.id,
          event_type: "assessment",
          title: "Profile Setup Complete",
          description: `LiveWorks profile created with ${skillsArray.length} skills`,
          source_component: "GetStarted",
        });
      }

      // Mark onboarding as completed
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      // Refresh the profile in AuthContext so ProtectedRoute sees onboarding_completed = true
      await refreshProfile();

      // Auto-trigger mentor matching for candidate paths
      if (selectedRole === "candidate") {
        try {
          const matches = await findMentorMatches(user.id, 1);
          if (matches.length > 0) {
            const topMentor = matches[0];

            // Get the candidate_profiles.id (PK) for the FK reference
            const { data: cpRow } = await supabase
              .from("candidate_profiles")
              .select("id")
              .eq("profile_id", user.id)
              .single();

            if (cpRow) {
              // Create a mentor assignment using table PKs
              await supabase.from("mentor_assignments").insert({
                mentor_id: topMentor.mentor.id,
                candidate_id: cpRow.id,
                status: "active",
              });
            }

            await supabase.from("growth_log_entries").insert({
              candidate_id: user.id,
              event_type: "training",
              title: "Mentor Matched",
              description: `Auto-matched with a mentor (${topMentor.compatibilityLevel} compatibility, ${Math.round(topMentor.score.total)}% match)`,
              source_component: "MentorMatching",
            });

            toast({
              title: "Setup complete!",
              description: `Welcome! You've been matched with a mentor (${topMentor.compatibilityLevel} match).`,
            });
          } else {
            await supabase.from("growth_log_entries").insert({
              candidate_id: user.id,
              event_type: "training",
              title: "Mentor Matching Queued",
              description: "You'll be matched with a mentor as one becomes available.",
              source_component: "MentorMatching",
            });

            toast({
              title: "Setup complete!",
              description: "Welcome! We'll match you with a mentor shortly.",
            });
          }
        } catch (matchErr) {
          console.error("Mentor matching error (non-blocking):", matchErr);
          toast({
            title: "Setup complete!",
            description: "Welcome to The 3rd Academy. Let's begin your journey.",
          });
        }
      } else {
        toast({
          title: "Setup complete!",
          description: `Welcome to The 3rd Academy! Your ${selectedRoleInfo?.title} account is ready.`,
        });
      }
    } catch (err) {
      console.error("Setup completion error:", err);
      toast({
        title: "Setup complete!",
        description: "Welcome to The 3rd Academy. Let's begin your journey.",
      });
    } finally {
      setIsCompletingSetup(false);
      justSignedUpRef.current = false;
      navigate(getDashboardRoute(selectedRole));
    }
  };

  const handleNonCandidateComplete = () => {
    handleCompleteSetup();
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a PDF or Word document');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_resume.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (storageError) {
        setUploadError('Failed to upload resume. Please try again.');
        console.error('Upload error:', storageError);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(fileName);
      const resumeUrl = publicUrlData?.publicUrl || fileName;

      // Update candidate profile with resume URL
      await supabase.from("candidate_profiles").upsert({
        profile_id: user.id,
        resume_url: resumeUrl,
        skills: [],
        entry_path: 'resume_upload',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id' });

      // Growth log entry
      await supabase.from("growth_log_entries").insert({
        candidate_id: user.id,
        event_type: "resume_upload",
        title: "Resume Uploaded",
        description: `Uploaded resume: ${file.name}`,
        source_component: "Profile",
      });

      setUploadedFile(file.name);

      // Run Resume Enhancer AI
      setIsEnhancing(true);
      try {
        const parsed = await parseResume(file);
        const enhancerResult = await analyzeResume(parsed.rawText || "");

        const updateData: Record<string, unknown> = {
          observation_areas: enhancerResult.observationDimensions,
          has_basic_profile: true,
          updated_at: new Date().toISOString(),
        };
        if (enhancerResult.suggestedSkills.length > 0) {
          updateData.skills = Array.from(new Set([...parsed.skills, ...enhancerResult.suggestedSkills]));
        }
        await supabase.from("candidate_profiles").update(updateData).eq("profile_id", user.id);

        await supabase.from("growth_log_entries").insert({
          candidate_id: user.id,
          event_type: "assessment",
          title: "Resume Enhancer — Basic Profile Created",
          description: `AI-analyzed resume. ${enhancerResult.summary}`,
          source_component: "ResumeEnhancer",
        });
      } catch (enhancerErr) {
        console.error("Resume Enhancer error (non-blocking):", enhancerErr);
        // Fallback: create basic profile with default dimensions
        await supabase.from("candidate_profiles").update({
          observation_areas: ["integrity_ethics", "accountability_ownership", "execution_reliability", "communication_pressure", "collaboration_conflict"],
          has_basic_profile: true,
          updated_at: new Date().toISOString(),
        }).eq("profile_id", user.id);
      } finally {
        setIsEnhancing(false);
      }
    } catch (err) {
      setUploadError('An unexpected error occurred. Please try again.');
      console.error('Resume upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine total steps based on role
  const totalSteps = selectedRole === "candidate" ? 3 : 3;

  return (
    <div className="min-h-screen bg-black">
      <BackgroundVideo />
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-black to-black" />

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 border border-gray-700 text-sm text-white mb-6">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Start Your Journey
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-white">
                  Begin Your
                </span>{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Credentialing Path
                </span>
              </h1>
              <p className="text-lg text-gray-50">
                Choose your role and start building your evidence-based
                behavioral profile with mentor guidance.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 md:py-16 bg-black">
          <div className="container px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-center gap-4 mb-12">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                        step >= s
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                          : "bg-gray-900 text-gray-50 border border-gray-700"
                      )}
                    >
                      {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </div>
                    {s < totalSteps && (
                      <div className={cn(
                        "w-16 h-0.5",
                        step > s ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-800"
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Role Selection + Entry Path for candidates */}
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
                          "group relative p-6 rounded-2xl text-left",
                          selectedRole === role.id
                            ? "bg-gray-950 border-2 border-indigo-500"
                            : "bg-gray-950 border border-gray-700 hover:border-gray-600"
                        )}
                      >

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

                  {/* Entry Path Selection - only for candidates */}
                  {selectedRole === "candidate" && (
                    <div className="space-y-6 mt-8">
                      <h3 className="text-xl font-bold text-center text-white">Choose Your Entry Point</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        {entryPaths.map((path) => (
                          <button
                            key={path.id}
                            onClick={() => setSelectedPath(path.id)}
                            className={cn(
                              "group relative p-8 rounded-3xl text-left",
                              selectedPath === path.id
                                ? "bg-gray-950 border-2 border-indigo-500"
                                : "bg-gray-950 border border-gray-700 hover:border-gray-600"
                            )}
                          >

                            <div className="relative">
                              {path.recommended && (
                                <span className="inline-block mb-3 px-3 py-1 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full">
                                  Recommended
                                </span>
                              )}

                              <div className={cn("flex items-center gap-3 mb-4", !path.recommended && "mt-2")}>
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                                  selectedPath === path.id ? path.gradient : "from-white/10 to-white/5"
                                )}>
                                  <path.icon className={cn("w-7 h-7", selectedPath === path.id ? "text-white" : "text-gray-50")} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{path.entry}</span>
                              </div>

                              <h3 className="text-xl font-bold text-white mb-2">{path.title}</h3>
                              <p className="text-gray-50 mb-6">{path.description}</p>

                              <ul className="space-y-3">
                                {path.features.map((feature) => (
                                  <li key={feature} className="flex items-center gap-3 text-sm">
                                    <CheckCircle2 className={cn("w-4 h-4", selectedPath === path.id ? "text-emerald-400" : "text-gray-500")} />
                                    <span className="text-gray-50">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-6">
                    <Button
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={!selectedRole || (selectedRole === "candidate" && !selectedPath)}
                      className={cn(
                        "px-10 py-6 rounded-xl font-bold text-lg text-white",
                        !selectedRole || (selectedRole === "candidate" && !selectedPath)
                          ? "bg-gray-800 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      )}
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
                    <div className="relative p-8 rounded-3xl bg-gray-950 border border-gray-800">
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

                      {/* Error Message */}
                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-950 border border-red-800 flex items-start gap-3">
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
                              placeholder="John"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              disabled={isLoading}
                              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-50">Last Name</Label>
                            <Input
                              id="lastName"
                              placeholder="Doe"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              disabled={isLoading}
                              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-gray-50">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-gray-50">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Create a password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
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
                          className="flex-1 border-gray-700 text-white hover:bg-gray-900"
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
                  </div>
                </div>
              )}

              {/* Step 3 for Candidates: Resume Upload */}
              {step === 3 && selectedRole === "candidate" && selectedPath === "resume" && (
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <div className="relative p-8 rounded-3xl bg-gray-950 border border-gray-800">
                      <h2 className="text-2xl font-bold text-center text-white mb-8">
                        {isReturningUser ? "Welcome Back! Upload Your Resume" : "Upload Your Resume"}
                      </h2>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />

                      {uploadError && (
                        <div className="mb-4 p-3 rounded-xl bg-red-950 border border-red-800 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-400">{uploadError}</p>
                        </div>
                      )}

                      {!uploadedFile ? (
                        <div
                          className="border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center hover:border-indigo-500 cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploading || isEnhancing ? (
                            <>
                              <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
                              <p className="text-white font-medium mb-2">
                                {isEnhancing ? "AI analyzing your resume..." : "Uploading..."}
                              </p>
                              <p className="text-sm text-gray-500">This may take a moment</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-12 h-12 text-gray-50 mx-auto mb-4" />
                              <p className="text-white font-medium mb-2">Click to upload your resume</p>
                              <p className="text-sm text-gray-500 mb-4">PDF, DOC, or DOCX up to 10MB</p>
                              <Button variant="outline" size="sm" className="border-gray-700 text-white hover:bg-gray-900" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-emerald-500 rounded-2xl p-8 text-center bg-emerald-950">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                          <p className="text-white font-medium mb-1">Resume uploaded & analyzed!</p>
                          <p className="text-sm text-gray-400">{uploadedFile}</p>
                        </div>
                      )}

                      <div className="mt-6 p-4 rounded-xl bg-indigo-950 border border-indigo-800">
                        <h3 className="text-sm font-medium text-white mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-gray-50">
                          {["Resume Enhancer analyzes your resume", "Observation areas identified for your mentor", "Basic Profile created (non-credentialed)", "Mentor matched within 48 hours"].map((item) => (
                            <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-4 pt-6">
                        {!isReturningUser && (
                          <Button variant="outline" onClick={() => setStep(2)} disabled={isCompletingSetup} className="flex-1 border-gray-700 text-white hover:bg-gray-900">Back</Button>
                        )}
                        <Button onClick={handleCompleteSetup} disabled={isUploading || isEnhancing || isCompletingSetup} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                          {isCompletingSetup ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matching mentor...</>
                          ) : (
                            <>{uploadedFile ? "Go to Dashboard" : "Skip for Now"}<ArrowRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 for Candidates: LiveWorks Profile */}
              {step === 3 && selectedRole === "candidate" && selectedPath === "liveworks" && (
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <div className="relative p-8 rounded-3xl bg-gray-950 border border-gray-800">
                      <h2 className="text-2xl font-bold text-center text-white mb-8">Set Up Your Profile</h2>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="headline" className="text-gray-50">Professional Headline</Label>
                          <Input id="headline" placeholder="e.g., Full Stack Developer" value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={isCompletingSetup} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skills" className="text-gray-50">Primary Skills</Label>
                          <Input id="skills" placeholder="e.g., React, Node.js, Python" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={isCompletingSetup} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="experience" className="text-gray-50">Years of Experience</Label>
                          <Input id="experience" type="number" placeholder="e.g., 3" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} disabled={isCompletingSetup} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500" />
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-purple-950 border border-purple-800">
                        <h3 className="text-sm font-medium text-white mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-gray-50">
                          {["Browse available projects", "Apply to projects matching your skills", "Complete work under mentor supervision", "Build evidence for your Skill Passport"].map((item) => (
                            <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-4 pt-6">
                        {!isReturningUser && (
                          <Button variant="outline" onClick={() => setStep(2)} disabled={isCompletingSetup} className="flex-1 border-gray-700 text-white hover:bg-gray-900">Back</Button>
                        )}
                        <Button onClick={handleCompleteSetup} disabled={isCompletingSetup} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                          {isCompletingSetup ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</>
                          ) : (
                            <>Complete Setup<CheckCircle2 className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 for Non-Candidate Roles: Welcome / Success */}
              {step === 3 && selectedRole !== "candidate" && (
                <div className="max-w-md mx-auto text-center">
                  <div className="relative">
                    <div className="relative p-8 rounded-2xl bg-gray-950 border border-gray-800">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>

                      <h2 className="text-2xl font-bold text-white mb-2">
                        {isReturningUser ? "Welcome Back!" : "Welcome to The 3rd Academy!"}
                      </h2>
                      <p className="text-gray-50 mb-6">
                        {isReturningUser
                          ? `Let's finish setting up your ${selectedRoleInfo?.title} account. Click below to complete your setup and access your dashboard.`
                          : `Your ${selectedRoleInfo?.title} account has been created. Check your email to verify your account, then start exploring.`
                        }
                      </p>

                      <Button
                        onClick={handleNonCandidateComplete}
                        disabled={isCompletingSetup}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      >
                        {isCompletingSetup ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</>
                        ) : (
                          <>Go to Dashboard<ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
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

export default GetStarted;
