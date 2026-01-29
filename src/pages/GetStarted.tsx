import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  FileText, 
  Users, 
  Briefcase, 
  Upload,
  ArrowRight,
  CheckCircle2,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const entryPaths = [
  {
    id: "resume",
    entry: "Entry A",
    title: "Resume Upload",
    description: "Start with your resume. Our Resume Enhancer identifies observation areas for your assigned mentor.",
    icon: FileText,
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Hero */}
        <section className="py-12 md:py-20 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-block text-sm font-medium text-academy-royal uppercase tracking-wider mb-4">
                Start Your Journey
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Begin Your Credentialing Path
              </h1>
              <p className="text-lg text-muted-foreground">
                Choose your entry point and start building your evidence-based 
                behavioral profile with mentor guidance.
              </p>
            </div>
          </div>
        </section>

        {/* Entry Path Selection */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-center gap-4 mb-12">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      step >= s 
                        ? "bg-academy-royal text-white" 
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </div>
                    {s < 3 && (
                      <div className={cn(
                        "w-16 h-0.5 transition-colors",
                        step > s ? "bg-academy-royal" : "bg-secondary"
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    Choose Your Entry Point
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {entryPaths.map((path) => (
                      <button
                        key={path.id}
                        onClick={() => setSelectedPath(path.id)}
                        className={cn(
                          "relative p-6 rounded-2xl border-2 text-left transition-all duration-200",
                          selectedPath === path.id
                            ? "border-academy-royal bg-academy-royal/5"
                            : "border-border hover:border-academy-royal/50 bg-card"
                        )}
                      >
                        {path.recommended && (
                          <span className="absolute -top-3 left-6 px-3 py-1 text-xs font-medium bg-academy-emerald text-white rounded-full">
                            Recommended
                          </span>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            selectedPath === path.id
                              ? "bg-academy-royal text-white"
                              : "bg-secondary text-muted-foreground"
                          )}>
                            <path.icon className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {path.entry}
                          </span>
                        </div>

                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {path.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {path.description}
                        </p>

                        <ul className="space-y-2">
                          {path.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className={cn(
                                "w-4 h-4",
                                selectedPath === path.id
                                  ? "text-academy-emerald"
                                  : "text-muted-foreground"
                              )} />
                              <span className="text-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button 
                      size="lg" 
                      onClick={() => setStep(2)}
                      disabled={!selectedPath}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-md mx-auto space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    Create Your Account
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Create a password" />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={() => setStep(3)}
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && selectedPath === "resume" && (
                <div className="max-w-md mx-auto space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    Upload Your Resume
                  </h2>

                  <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-academy-royal/50 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-2">
                      Drop your resume here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      PDF, DOC, or DOCX up to 10MB
                    </p>
                    <Button variant="outline" size="sm">
                      Browse Files
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-academy-royal/5 border border-academy-royal/20">
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      What happens next?
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Resume Enhancer analyzes your resume
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Observation areas identified for your mentor
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Basic Profile created (non-credentialed)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Mentor matched within 48 hours
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      className="flex-1 bg-academy-emerald hover:bg-academy-emerald/90 text-white"
                    >
                      Complete Setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && selectedPath === "liveworks" && (
                <div className="max-w-md mx-auto space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    Set Up Your Profile
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="headline">Professional Headline</Label>
                      <Input id="headline" placeholder="e.g., Full Stack Developer" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skills">Primary Skills</Label>
                      <Input id="skills" placeholder="e.g., React, Node.js, Python" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input id="experience" type="number" placeholder="e.g., 3" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-academy-royal/5 border border-academy-royal/20">
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      What happens next?
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Browse available projects
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Apply to projects matching your skills
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Complete work under mentor supervision
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-academy-emerald" />
                        Build evidence for your Skill Passport
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      className="flex-1 bg-academy-emerald hover:bg-academy-emerald/90 text-white"
                    >
                      Complete Setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
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
