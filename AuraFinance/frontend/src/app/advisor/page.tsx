"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  MessageSquareCode, 
  Brain,
  HelpCircle,
  Cpu,
  Loader2
} from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "advisor";
  text: string;
  source?: "local" | "gemini";
}

const TEMPLATES = [
  "Can I afford a ₹15,000 purchase?",
  "Where am I overspending the most?",
  "Tell me about my spending personality.",
  "What is my financial health grade?"
];

export default function AdvisorPage() {
  const { apiFetch, loading: authLoading } = useAuth();
  const { translations, geminiKey } = useSettings();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "advisor",
      text: "Hello! I am your AI Financial Behavior Advisor. I can audit your current balance sheets, look for category overspending, and answer questions. Ask me anything!",
      source: "local"
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";
        
        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInputMsg(text);
          setListening(false);
        };
        
        rec.onerror = () => {
          setListening(false);
        };
        
        rec.onend = () => {
          setListening(false);
        };
        
        setRecognition(rec);
      }
    }
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    // Add user message
    const userMsgObj: Message = {
      id: Date.now(),
      sender: "user",
      text: textToSend
    };
    setMessages(prev => [...prev, userMsgObj]);
    setInputMsg("");
    setSending(true);
    
    try {
      // Pass Gemini Key in headers if available in SettingsContext
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (geminiKey) {
        headers["x-gemini-key"] = geminiKey;
      }
      
      const res = await apiFetch("/advisor/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: textToSend })
      });
      
      const advisorMsgObj: Message = {
        id: Date.now() + 1,
        sender: "advisor",
        text: res.response,
        source: res.source
      };
      setMessages(prev => [...prev, advisorMsgObj]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "advisor",
          text: "Sorry, I encountered an error connecting to the intelligence server. Verify the server is running."
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const toggleListen = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge!");
      return;
    }
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      setListening(true);
      recognition.start();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 h-[80vh]">
        
        {/* Intelligence Mode Status Card */}
        <div className="glass px-6 py-4 flex items-center justify-between gap-4 bg-emerald-50/80 dark:bg-card-bg border-emerald-200/50 dark:border-border-main">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              geminiKey ? "bg-pink-500/10 text-pink-500" : "bg-violet-500/10 text-violet-500"
            }`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Advisor Intelligence Engine</span>
              <h4 className="font-bold text-sm">
                {geminiKey ? "Google Gemini LLM Generative AI Active" : "Local Analytics NLP Fallback Mode"}
              </h4>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            geminiKey 
              ? "bg-pink-500/10 text-pink-500 border border-pink-500/20" 
              : "bg-violet-500/10 text-violet-500 border border-violet-500/20"
          }`}>
            {geminiKey ? "GEMINI" : "LOCAL"}
          </span>
        </div>

        {/* Chat Messages Log Wrapper */}
        <div className="glass flex-1 p-6 flex flex-col justify-between min-h-0 bg-violet-50/40 dark:bg-card-bg border-violet-200/40 dark:border-border-main">
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 mb-6">
            {messages.map((m) => {
              const isAdvisor = m.sender === "advisor";
              return (
                <div 
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    isAdvisor ? "mr-auto items-start" : "ml-auto flex-row-reverse items-end"
                  }`}
                >
                  {isAdvisor && (
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-slate-700 border border-border-main flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-violet-500" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isAdvisor 
                        ? "bg-muted-bg text-text-main rounded-tl-none border border-border-main" 
                        : "bg-violet-600 text-white rounded-br-none font-medium"
                    }`}>
                      {m.text}
                    </div>
                    {isAdvisor && m.source && (
                      <span className="text-[9px] text-muted-text uppercase tracking-wider font-semibold ml-2">
                        Parsed via: {m.source} intelligence
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {sending && (
              <div className="flex gap-3 mr-auto items-start max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-slate-700 border border-border-main flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-violet-500" />
                </div>
                <div className="p-4 rounded-2xl bg-muted-bg text-muted-text rounded-tl-none border border-border-main flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  <span className="text-xs font-semibold">Auditing balance sheets...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick templates wrapper */}
          <div className="flex flex-wrap gap-2.5 mb-4">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl}
                onClick={() => handleSendMessage(tmpl)}
                className="px-3 py-1.5 rounded-xl border border-border-main hover:border-violet-500 bg-card-bg hover:bg-muted-bg text-xs font-semibold text-muted-text hover:text-text-main transition-colors text-left"
              >
                {tmpl}
              </button>
            ))}
          </div>

          {/* Input text bar */}
          <div className="flex items-center gap-3">
            {/* Mic Trigger */}
            <button
              onClick={toggleListen}
              className={`p-3.5 rounded-xl border border-border-main transition-all ${
                listening 
                  ? "bg-red-500 border-red-500 text-white animate-pulse" 
                  : "bg-card-bg hover:bg-muted-bg text-muted-text"
              }`}
              title={listening ? "Recording voice..." : "Voice input"}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-violet-500" />}
            </button>

            {/* Input field */}
            <input
              type="text"
              placeholder={listening ? "Listening to query..." : "Ask your financial behavior advisor..."}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage(inputMsg);
              }}
              className="flex-1 px-4 py-3.5 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 transition-colors"
            />

            {/* Send button */}
            <button
              onClick={() => handleSendMessage(inputMsg)}
              className="p-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
