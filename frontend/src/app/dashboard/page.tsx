"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Percent, 
  ArrowUpRight, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  is_anomaly: boolean;
}

interface AIInsight {
  id: number;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
}

interface OverviewData {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  recent_transactions: Transaction[];
  insights: AIInsight[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f87171", // red-400
  Utilities: "#60a5fa", // blue-400
  Entertainment: "#c084fc", // purple-400
  Investment: "#34d399", // emerald-400
  Shopping: "#fbbf24", // amber-400
  Housing: "#2dd4bf", // teal-400
  Travel: "#38bdf8", // sky-400
  Debt: "#f472b6", // pink-400
  Other: "#94a3b8" // slate-400
};

export default function DashboardPage() {
  const { apiFetch, loading: authLoading } = useAuth();
  const { translations } = useSettings();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      loadOverview();
    }
  }, [authLoading]);

  const loadOverview = async () => {
    try {
      const res = await apiFetch("/analytics/dashboard-overview");
      setData(res);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissInsight = async (id: number) => {
    if (id === 0) return; // Ignore mock insight dismissal
    try {
      await apiFetch(`/analytics/insights/${id}/read`, { method: "POST" });
      // Reload insights
      loadOverview();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate local pie chart data from recent transactions or general logic
  // For the demo, let's group mock recent transactions or return category metrics
  const getPieData = () => {
    if (!data || !data.recent_transactions) return [];
    
    // We can simulate breakdown based on user transactions in state
    const categories: Record<string, number> = {
      Food: 320.0,
      Utilities: 140.0,
      Entertainment: 215.0,
      Investment: 500.0,
      Shopping: 180.0,
      Housing: 1500.0,
      Travel: 85.0,
      Debt: 220.0
    };
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other
    }));
  };

  const pieData = getPieData();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass p-6 flex flex-col justify-between bg-violet-100/80 border-violet-300/60 dark:bg-card-bg dark:border-border-main"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">{translations.netWorth}</span>
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">₹{data?.total_balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              <p className="text-xs text-c-income-text flex items-center gap-1 mt-1 font-semibold">
                <TrendingUp className="w-3 h-3" /> +12.4% vs last month
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="glass p-6 flex flex-col justify-between bg-emerald-100/80 border-emerald-300/60 dark:bg-card-bg dark:border-border-main"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">{translations.monthlyIncome}</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-c-income-text">₹{data?.monthly_income.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              <p className="text-xs text-muted-text mt-1">Direct deposits & investments</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass p-6 flex flex-col justify-between bg-rose-100/80 border-rose-300/60 dark:bg-card-bg dark:border-border-main"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">{translations.monthlyExpenses}</span>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-c-expense-text">₹{data?.monthly_expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              <p className="text-xs text-muted-text mt-1">Calculated billings & debits</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="glass p-6 flex flex-col justify-between bg-pink-100/80 border-pink-300/60 dark:bg-card-bg dark:border-border-main"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">{translations.savingsRate}</span>
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-pink-500">{roundSavingsRate(data?.savings_rate || 0)}%</h3>
              <p className="text-xs text-c-income-text flex items-center gap-1 mt-1 font-semibold">
                Target savings: 20%
              </p>
            </div>
          </motion.div>

        </div>

        {/* Dynamic Analytics & Insights Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity Table (2 columns wide) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass p-6 flex-1 flex flex-col justify-between bg-violet-50/60 border-violet-200/50 dark:bg-card-bg dark:border-border-main">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-500" />
                  {translations.recentActivity}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border-main text-xs uppercase font-bold text-muted-text">
                        <th className="pb-3">Description</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/50">
                      {data?.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="group hover:bg-muted-bg/30 transition-colors">
                          <td className="py-3.5 pr-2 font-medium max-w-[200px] truncate">
                            <span className="block font-semibold">{tx.description}</span>
                            <span className="text-xs text-muted-text">{tx.date}</span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                              tx.type === "credit" ? "bg-c-income text-c-income-text" : "bg-muted-bg text-muted-text"
                            }`}>
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-bold">
                            <span className={tx.type === "credit" ? "text-c-income-text" : "text-text-main"}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </span>
                            {tx.is_anomaly && (
                              <span className="block text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">
                                ⚠️ Anomalous Spend
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-muted-text">
                            No recent transactions found. Upload statements or add manually!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 text-right">
                <a href="/transactions" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:text-violet-400 group">
                  Manage History
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          {/* Expenses Chart (1 column wide) */}
          <div className="glass p-6 flex flex-col justify-between bg-amber-50/60 border-amber-200/50 dark:bg-card-bg dark:border-border-main">
            <div>
              <h3 className="text-lg font-bold mb-1">Expenses Allocation</h3>
              <p className="text-xs text-muted-text mb-4">Proportions by category this period</p>
              
              <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`₹${value.toFixed(2)}`, "Allocated"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-text uppercase font-bold">Total Spend</span>
                  <span className="text-base font-extrabold">₹{data?.monthly_expenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-[140px] overflow-y-auto pr-1">
                {pieData.slice(0, 8).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs truncate font-medium text-muted-text">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* AI Behavior Insights section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            {translations.aiInsights}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.insights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 shadow-sm ${
                  insight.type === "warning"
                    ? "bg-c-expense text-c-expense-text border-red-500/20"
                    : insight.type === "suggestion"
                    ? "bg-c-purple text-c-purple-text border-purple-500/20"
                    : "bg-c-info text-c-info-text border-blue-500/20"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {insight.type === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : insight.type === "suggestion" ? (
                      <Lightbulb className="w-4 h-4 text-purple-500" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="font-bold text-xs uppercase tracking-wider">{insight.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{insight.description}</p>
                </div>
                {insight.id !== 0 && (
                  <button 
                    onClick={() => handleDismissInsight(insight.id)}
                    className="w-fit text-xs font-bold underline opacity-80 hover:opacity-100 mt-2"
                  >
                    Dismiss Note
                  </button>
                )}
              </motion.div>
            ))}
            {(!data?.insights || data.insights.length === 0) && (
              <div className="col-span-3 p-8 text-center rounded-2xl border border-dashed border-border-main text-muted-text text-sm bg-card-bg">
                No active behavior warnings flagged. Everything looks perfect!
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

function roundSavingsRate(val: number): string {
  return (val * 100).toFixed(1);
}
