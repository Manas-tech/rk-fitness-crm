"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const loginEmail = customEmail || email;
    const loginPassword = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: "OWNER" | "MANAGER") => {
    if (role === "OWNER") {
      setEmail("owner@ironpulsefitness.com");
      setPassword("admin123");
      handleLogin(undefined, "owner@ironpulsefitness.com", "admin123");
    } else {
      setEmail("manager@ironpulsefitness.com");
      setPassword("manager123");
      handleLogin(undefined, "manager@ironpulsefitness.com", "manager123");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-sm p-8">
        {/* Brand Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white mb-3 shadow-xs">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">
            IronPulse Gym CRM
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Enterprise Gym Operations & Financial Management
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@ironpulsefitness.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Sign In to Dashboard
          </Button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider text-center mb-3">
            Quick One-Click Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin("OWNER")}
              className="p-2.5 rounded-lg border border-border bg-background hover:bg-[#EEF1F5] text-left transition-colors flex flex-col"
            >
              <span className="text-xs font-semibold text-ink-primary flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Gym Owner
              </span>
              <span className="text-[10px] text-ink-secondary mt-0.5">Full System Access</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("MANAGER")}
              className="p-2.5 rounded-lg border border-border bg-background hover:bg-[#EEF1F5] text-left transition-colors flex flex-col"
            >
              <span className="text-xs font-semibold text-ink-primary">Branch Manager</span>
              <span className="text-[10px] text-ink-secondary mt-0.5">Operations Access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
