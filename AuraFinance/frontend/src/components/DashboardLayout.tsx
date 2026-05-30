"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  BarChart3, 
  Receipt, 
  CalendarClock, 
  MessageSquareCode, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Languages, 
  Download, 
  User, 
  Loader2, 
  Sparkles,
  Menu,
  X
} from "lucide-react";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, apiFetch } = useAuth();
  const { theme, toggleTheme, lang, changeLanguage, translations } = useSettings();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const navItems = [
    { name: translations.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: translations.analytics, href: "/analytics", icon: BarChart3 },
    { name: translations.transactions, href: "/transactions", icon: Receipt },
    { name: translations.subscriptions, href: "/subscriptions", icon: CalendarClock },
    { name: translations.advisor, href: "/advisor", icon: MessageSquareCode },
    { name: translations.settings, href: "/settings", icon: Settings },
  ];

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await apiFetch("/reports/pdf");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AI_Financial_Report_${user?.id || "user"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF report. Ensure backend is running.");
    } finally {
      setDownloading(false);
    }
  };

  const getPersonalityColor = (personality: string) => {
    const p = personality?.toLowerCase() || "";
    if (p.includes("saver")) return "bg-c-income text-c-income-text border border-c-income-text/20";
    if (p.includes("impulsive")) return "bg-c-expense text-c-expense-text border border-c-expense-text/20";
    if (p.includes("investor")) return "bg-c-purple text-c-purple-text border border-c-purple-text/20";
    return "bg-c-info text-c-info-text border border-c-info-text/20";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-6">
      {/* Upper Section */}
      <div>
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-500 to-pink-400 shadow-md">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            AuraFinance
          </span>
        </div>

        {/* User Card */}
        <div className="mb-6 p-4 rounded-2xl bg-violet-100/50 border border-violet-200/40 dark:bg-muted-bg dark:border-border-main flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-slate-700 flex items-center justify-center border border-border-main">
              <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate leading-tight">{user?.email.split("@")[0]}</p>
              <p className="text-xs text-muted-text truncate">{user?.email}</p>
            </div>
          </div>
          <div className={`mt-2 py-1 px-3 rounded-lg text-center text-xs font-semibold ${getPersonalityColor(user?.spending_personality || "")}`}>
            {user?.spending_personality || "Balanced Budgeter"}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? "bg-primary-main text-primary-text font-semibold shadow-md shadow-violet-500/10" 
                    : "text-muted-text hover:bg-muted-bg hover:text-text-main"
                }`}>
                  <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-primary-text" : "text-muted-text"}`} />
                  {item.name}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute left-0 w-1 h-6 bg-secondary-main rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-3">
        {/* PDF Exporter Button */}
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-border-main bg-card-bg hover:bg-muted-bg text-sm font-semibold transition-all disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-text" />
          ) : (
            <Download className="w-4 h-4 text-violet-500" />
          )}
          {translations.exportPDF}
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/10 hover:text-red-400 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          {translations.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-bg-main text-text-main overflow-hidden">
      {/* Desktop Sidebar (Left Panel) */}
      <aside className="hidden md:block w-72 bg-violet-50/80 border-r border-violet-200/50 dark:bg-card-bg dark:border-border-main h-full shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Navigation */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-violet-50/80 border-b border-violet-200/50 dark:bg-card-bg dark:border-border-main sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-500" />
          <span className="font-bold tracking-tight bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
            AuraFinance
          </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 hover:bg-muted-bg rounded-lg">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            className="md:hidden fixed inset-0 z-40 bg-violet-50/95 border-r border-violet-200/50 dark:bg-card-bg dark:border-border-main w-80 h-full shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 bg-bg-main/80 backdrop-blur-md border-b border-border-main px-6 py-4 flex items-center justify-between z-10">
          <h1 className="text-lg font-bold capitalize tracking-wide hidden md:block">
            {pathname.replace("/", "").replace("-", " ") || "AuraFinance"}
          </h1>
          <div className="flex items-center gap-4 ml-auto">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 bg-card-bg border border-border-main rounded-xl px-3 py-1.5">
              <Languages className="w-4 h-4 text-muted-text" />
              <select
                value={lang}
                onChange={(e) => changeLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-text-main"
              >
                <option value="en" className="bg-card-bg text-text-main">EN</option>
                <option value="fr" className="bg-card-bg text-text-main">FR</option>
                <option value="es" className="bg-card-bg text-text-main">ES</option>
              </select>
            </div>

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border-main bg-card-bg hover:bg-muted-bg transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-violet-600" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>
          </div>
        </header>

        {/* Active Page Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
