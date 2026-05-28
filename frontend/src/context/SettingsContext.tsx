"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";
type Language = "en" | "fr" | "es";

interface SettingsContextType {
  theme: Theme;
  toggleTheme: () => void;
  lang: Language;
  changeLanguage: (l: Language) => void;
  geminiKey: string;
  updateGeminiKey: (key: string) => void;
  translations: Record<string, string>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Premium localized dictionary mappings
const DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    analytics: "ML Analytics",
    transactions: "Transactions",
    subscriptions: "Subscriptions",
    advisor: "AI Advisor",
    settings: "Settings",
    netWorth: "Net Position",
    monthlyIncome: "Monthly Income",
    monthlyExpenses: "Monthly Expenses",
    savingsRate: "Savings Rate",
    recentActivity: "Recent Activity",
    aiInsights: "AI Behavior Insights",
    exportPDF: "Export PDF Report",
    logout: "Log Out",
    welcomeBack: "Welcome back",
    scanReceipt: "OCR Scanner",
    uploadCSV: "Upload CSV",
    voiceInput: "Voice Query",
    spendingPersonality: "Spending Personality",
    healthScore: "Financial Health Score"
  },
  fr: {
    dashboard: "Tableau de Bord",
    analytics: "Analyses ML",
    transactions: "Transactions",
    subscriptions: "Abonnements",
    advisor: "Conseiller IA",
    settings: "Paramètres",
    netWorth: "Position Nette",
    monthlyIncome: "Revenu Mensuel",
    monthlyExpenses: "Dépenses Mensuelles",
    savingsRate: "Taux d'Épargne",
    recentActivity: "Activité Récente",
    aiInsights: "Analyses de Comportement IA",
    exportPDF: "Exporter le rapport PDF",
    logout: "Se Déconnecter",
    welcomeBack: "Bon retour",
    scanReceipt: "Scanner OCR",
    uploadCSV: "Téléverser CSV",
    voiceInput: "Requête Vocale",
    spendingPersonality: "Personnalité de Dépense",
    healthScore: "Score de Santé Financière"
  },
  es: {
    dashboard: "Panel Control",
    analytics: "Análisis ML",
    transactions: "Transacciones",
    subscriptions: "Suscripciones",
    advisor: "Asesor IA",
    settings: "Ajustes",
    netWorth: "Posición Neta",
    monthlyIncome: "Ingresos Mensuales",
    monthlyExpenses: "Gastos Mensuales",
    savingsRate: "Tasa de Ahorro",
    recentActivity: "Actividad Reciente",
    aiInsights: "Perspectivas de IA",
    exportPDF: "Exportar Reporte PDF",
    logout: "Cerrar Sesión",
    welcomeBack: "Bienvenido de nuevo",
    scanReceipt: "Escáner OCR",
    uploadCSV: "Subir CSV",
    voiceInput: "Consulta de Voz",
    spendingPersonality: "Personalidad de Gasto",
    healthScore: "Puntuación de Salud Financiera"
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLang] = useState<Language>("en");
  const [geminiKey, setGeminiKey] = useState<string>("");

  useEffect(() => {
    // Load config from localStorage
    const savedTheme = localStorage.getItem("app-theme") as Theme;
    const savedLang = localStorage.getItem("app-lang") as Language;
    const savedKey = localStorage.getItem("app-gemini-key") || "";

    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark mode for exceptional aesthetics
      setTheme("dark");
    }

    if (savedLang) setLang(savedLang);
    if (savedKey) setGeminiKey(savedKey);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const changeLanguage = (l: Language) => {
    setLang(l);
    localStorage.setItem("app-lang", l);
  };

  const updateGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem("app-gemini-key", key);
  };

  const translations = DICTIONARY[lang];

  return (
    <SettingsContext.Provider
      value={{
        theme,
        toggleTheme,
        lang,
        changeLanguage,
        geminiKey,
        updateGeminiKey,
        translations
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
