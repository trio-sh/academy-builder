import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GraduationCap, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const [userType, setUserType] = useState("candidate");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12">
          <div className="container px-4 md:px-6">
            <div className="max-w-md mx-auto">
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    THE 3RD ACADEMY
                  </span>
                </div>
              </div>

              {/* Card */}
              <div className="p-8 rounded-2xl bg-card border border-border">
                <h1 className="text-2xl font-bold text-center text-foreground mb-2">
                  Welcome Back
                </h1>
                <p className="text-center text-muted-foreground mb-6">
                  Sign in to continue your journey
                </p>

                {/* User Type Tabs */}
                <Tabs value={userType} onValueChange={setUserType} className="mb-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="candidate">Candidate</TabsTrigger>
                    <TabsTrigger value="mentor">Mentor</TabsTrigger>
                    <TabsTrigger value="employer">Employer</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Form */}
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-sm text-academy-royal hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input id="password" type="password" placeholder="••••••••" />
                  </div>

                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    Sign In
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Social Login */}
                <Button variant="outline" className="w-full">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/get-started" className="text-academy-royal hover:underline font-medium">
                    Get Started
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
