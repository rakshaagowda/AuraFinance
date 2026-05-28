"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Activity, Brain, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) {
      router.push("/dashboard");
    }
  }, [token, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main text-text-main">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main relative overflow-hidden flex flex-col justify-between">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px]" />

      {/* Navigation Header */}
      <header className="px-6 py-6 md:px-12 flex items-center justify-between border-b border-border-main/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-500 to-pink-400">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
            AuraFinance
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold hover:text-violet-400 transition-colors">
            Log In
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2 rounded-xl bg-primary-main text-primary-text hover:opacity-90 font-semibold text-sm transition-all shadow-md"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24 text-center max-w-4xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400 flex items-center gap-2 mb-6">
            <Brain className="w-3.5 h-3.5" /> Next-Generation Behavioral Analytics
          </div>
          
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Financial Analytics Powered by <span className="text-gradient">Behavioral ML</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-text max-w-2xl mb-10 leading-relaxed">
            AuraFinance is an advanced intelligence platform that audits transaction streams, predicts spending trends, runs K-Means behavior clustering, and checks for leaks.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <Link 
              href="/register" 
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 text-white font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-violet-500/25 group"
            >
              Start Free Audit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-border-main bg-card-bg hover:bg-muted-bg font-semibold text-base transition-all"
            >
              Demo Account
            </Link>
          </div>
        </motion.div>

        {/* Features Grids */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full"
        >
          <div className="p-6 rounded-2xl border border-border-main bg-card-bg text-left hover:border-violet-500/30 transition-colors">
            <div className="p-3 w-fit rounded-xl bg-c-income mb-4">
              <Brain className="w-6 h-6 text-c-income-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Spending Personality</h3>
            <p className="text-sm text-muted-text">
              Categorizes your cash flow style into distinct behavioral models using K-Means clustering.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border-main bg-card-bg text-left hover:border-pink-500/30 transition-colors">
            <div className="p-3 w-fit rounded-xl bg-c-info mb-4">
              <ShieldCheck className="w-6 h-6 text-c-info-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Anomaly Protection</h3>
            <p className="text-sm text-muted-text">
              Trains an Isolation Forest anomaly classifier to audit debit transaction outliers dynamically.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border-main bg-card-bg text-left hover:border-purple-500/30 transition-colors">
            <div className="p-3 w-fit rounded-xl bg-c-purple mb-4">
              <TrendingUp className="w-6 h-6 text-c-purple-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Linear Forecasting</h3>
            <p className="text-sm text-muted-text">
              Uses regression modeling over month aggregates to project costs with upper/lower bounds.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border-main/50 text-center text-xs text-muted-text z-10">
        © 2026 AuraFinance. Designed for premium financial intelligence. Powered by scikit-learn & FastAPI.
      </footer>
    </div>
  );
}
