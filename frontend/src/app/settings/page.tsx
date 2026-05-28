"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion } from "framer-motion";
import { 
  KeyRound, 
  Languages, 
  Trash2, 
  CheckCircle2, 
  Cpu, 
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { user, apiFetch } = useAuth();
  const { lang, changeLanguage, geminiKey, updateGeminiKey, translations } = useSettings();
  
  const [apiKeyInput, setApiKeyInput] = useState(geminiKey);
  const [savingKey, setSavingKey] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSaveKey = () => {
    setSavingKey(true);
    updateGeminiKey(apiKeyInput);
    setTimeout(() => {
      setSavingKey(false);
      setMsg({ text: "Gemini API key updated locally.", type: "success" });
    }, 500);
  };

  const handleResetDB = async () => {
    if (!confirm("WARNING: This will delete your custom logged transactions and re-populate the standard 12-month demo profile. Proceed?")) {
      return;
    }
    
    setResetting(true);
    setMsg(null);
    try {
      // Calls our backend DB reset/reseed endpoint
      await apiFetch("/auth/reset-db", { method: "POST" });
      setMsg({ text: "Database successfully re-seeded to default demo profile!", type: "success" });
      // Reload page after a delay to pull new database profile
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      setMsg({ text: "Failed to reset database.", type: "error" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 max-w-3xl">
        
        {/* Messages */}
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center gap-2 text-sm font-semibold border ${
              msg.type === "success" 
                ? "bg-c-income text-c-income-text border-emerald-500/20" 
                : "bg-c-expense text-c-expense-text border-red-500/20"
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{msg.text}</span>
          </motion.div>
        )}

        {/* Section 1: User Profile */}
        <div className="glass p-6 bg-slate-50/70 border-slate-200/50 dark:bg-card-bg dark:border-border-main">
          <h3 className="text-base font-bold mb-4">Account Profile</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border-main/50">
              <span className="text-muted-text">Email Address:</span>
              <span className="font-semibold">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-main/50">
              <span className="text-muted-text">Active Behavior Personality:</span>
              <span className="font-semibold text-violet-500">{user?.spending_personality}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-text">Created Timestamp:</span>
              <span className="font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Gemini Key */}
        <div className="glass p-6 flex flex-col gap-4 bg-pink-50/70 border-pink-200/50 dark:bg-card-bg dark:border-border-main">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Gemini Intelligence Engine</h3>
              <p className="text-xs text-muted-text">Sync your personal Gemini API key for advanced natural language answers</p>
            </div>
          </div>
          
          <p className="text-xs leading-relaxed text-muted-text border-l-2 border-border-main pl-3">
            Your key is kept securely inside your local browser storage. It is passed only in outgoing request headers directly to the API endpoint, enabling real-time answers tailored to your financial profile. If left blank, advisor answers default to our local NLP rule-matching agent.
          </p>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound className="w-4 h-4 text-muted-text" />
              </span>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveKey}
              disabled={savingKey}
              className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 shrink-0"
            >
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save API Key"}
            </button>
          </div>
        </div>

        {/* Section 3: Localization */}
        <div className="glass p-6 flex flex-col gap-4 bg-violet-50/70 border-violet-200/50 dark:bg-card-bg dark:border-border-main">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Internationalization Preferences</h3>
              <p className="text-xs text-muted-text">Change localized terms across the platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-muted-text">Select Language:</label>
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl border border-border-main bg-card-bg outline-none cursor-pointer text-sm font-semibold text-text-main"
            >
              <option value="en">English (US)</option>
              <option value="fr">Français (FR)</option>
              <option value="es">Español (ES)</option>
            </select>
          </div>
        </div>

        {/* Section 4: System Reset */}
        <div className="glass p-6 flex flex-col gap-4 bg-rose-50/80 dark:bg-red-500/5 border-rose-200/50 dark:border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-red-500">System Developer Actions</h3>
              <p className="text-xs text-muted-text">Reset database records to initial baseline</p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-text">
            For evaluation purposes: resetting will purge all custom transaction records and re-seed the sqlite database with standard baseline parameters (recurring payrolls, rents, utilities, Netflix/Spotify subscriptions, and shopping/restaurant anomalies).
          </p>

          <button
            onClick={handleResetDB}
            disabled={resetting}
            className="flex items-center justify-center gap-2 w-fit px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50"
          >
            {resetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting Database...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Reset Database & Seed
              </>
            )}
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
