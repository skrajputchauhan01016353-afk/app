import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (role) => {
    if (role === "admin") {
      setEmail("admin@lms.com");
      setPassword("admin123");
    } else {
      setEmail("student@lms.com");
      setPassword("student123");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Visual side */}
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1622151834677-70f982c9adef?auto=format&fit=crop&q=85&w=2000"
          alt="Students studying"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/85 via-[#C92A2A]/70 to-[#1E3A8A]/80" />
        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-white/15 backdrop-blur grid place-items-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">VidyaPath</span>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/70 mb-4">Coaching LMS</div>
            <h1 className="font-display text-4xl xl:text-6xl font-bold tracking-tighter leading-[0.95]">
              Where ambition meets a curriculum.
            </h1>
            <p className="text-white/80 mt-6 max-w-md leading-relaxed">
              Live classes, recorded lectures, notes and tests — organised by batch, subject and chapter. Built for serious coaching institutes.
            </p>
          </div>
          <div className="text-white/60 text-sm">© {new Date().getFullYear()} VidyaPath. All rights reserved.</div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-[#C92A2A] grid place-items-center text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">VidyaPath</span>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Welcome back</div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h2>
          <p className="text-slate-500 mt-2 text-sm">Continue learning, teaching, or managing your batches.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 rounded-md h-11"
                required
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 rounded-md h-11"
                required
                data-testid="login-password-input"
              />
            </div>
            {err && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2" data-testid="login-error">
                {err}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-[#C92A2A] hover:bg-[#A52A2A] text-white rounded-md font-medium"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Demo accounts</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill("student")}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-left hover:bg-slate-50"
                data-testid="demo-student-btn"
              >
                <div className="font-semibold text-slate-800">Student</div>
                <div className="text-xs text-slate-500">student@lms.com</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill("admin")}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-left hover:bg-slate-50"
                data-testid="demo-admin-btn"
              >
                <div className="font-semibold text-slate-800">Admin</div>
                <div className="text-xs text-slate-500">admin@lms.com</div>
              </button>
            </div>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#C92A2A] font-medium hover:underline" data-testid="goto-register">
              Create a student account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
