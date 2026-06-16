import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const user = await register(name, email, password);
      toast.success(`Welcome to VidyaPath, ${user.name}`);
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=85&w=2000"
          alt="Students collaborating"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A8A]/85 via-[#0F172A]/70 to-[#C92A2A]/70" />
        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-white/15 backdrop-blur grid place-items-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">VidyaPath</span>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/70 mb-4">Start your journey</div>
            <h1 className="font-display text-4xl xl:text-6xl font-bold tracking-tighter leading-[0.95]">
              Build the rank you've imagined.
            </h1>
            <p className="text-white/80 mt-6 max-w-md leading-relaxed">
              Join thousands of NEET / JEE aspirants studying with expert mentors, structured chapters and instant tests.
            </p>
          </div>
          <div className="text-white/60 text-sm">© {new Date().getFullYear()} VidyaPath.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Create account</div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Join VidyaPath</h2>
          <p className="text-slate-500 mt-2 text-sm">Sign up as a student to access batches and content.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" required className="mt-1.5 rounded-md h-11" data-testid="register-name-input" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1.5 rounded-md h-11" data-testid="register-email-input" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="mt-1.5 rounded-md h-11" data-testid="register-password-input" />
            </div>
            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2" data-testid="register-error">
                {err}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 bg-[#C92A2A] hover:bg-[#A52A2A] text-white rounded-md font-medium" data-testid="register-submit-button">
              {loading ? "Creating..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-[#C92A2A] font-medium hover:underline" data-testid="goto-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
