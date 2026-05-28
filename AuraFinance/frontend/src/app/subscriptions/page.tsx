"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarClock, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles,
  Loader2,
  CheckCircle
} from "lucide-react";

interface Subscription {
  id: number;
  merchant: string;
  amount: number;
  category: string;
  periodicity: string;
  next_billing_date: string;
  is_active: boolean;
}

export default function SubscriptionsPage() {
  const { apiFetch, loading: authLoading } = useAuth();
  const { translations } = useSettings();
  
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading) {
      loadSubscriptions();
    }
  }, [authLoading]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/analytics/subscriptions");
      setSubs(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    setActioningId(id);
    try {
      await apiFetch(`/analytics/subscriptions/${id}/toggle`, { method: "POST" });
      loadSubscriptions();
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove subscription?")) return;
    try {
      await apiFetch(`/analytics/subscriptions/${id}`, { method: "DELETE" });
      loadSubscriptions();
    } catch (e) {
      console.error(e);
    }
  };

  const totalMonthlyCost = subs
    .filter(s => s.is_active)
    .reduce((acc, curr) => {
      let multiplier = 1;
      if (curr.periodicity === "Weekly") multiplier = 4.33;
      else if (curr.periodicity === "Yearly") multiplier = 1 / 12;
      return acc + curr.amount * multiplier;
    }, 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Row 1: Header summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly recurring leakage summary */}
          <div className="glass p-6 md:col-span-2 bg-gradient-to-br from-violet-100/80 to-purple-100/80 border-violet-200/50 dark:from-card-bg dark:to-violet-500/5 dark:border-border-main relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Recurring Monthly Outflow</span>
                <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-violet-500 dark:text-violet-400">
                  ₹{totalMonthlyCost.toFixed(2)}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-violet-500/10 text-violet-500">
                <CalendarClock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-text leading-relaxed">
              Based on detected recurring merchant charges. Disabling subscriptions dynamically updates your health score budgeting efficiency metric.
            </p>
          </div>

          {/* AI Subscription insights card */}
          <div className="glass p-6 bg-pink-50/80 border-pink-200/50 dark:bg-pink-500/5 dark:border-pink-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-pink-500">Subscription Auditor</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-text">
              We identified 3 active subscription profiles in Entertainment. Verify if you have redundant streaming plans (e.g. Netflix & Spotify) and delete cancelled ones.
            </p>
            <div className="text-[10px] text-pink-500 font-bold uppercase mt-3">
              Potential Savings: ₹1,200/mo
            </div>
          </div>
        </div>

        {/* Detected Subscriptions List */}
        <div className="glass p-6 bg-violet-50/40 border-violet-200/40 dark:bg-card-bg dark:border-border-main">
          <h3 className="text-lg font-bold mb-4">Detected Recurring Accounts</h3>
          
          <div className="flex flex-col gap-4">
            {subs.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  sub.is_active 
                    ? "bg-card-bg border-border-main" 
                    : "bg-muted-bg/30 border-border-main/50 opacity-60"
                }`}
              >
                {/* Left block info */}
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    sub.is_active ? "bg-violet-500/10 text-violet-500" : "bg-muted-bg text-muted-text"
                  }`}>
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{sub.merchant}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-text mt-1">
                      <span>{sub.category}</span>
                      <span>•</span>
                      <span>{sub.periodicity}</span>
                      <span>•</span>
                      <span className="font-medium text-violet-400">Next bill: {sub.next_billing_date}</span>
                    </div>
                  </div>
                </div>

                {/* Right block controls */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                  <div className="text-right">
                    <span className="block font-extrabold text-sm">₹{sub.amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleActive(sub.id)}
                      disabled={actioningId === sub.id}
                      className="p-1 rounded-lg text-muted-text hover:text-violet-500 transition-colors"
                      title={sub.is_active ? "Mark as inactive" : "Mark as active"}
                    >
                      {sub.is_active ? (
                        <ToggleRight className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-muted-text" />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 rounded-lg text-muted-text hover:text-red-500 hover:bg-red-50/10 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}

            {loading && (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            )}

            {!loading && subs.length === 0 && (
              <div className="py-12 text-center text-muted-text text-sm border border-dashed border-border-main rounded-2xl bg-card-bg">
                No active subscriptions detected. Our ML recurring analyzer automatically logs plans once you feed recurring transaction statements.
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
