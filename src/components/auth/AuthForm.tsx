
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export function AuthForm() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const validateForm = () => {
    if (isSignUp && !fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = isSignUp
        ? await signUpWithEmail(email, password, fullName)
        : await signInWithEmail(email, password);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (isSignUp) {
        toast.success("Account created successfully! Please check your email to confirm your account.");
      } else {
        toast.success("Signed in successfully");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{isSignUp ? "Create an account" : "Welcome back"}</h1>
        <p className="text-gray-500">
          {isSignUp ? "Enter your details to get started" : "Enter your credentials to access your account"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={isSignUp}
              autoComplete="name"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
        </Button>
      </form>
      <div className="text-center">
        <Button
          variant="link"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm"
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </Button>
      </div>
    </Card>
  );
}
