"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Sparkles, KeyRound, Mail, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, error, clearError, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    clearError();
    if (token) {
      router.push("/dashboard");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const success = await login(email, password);
    setSubmitting(false);
  };

  const handleSwitchProfile = (pEmail: string) => {
    setEmail(pEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen bg-bg-main relative flex items-center justify-center p-6 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-pink-500/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-violet-500 to-pink-400 shadow-lg shadow-violet-500/10 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Welcome Back</h2>
          <p className="text-muted-text text-sm mt-2">Log in to audit your behavioral finances</p>
        </div>

        {/* Card Form */}
        <div className="glass p-8 shadow-2xl relative bg-violet-50/70 border-violet-200/50 dark:bg-card-bg dark:border-border-main">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-c-expense text-c-expense-text border border-c-expense-text/10 flex items-start gap-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-muted-text" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-muted-text" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/10 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Enter Platform
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill Demo Profiles Grid */}
          <div className="mt-6 border-t border-border-main pt-6">
            <label className="block text-[10px] font-bold text-muted-text uppercase tracking-wider mb-3 text-center">
              💡 Fast Profile Switcher (Autofill)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleSwitchProfile("demo@example.com")}
                className="py-2 px-3 rounded-xl border border-dashed border-violet-500/30 text-violet-500 dark:text-violet-400 text-xs font-bold hover:bg-violet-500/5 transition-all text-center truncate"
              >
                👤 Demo (Balanced)
              </button>
              <button
                onClick={() => handleSwitchProfile("charles@example.com")}
                className="py-2 px-3 rounded-xl border border-dashed border-pink-500/30 text-pink-500 dark:text-pink-400 text-xs font-bold hover:bg-pink-500/5 transition-all text-center truncate"
              >
                👤 Charles (Investor)
              </button>
              <button
                onClick={() => handleSwitchProfile("lewis@example.com")}
                className="py-2 px-3 rounded-xl border border-dashed border-pink-500/30 text-pink-500 dark:text-pink-400 text-xs font-bold hover:bg-pink-500/5 transition-all text-center truncate"
              >
                👤 Lewis (Impulsive)
              </button>
              <button
                onClick={() => handleSwitchProfile("max@example.com")}
                className="py-2 px-3 rounded-xl border border-dashed border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/5 transition-all text-center truncate"
              >
                👤 Max (Saver)
              </button>
            </div>
          </div>
        </div>

        {/* Redirect Link */}
        <p className="text-center text-sm mt-6 text-muted-text">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-violet-500 hover:text-violet-400">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
