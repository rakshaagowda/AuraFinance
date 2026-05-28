"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  UploadCloud, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  Loader2,
  Calendar,
  X,
  FileText
} from "lucide-react";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  is_anomaly: boolean;
  anomaly_score: number;
}

const CATEGORIES = [
  "Food",
  "Utilities",
  "Entertainment",
  "Investment",
  "Shopping",
  "Housing",
  "Travel",
  "Income",
  "Debt"
];

export default function TransactionsPage() {
  const { apiFetch, loading: authLoading } = useAuth();
  const { translations } = useSettings();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form Fields
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("Food");
  const [dateVal, setDateVal] = useState(new Date().toISOString().split("T")[0]);
  const [txType, setTxType] = useState("debit");

  // Filters
  const [selectedCat, setSelectedCat] = useState<string>("");

  const csvInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      loadTransactions();
    }
  }, [authLoading, selectedCat]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let endpoint = "/transactions/";
      if (selectedCat) {
        endpoint += `?category=${selectedCat}`;
      }
      const res = await apiFetch(endpoint);
      setTransactions(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amt) return;
    
    try {
      const payload = {
        description: desc,
        amount: parseFloat(amt),
        category: cat,
        date: dateVal,
        type: txType
      };
      
      await apiFetch("/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      setMsg({ text: "Transaction added successfully!", type: "success" });
      setDesc("");
      setAmt("");
      setFormOpen(false);
      loadTransactions();
    } catch (e) {
      setMsg({ text: "Failed to add transaction.", type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: "DELETE" });
      setMsg({ text: "Transaction deleted.", type: "success" });
      loadTransactions();
    } catch (e) {
      setMsg({ text: "Failed to delete.", type: "error" });
    }
  };

  // CSV Statement Uploader
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingCSV(true);
    setMsg(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await apiFetch("/transactions/upload-statement", {
        method: "POST",
        body: formData
      });
      setMsg({ text: res.detail || "Statement uploaded successfully!", type: "success" });
      loadTransactions();
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to process CSV file.", type: "error" });
    } finally {
      setUploadingCSV(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // OCR Receipt Scanner
  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setScanningReceipt(true);
    setMsg(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await apiFetch("/transactions/scan-receipt", {
        method: "POST",
        body: formData
      });
      
      // Autofill fields based on OCR response
      setDesc(res.merchant);
      setAmt(res.amount.toString());
      setCat(res.category);
      setDateVal(res.date);
      setTxType("debit"); // Receipts are always expenses
      
      setFormOpen(true); // Open form to let user check
      setMsg({ text: `OCR scan finished! Confidence: ${Math.round(res.confidence * 100)}%. Form autofilled.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: "Failed to scan receipt image.", type: "error" });
    } finally {
      setScanningReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Messages */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
                msg.type === "success" 
                  ? "bg-c-income text-c-income-text border-emerald-500/20" 
                  : "bg-c-expense text-c-expense-text border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {msg.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <span>{msg.text}</span>
              </div>
              <button onClick={() => setMsg(null)} className="p-1 hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-md"
            >
              <Plus className="w-5 h-5" /> Add Transaction
            </button>
            
            {/* CSV Trigger */}
            <input 
              type="file" 
              accept=".csv" 
              ref={csvInputRef} 
              onChange={handleCSVUpload} 
              className="hidden" 
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={uploadingCSV}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border-main bg-card-bg hover:bg-muted-bg text-sm font-semibold transition-all disabled:opacity-50"
            >
              {uploadingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 text-violet-500" />}
              {translations.uploadCSV}
            </button>

            {/* OCR Scan Trigger */}
            <input 
              type="file" 
              accept="image/*" 
              ref={receiptInputRef} 
              onChange={handleReceiptScan} 
              className="hidden" 
            />
            <button
              onClick={() => receiptInputRef.current?.click()}
              disabled={scanningReceipt}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border-main bg-card-bg hover:bg-muted-bg text-sm font-semibold transition-all disabled:opacity-50"
            >
              {scanningReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-pink-500" />}
              {translations.scanReceipt}
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-card-bg border border-border-main rounded-xl px-4 py-2">
            <Filter className="w-4 h-4 text-muted-text" />
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-text-main"
            >
              <option value="" className="bg-card-bg text-text-main">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-card-bg text-text-main">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Form Overlay Panel */}
        <AnimatePresence>
          {formOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass p-6 w-full max-w-md shadow-2xl relative bg-violet-50/95 dark:bg-card-bg border-violet-200/50 dark:border-border-main"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Add Transaction</h3>
                  <button onClick={() => setFormOpen(false)} className="p-1.5 hover:bg-muted-bg rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
                  {/* Desc */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted-text uppercase">Description / Merchant</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starbucks, Salary deposit"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted-text uppercase">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amt}
                        onChange={(e) => setAmt(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                    {/* Date */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-muted-text uppercase">Date</label>
                      <input
                        type="date"
                        required
                        value={dateVal}
                        onChange={(e) => setDateVal(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-muted-text uppercase">Category</label>
                      <select
                        value={cat}
                        onChange={(e) => setCat(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 cursor-pointer text-text-main"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c} className="bg-card-bg text-text-main">{c}</option>
                        ))}
                      </select>
                    </div>
                    {/* Type */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-muted-text uppercase">Type</label>
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border-main bg-input-bg text-sm outline-none focus:border-violet-500 cursor-pointer text-text-main"
                      >
                        <option value="debit" className="bg-card-bg text-text-main">Debit (Expense)</option>
                        <option value="credit" className="bg-card-bg text-text-main">Credit (Income)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 mt-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg transition-all"
                  >
                    Commit Entry
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Transactions Table Grid */}
        <div className="glass p-6 bg-violet-50/50 border-violet-200/50 dark:bg-card-bg dark:border-border-main">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border-main text-xs uppercase font-bold text-muted-text">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-muted-bg/30 transition-colors">
                    <td className="py-3.5 pr-2 text-muted-text font-semibold whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3.5 pr-2 font-medium max-w-[220px] truncate">
                      <span className="block font-bold">{tx.description}</span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                        tx.type === "credit" ? "bg-c-income text-c-income-text" : "bg-muted-bg text-muted-text"
                      }`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-extrabold whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className={tx.type === "credit" ? "text-c-income-text" : "text-text-main"}>
                          {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                        </span>
                        {tx.is_anomaly && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase tracking-wider mt-0.5 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                            Anomaly Flagged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50/10 text-muted-text hover:text-red-500 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-violet-500" />
                    </td>
                  </tr>
                )}
                {!loading && transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-text">
                      No transactions recorded. Add some manually or upload statements above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
