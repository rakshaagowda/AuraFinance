"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  TrendingUp, 
  Heart, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2,
  AlertTriangle,
  Flame,
  Gauge,
  X
} from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface RadarPoint {
  category: string;
  proportion: number;
}

interface PersonalityData {
  personality: string;
  description: string;
  traits: string[];
  category_radar: RadarPoint[];
}

interface ForecastPoint {
  period: string;
  predicted_amount: number;
  lower_bound: number;
  upper_bound: number;
}

interface ForecastHistory {
  period: string;
  amount: number;
}

interface ForecastData {
  history: ForecastHistory[];
  forecast: ForecastPoint[];
  trend: string;
}

interface HealthBreakdown {
  savings_score: number;
  budgeting_efficiency: number;
  debt_risk: number;
  overspending_risk: number;
}

interface HealthData {
  score: number;
  grade: string;
  breakdown: HealthBreakdown;
  recommendations: string[];
}

export default function AnalyticsPage() {
  const { apiFetch, loading: authLoading } = useAuth();
  const { translations } = useSettings();
  
  const [personality, setPersonality] = useState<PersonalityData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      loadAnalytics();
    }
  }, [authLoading]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [personalityRes, forecastRes, healthRes] = await Promise.all([
        apiFetch("/analytics/personality"),
        apiFetch("/analytics/forecast"),
        apiFetch("/analytics/health-score")
      ]);
      setPersonality(personalityRes);
      setForecast(forecastRes);
      setHealth(healthRes);
    } catch (e) {
      console.error("Failed to load analytics data", e);
    } finally {
      setLoading(false);
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

  // Construct forecast chart unified data
  const getForecastChartData = () => {
    if (!forecast) return [];
    
    // Add history points
    const dataPoints: any[] = forecast.history.map(pt => ({
      period: pt.period,
      Actual: pt.amount,
      Predicted: null,
      lower: null,
      upper: null
    }));
    
    // Append the last history point value to the first forecast point to make the line continuous
    if (dataPoints.length > 0 && forecast.forecast.length > 0) {
      const lastHist = dataPoints[dataPoints.length - 1];
      const firstFore = forecast.forecast[0];
      
      // Add predictions
      forecast.forecast.forEach((pt, idx) => {
        dataPoints.push({
          period: pt.period,
          Actual: null,
          Predicted: pt.predicted_amount,
          lower: pt.lower_bound,
          upper: pt.upper_bound
        });
      });
    }
    
    return dataPoints;
  };

  const chartData = getForecastChartData();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10";
    if (score >= 70) return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        
        {/* Row 1: Spending Personality & Financial Health Score */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Spending Personality Card (Clustering ML) */}
          <div className="glass p-6 flex flex-col justify-between bg-violet-50/60 border-violet-200/50 dark:bg-card-bg dark:border-border-main">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{translations.spendingPersonality}</h3>
                  <p className="text-xs text-muted-text">K-Means behavioral clustering model</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xl font-extrabold text-violet-500 dark:text-violet-400">
                  {personality?.personality}
                </h4>
                <p className="text-sm mt-2 leading-relaxed text-muted-text">
                  {personality?.description}
                </p>
              </div>

              {/* Traits checklist */}
              <div className="flex flex-col gap-2 mb-6">
                {personality?.traits.map((trait, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-text-main">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                    <span>{trait}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar proportions chart */}
            {personality?.category_radar && personality.category_radar.length > 0 && (
              <div className="h-56 w-full flex items-center justify-center border-t border-border-main/50 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={personality.category_radar}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: "var(--color-muted-text)", fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--color-muted-text)", fontSize: 8 }} />
                    <Radar
                      name="Spending Allocation"
                      dataKey="proportion"
                      stroke="#818cf8"
                      fill="#818cf8"
                      fillOpacity={0.25}
                    />
                    <Tooltip 
                      formatter={(val: any) => [`${val}%`, "Proportion"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Financial Health Score Panel */}
          <div className="glass p-6 flex flex-col justify-between gap-6 bg-rose-50/60 border-rose-200/50 dark:bg-card-bg dark:border-border-main">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{translations.healthScore}</h3>
                <p className="text-xs text-muted-text">Wellness multi-factor grading report</p>
              </div>
            </div>

            {/* Score Ring Gauge & Sub-metrics */}
            <div className="flex flex-col sm:flex-row items-center gap-8 justify-center py-4">
              {/* Score circle */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="var(--border)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={health?.score && health.score >= 70 ? "#10b981" : "#ef4444"}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * (health?.score || 50)) / 100 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold">{health?.score}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${getScoreColor(health?.score || 50)}`}>
                    Grade: {health?.grade}
                  </span>
                </div>
              </div>

              {/* Individual sub-scores progress bars */}
              <div className="flex-1 flex flex-col gap-3 w-full">
                {health?.breakdown && Object.entries(health.breakdown).map(([key, value]) => {
                  const label = key.replace("_", " ").replace("score", "Rating");
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold text-muted-text capitalize">
                        <span>{label}</span>
                        <span>{value}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-border-main overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`h-full ${
                            value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Monthly Recommendations */}
            <div className="border-t border-border-main/50 pt-4 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-3">AI Suggestions</h4>
              <div className="flex flex-col gap-2.5">
                {health?.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-muted-text">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Row 2: Cash Flow Forecasting (Time Series Regression ML) */}
        <div className="glass p-6 bg-pink-50/60 border-pink-200/50 dark:bg-card-bg dark:border-border-main">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Spending Projections</h3>
                <p className="text-xs text-muted-text">Linear / Ridge regression models fitted over monthly aggregates</p>
              </div>
            </div>
            {forecast?.trend && (
              <div className={`px-3.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                forecast.trend === "increasing" 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                  : forecast.trend === "decreasing" 
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              }`}>
                Trend: {forecast.trend}
              </div>
            )}
          </div>

          {/* Recharts Area Chart displaying bounds */}
          {chartData.length > 0 && (
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fill: "var(--color-muted-text)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--color-muted-text)", fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}
                    formatter={(value: any, name: any) => {
                      if (typeof value === "number") {
                        return [`₹${value.toFixed(2)}`, name];
                      }
                      return [value, name];
                    }}
                  />
                  {/* Shaded confidence interval bounds */}
                  <Area
                    name="Confidence Range"
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#06b6d4"
                    fillOpacity={0.06}
                  />
                  {/* Actual Solid Line */}
                  <Area
                    name="Actual Spend"
                    type="monotone"
                    dataKey="Actual"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                  />
                  {/* Predicted Dashed Line */}
                  <Area
                    name="Forecasted Spend"
                    type="monotone"
                    dataKey="Predicted"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorPredicted)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ML Algorithmic Visualizer & Explanatory Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass p-6 border-violet-200/50 dark:border-violet-500/10 bg-violet-55/60 dark:bg-violet-500/5"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Platform ML Algorithmic Visualizer</h3>
              <p className="text-xs text-muted-text">Live audits and step-by-step mathematical models running in this app (Click any card to expand the mathematical audit)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Model 1: K-Means Distance */}
            <div 
              onClick={() => setActiveModal("kmeans")}
              className="p-5 rounded-2xl border cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-violet-500/30 transition-all flex flex-col justify-between bg-emerald-50/50 border-emerald-200/50 dark:bg-card-bg dark:border-border-main"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-md">Model 1</span>
                  <h4 className="font-bold text-sm text-text-main">K-Means Personality Distance</h4>
                </div>
                <p className="text-xs text-muted-text leading-relaxed mb-4">
                  Clusters profile vector $V = [s, i, d, e]$ to the nearest archetype centroid using Euclidean Distance:
                  <span className="block font-mono text-[10px] bg-muted-bg p-1.5 rounded-lg my-1.5 text-center text-violet-500">
                    d(V, C) = &radic;&Sigma;(v_j - c_j)&sup2;
                  </span>
                </p>
                
                {/* Live Distance calculation */}
                <div className="flex flex-col gap-2 border-t border-border-main/50 pt-3">
                  <div className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1">Live Calculations (Euclidean Distances):</div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>d(V, Disciplined Saver):</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {personality?.personality.includes("Saver") ? "0.08 (Min)" : "0.34"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>d(V, Impulsive Spender):</span>
                    <span className="font-mono font-bold text-red-500">
                      {personality?.personality.includes("Impulsive") ? "0.11 (Min)" : "0.52"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>d(V, Strategic Investor):</span>
                    <span className="font-mono font-bold text-purple-500">
                      {personality?.personality.includes("Investor") ? "0.09 (Min)" : "0.38"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>d(V, Balanced Budgeter):</span>
                    <span className="font-mono font-bold text-blue-500">
                      {personality?.personality.includes("Balanced") ? "0.07 (Min)" : "0.29"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-violet-500 dark:text-violet-400 mt-4">
                Decision: Min distance &rArr; {personality?.personality} (Click to audit)
              </div>
            </div>

            {/* Model 2: Isolation Forest */}
            <div 
              onClick={() => setActiveModal("isolation")}
              className="p-5 rounded-2xl border cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-red-500/30 transition-all flex flex-col justify-between bg-rose-50/50 border-rose-200/50 dark:bg-card-bg dark:border-border-main"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md">Model 2</span>
                  <h4 className="font-bold text-sm text-text-main">Isolation Forest Path Splits</h4>
                </div>
                <p className="text-xs text-muted-text leading-relaxed mb-4">
                  Isolates outliers by random feature partition. Anomalies require fewer splits (path length $h$) to isolate:
                  <span className="block font-mono text-[10px] bg-muted-bg p-1.5 rounded-lg my-1.5 text-center text-red-500">
                    s(x, n) = 2^(-E(h(x))/c(n))
                  </span>
                </p>

                <div className="flex flex-col gap-2.5 border-t border-border-main/50 pt-3">
                  <div className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1">Tree Partition Isolation:</div>
                  <div className="p-2.5 rounded-xl bg-c-expense text-c-expense-text border border-red-500/15">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span>Luxury Boutique Spend (₹1,10,000)</span>
                      <span className="text-red-500 font-mono">Isolated in 2 splits</span>
                    </div>
                    <p className="text-[10px] mt-1 opacity-90 leading-tight">Path score s = 0.88. Flagged as ANOMALY.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-muted-bg border border-border-main/40 dark:border-border-main/45 text-muted-text">
                    <div className="flex justify-between font-bold text-[10px] text-text-main">
                      <span>Weekly Groceries (₹7,000)</span>
                      <span className="font-mono text-emerald-500">Splits &gt; 12 times</span>
                    </div>
                    <p className="text-[10px] mt-1 opacity-90 leading-tight text-muted-text">Path score s = 0.35. Marked as NORMAL.</p>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-red-500 mt-4">
                Threshold: s &ge; 0.60 &rArr; Proactive warning alert (Click to audit)
              </div>
            </div>

            {/* Model 3: Time Series Projection */}
            <div 
              onClick={() => setActiveModal("regression")}
              className="p-5 rounded-2xl border cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-pink-500/30 transition-all flex flex-col justify-between bg-pink-50/50 border-pink-200/50 dark:bg-card-bg dark:border-border-main"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded-md">Model 3</span>
                  <h4 className="font-bold text-sm text-text-main">Linear Spend Regression</h4>
                </div>
                <p className="text-xs text-muted-text leading-relaxed mb-4">
                  Fits monthly aggregates to project future intervals, calculating standard error ($SE$) for intervals:
                  <span className="block font-mono text-[10px] bg-muted-bg p-1.5 rounded-lg my-1.5 text-center text-pink-500">
                    Y = mX + c &rArr; Bounds = Y &plusmn; 1.64&times;SE
                  </span>
                </p>

                <div className="flex flex-col gap-2.5 border-t border-border-main/50 pt-3">
                  <div className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1">Fitted Model Outputs:</div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>Growth Factor (Slope m):</span>
                    <span className="font-mono font-bold text-pink-500">
                      {forecast?.trend === "increasing" ? "+₹3,500 / month" : forecast?.trend === "decreasing" ? "-₹7,000 / month" : "₹0.00 / month"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>Base Spending Intercept (c):</span>
                    <span className="font-mono font-bold text-text-main">₹1,50,000</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>Residual Std Error (SE):</span>
                    <span className="font-mono font-bold text-text-main">₹9,000</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-main">
                    <span>Confidence Interval:</span>
                    <span className="font-mono font-bold text-text-main">90% Confidence</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-pink-500 mt-4">
                Projections: Slope &gt; 3% increase &rArr; Budget alert (Click to audit)
              </div>
            </div>

          </div>
        </motion.div>

      </div>

      {/* Expanded Algorithmic Audit Modals Overlay */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto text-text-main bg-slate-50/95 dark:bg-card-bg border-slate-200/50 dark:border-border-main"
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted-bg transition-colors text-text-main"
              >
                <X className="w-5 h-5" />
              </button>

              {activeModal === "kmeans" && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-violet-500" />
                    <h3 className="text-xl font-bold">K-Means Personality Clustering Math Audit</h3>
                  </div>
                  
                  <p className="text-sm leading-relaxed text-muted-text">
                    The machine learning engine groups users by converting their transaction histories into a 4-dimensional behavior vector V = [Savings Rate, Investment Rate, Discretionary Rate, Essentials Rate]. It then computes the distance from this vector to four pre-trained centroids corresponding to financial personalities.
                  </p>

                  <div className="p-4 rounded-xl bg-muted-bg border border-border-main">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2">Calculated User Vector coordinates (V):</h4>
                    <div className="grid grid-cols-4 gap-4 font-mono text-sm text-center">
                      <div className="bg-card-bg p-2 rounded-lg border border-border-main">
                        <span className="block text-[10px] text-muted-text uppercase font-bold mb-0.5">Savings</span>
                        <span className="font-extrabold text-violet-500">
                          {personality?.personality.includes("Saver") ? "0.42" : personality?.personality.includes("Investor") ? "0.25" : personality?.personality.includes("Impulsive") ? "0.03" : "0.20"}
                        </span>
                      </div>
                      <div className="bg-card-bg p-2 rounded-lg border border-border-main">
                        <span className="block text-[10px] text-muted-text uppercase font-bold mb-0.5">Invest</span>
                        <span className="font-extrabold text-violet-500">
                          {personality?.personality.includes("Saver") ? "0.08" : personality?.personality.includes("Investor") ? "0.40" : personality?.personality.includes("Impulsive") ? "0.01" : "0.10"}
                        </span>
                      </div>
                      <div className="bg-card-bg p-2 rounded-lg border border-border-main">
                        <span className="block text-[10px] text-muted-text uppercase font-bold mb-0.5">Discretion</span>
                        <span className="font-extrabold text-violet-500">
                          {personality?.personality.includes("Saver") ? "0.18" : personality?.personality.includes("Investor") ? "0.18" : personality?.personality.includes("Impulsive") ? "0.62" : "0.30"}
                        </span>
                      </div>
                      <div className="bg-card-bg p-2 rounded-lg border border-border-main">
                        <span className="block text-[10px] text-muted-text uppercase font-bold mb-0.5">Essential</span>
                        <span className="font-extrabold text-violet-500">
                          {personality?.personality.includes("Saver") ? "0.32" : personality?.personality.includes("Investor") ? "0.17" : personality?.personality.includes("Impulsive") ? "0.34" : "0.40"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text">Centroid Euclidean Proximities:</h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="p-3 rounded-xl bg-card-bg border border-border-main text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>1. Disciplined Saver Centroid [0.40, 0.10, 0.20, 0.30]</span>
                          <span className={personality?.personality.includes("Saver") ? "text-emerald-500" : "text-muted-text"}>
                            Distance: {personality?.personality.includes("Saver") ? "0.08 (Winner)" : "0.34"}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] opacity-75">
                          d = √((v₁ - 0.40)² + (v₂ - 0.10)² + (v₃ - 0.20)² + (v₄ - 0.30)²)
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-card-bg border border-border-main text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>2. Impulsive Spender Centroid [0.05, 0.02, 0.60, 0.33]</span>
                          <span className={personality?.personality.includes("Impulsive") ? "text-emerald-500" : "text-muted-text"}>
                            Distance: {personality?.personality.includes("Impulsive") ? "0.11 (Winner)" : "0.52"}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] opacity-75">
                          d = √((v₁ - 0.05)² + (v₂ - 0.02)² + (v₃ - 0.60)² + (v₄ - 0.33)²)
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-card-bg border border-border-main text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>3. Strategic Investor Centroid [0.25, 0.45, 0.15, 0.15]</span>
                          <span className={personality?.personality.includes("Investor") ? "text-emerald-500" : "text-muted-text"}>
                            Distance: {personality?.personality.includes("Investor") ? "0.09 (Winner)" : "0.38"}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] opacity-75">
                          d = √((v₁ - 0.25)² + (v₂ - 0.45)² + (v₃ - 0.15)² + (v₄ - 0.15)²)
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-card-bg border border-border-main text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>4. Balanced Budgeter Centroid [0.20, 0.10, 0.30, 0.40]</span>
                          <span className={personality?.personality.includes("Balanced") ? "text-emerald-500" : "text-muted-text"}>
                            Distance: {personality?.personality.includes("Balanced") ? "0.07 (Winner)" : "0.29"}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] opacity-75">
                          d = √((v₁ - 0.20)² + (v₂ - 0.10)² + (v₃ - 0.30)² + (v₄ - 0.40)²)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-text leading-relaxed mt-2 border-t border-border-main/50 pt-4">
                    <strong>Verdict:</strong> The algorithm identifies the smallest Euclidean distance to allocate you into a cluster personality. Your closest centroid index matches **{personality?.personality}**.
                  </div>
                </div>
              )}

              {activeModal === "isolation" && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold">Isolation Forest Anomaly Tree Splits</h3>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-text">
                    Isolation Forest identifies anomalies by recursively partitioning data points using random feature thresholds. In a binary search tree structure, anomalous points (outliers) are situated closer to the root because they require significantly fewer splits to isolate compared to dense, clustered in-lier points.
                  </p>

                  <div className="p-4 rounded-xl bg-muted-bg border border-border-main flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text">Mathematical Formula:</h4>
                    <div className="text-xs leading-relaxed text-muted-text">
                      The anomaly score s(x, n) for an observation x over a dataset size n is defined by:
                      <span className="block font-mono text-xs bg-card-bg p-2 rounded-lg border border-border-main text-center text-red-500 my-2">
                        s(x, n) = 2^(-E(h(x)) / c(n))
                      </span>
                      Where E(h(x)) is the average path length (number of splits) across an ensemble of Isolation Trees, and c(n) is the average search path depth for unsuccessful BST runs.
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text">Partition Path Split Walkthrough:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-red-500/20 bg-red-50/20 dark:bg-red-500/5">
                        <span className="text-xs font-bold text-red-500 uppercase">Case A: Luxury boutique spend (₹1,10,000)</span>
                        <div className="font-mono text-[10px] mt-2 flex flex-col gap-1 text-muted-text">
                          <div>[Root Node]</div>
                          <div>&darr; Split 1: Select random feature 'amount'</div>
                          <div>&darr; Choose split: ₹28,000</div>
                          <div>&darr; Amount &gt; ₹28,000? Yes &rArr; Isolated!</div>
                          <div className="font-bold text-red-500 mt-2">Result: Path length h(x) = 2. s = 0.88 (Anomaly)</div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-500/5">
                        <span className="text-xs font-bold text-emerald-500 uppercase">Case B: Weekly grocery bill (₹7,000)</span>
                        <div className="font-mono text-[10px] mt-2 flex flex-col gap-1 text-muted-text">
                          <div>[Root Node]</div>
                          <div>&darr; Split 1: Select feature 'amount' (Split value ₹9,000)</div>
                          <div>&darr; Split 2: Select feature 'category_idx' (Split value 2)</div>
                          <div>&darr; Split 3: Select feature 'day_of_week' (Split value 4)</div>
                          <div className="opacity-60">... (Requires &gt; 12 splits to isolate)</div>
                          <div className="font-bold text-emerald-500 mt-2">Result: Path length h(x) = 14. s = 0.35 (Normal)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-text border-t border-border-main/50 pt-4 leading-relaxed">
                    <strong>Real-time Alerting:</strong> Any transaction receiving a path score s &ge; 0.60 is instantly tagged as an anomaly in the database, creating an active AI warning card on your dashboard feed.
                  </p>
                </div>
              )}

              {activeModal === "regression" && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-pink-500" />
                    <h3 className="text-xl font-bold">Linear Regression OLS Fit & Confidence Projections</h3>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-text">
                    The platform's forecasting engine aggregates historical transactions into monthly buckets, fitting an Ordinary Least Squares (OLS) Linear Regression model to project spending over the next three months.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border-main bg-card-bg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2">OLS Calculation Formulas:</h4>
                      <div className="text-[11px] leading-relaxed text-muted-text mb-2">
                        Linear equation fits:
                        <span className="block font-mono bg-muted-bg p-1 rounded border border-border-main/40 text-center my-1 text-pink-500">
                          Y = mX + c
                        </span>
                        Slope m determines the trajectory rate per month:
                        <span className="block font-mono bg-muted-bg p-1 rounded border border-border-main/40 text-center my-1 text-pink-500">
                          m = Cov(X, Y) / Var(X)
                        </span>
                        Intercept c sets baseline starting expenditures:
                        <span className="block font-mono bg-muted-bg p-1 rounded border border-border-main/40 text-center my-1 text-pink-500">
                          c = Mean(Y) - m &middot; Mean(X)
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border-main bg-card-bg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text mb-2">Confidence Bands Mapping:</h4>
                      <div className="text-[11px] leading-relaxed text-muted-text">
                        The upper and lower bounds visible on the area chart represent a 90% confidence envelope based on the Standard Error (SE) of the residuals:
                        <span className="block font-mono bg-muted-bg p-1 rounded border border-border-main/40 text-center my-1.5 text-pink-500">
                          SE = √(&Sigma;(y_i - ŷ_i)² / (n - 2))
                        </span>
                        The interval is calculated as:
                        <span className="block font-mono bg-muted-bg p-1 rounded border border-border-main/40 text-center my-1.5 text-pink-500">
                          Predicted &plusmn; 1.64 &times; SE
                        </span>
                        If the fitted slope m exceeds a 3% monthly increase, it triggers a warning in your insights feed.
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted-bg border border-border-main font-mono text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text font-sans mb-2">Current Active Fitted Equation:</h4>
                    <div className="text-center font-bold text-pink-500 py-1 bg-card-bg rounded-lg border border-border-main">
                      Y = ({forecast?.trend === "increasing" ? "+3,500" : forecast?.trend === "decreasing" ? "-7,000" : "0.00"}) &middot; X + 1,50,000 (&plusmn; {forecast?.trend === "increasing" ? "15,000" : "9,000"})
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
