import React, { useState, useEffect } from 'react';
import { documentAPI } from '../services/api';
import { 
  GitCompare, 
  ArrowRightLeft, 
  Sparkles, 
  AlertCircle, 
  FileText,
  HelpCircle,
  X
} from 'lucide-react';

const DocumentCompare = () => {
  const [documents, setDocuments] = useState([]);
  const [doc1Id, setDoc1Id] = useState('');
  const [doc2Id, setDoc2Id] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [report, setReport] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDocumentsList();
  }, []);

  const fetchDocumentsList = async () => {
    setListLoading(true);
    try {
      const res = await documentAPI.list();
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve document assets for comparison selection.");
    } finally {
      setListLoading(false);
    }
  };

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!doc1Id || !doc2Id) {
      setErrorMsg("Please select two documents to compare.");
      return;
    }
    if (doc1Id === doc2Id) {
      setErrorMsg("Please select two distinct documents.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setReport('');

    try {
      const response = await documentAPI.compare(doc1Id, doc2Id);
      setReport(response.data.comparison_report);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Side-by-side comparison workflow failed. Please verify API Keys are active.");
    } finally {
      setLoading(false);
    }
  };

  const clearCompare = () => {
    setDoc1Id('');
    setDoc2Id('');
    setReport('');
    setErrorMsg('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Side-by-Side Comparison</h2>
        <p className="text-sm text-gray-400 mt-1">Select two documents to perform structured differences analysis using AI</p>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Selectors panel */}
      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
        <form onSubmit={handleCompare} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4">
            
            {/* File 1 selector */}
            <div className="md:col-span-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Document A</label>
              <div className="relative">
                <select
                  value={doc1Id}
                  onChange={(e) => setDoc1Id(e.target.value)}
                  disabled={loading || listLoading}
                  className="w-full glass-input appearance-none bg-black/40 pr-10 cursor-pointer"
                >
                  <option value="">-- Choose first PDF --</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.original_name}</option>
                  ))}
                </select>
                <FileText className="absolute right-4 top-3.5 w-4 h-4 text-sky-400 pointer-events-none" />
              </div>
            </div>

            {/* Compare visual separator */}
            <div className="md:col-span-1 flex justify-center pt-5">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sky-400">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>

            {/* File 2 selector */}
            <div className="md:col-span-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Document B</label>
              <div className="relative">
                <select
                  value={doc2Id}
                  onChange={(e) => setDoc2Id(e.target.value)}
                  disabled={loading || listLoading}
                  className="w-full glass-input appearance-none bg-black/40 pr-10 cursor-pointer"
                >
                  <option value="">-- Choose second PDF --</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.original_name}</option>
                  ))}
                </select>
                <FileText className="absolute right-4 top-3.5 w-4 h-4 text-purple-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Action triggers */}
          <div className="flex justify-end gap-3 pt-2">
            {(doc1Id || doc2Id || report) && (
              <button
                type="button"
                onClick={clearCompare}
                disabled={loading}
                className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Selection
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !doc1Id || !doc2Id}
              className="btn-premium px-6 py-2.5 text-white disabled:opacity-40"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  Compare Documents
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Comparison results report */}
      {report && (
        <div className="glass-card rounded-2xl p-8 border border-sky-500/10 shadow-[0_0_30px_rgba(56,189,248,0.05)] space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-100">Comparison Intelligence Report</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Computed side-by-side differences using RAG document records</p>
              </div>
            </div>
          </div>

          {/* Rendering the report content */}
          <div className="markdown-body bg-black/10 p-6 rounded-2xl border border-white/5">
            {report.split('\n').map((line, idx) => {
              if (line.startsWith('## ')) {
                return <h3 key={idx} className="font-bold text-gray-100 text-lg border-b border-white/5 pb-1 mt-6 mb-2">{line.replace('## ', '')}</h3>;
              }
              if (line.startsWith('# ')) {
                return <h2 key={idx} className="font-bold text-gray-100 text-xl border-b border-white/10 pb-2 mt-4 mb-3">{line.replace('# ', '')}</h2>;
              }
              if (line.startsWith('* **') || line.startsWith('- **')) {
                const cleanLine = line.replace(/^\* \*\*/, '').replace(/^\- \*\*/, '');
                const parts = cleanLine.split('**:');
                return (
                  <p key={idx} className="text-xs text-gray-300 my-2">
                    <strong className="text-sky-400">{parts[0]}:</strong>{parts[1]}
                  </p>
                );
              }
              if (line.startsWith('* ') || line.startsWith('- ')) {
                return <li key={idx} className="text-xs text-gray-300 ml-4 my-1 list-disc">{line.replace(/^\* /, '').replace(/^\- /, '')}</li>;
              }
              // Basic Table rendering support
              if (line.startsWith('|')) {
                const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
                if (line.includes('---')) return null; // Skip separators
                const isHeader = idx === report.split('\n').findIndex(l => l.startsWith('|')) ;
                return (
                  <div key={idx} className={`grid grid-cols-4 gap-2 py-2 border-b border-white/5 text-xs ${isHeader ? 'font-bold text-sky-400 border-white/10 bg-white/5 px-2 rounded-t-lg' : 'text-gray-300 px-2'}`}>
                    {cells.map((cell, cidx) => (
                      <span key={cidx} className="truncate" title={cell}>{cell}</span>
                    ))}
                  </div>
                );
              }
              if (line.trim() === '---') {
                return <hr key={idx} className="border-white/5 my-4" />;
              }
              return line.trim() ? <p key={idx} className="text-xs text-gray-300 my-2 leading-relaxed">{line}</p> : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentCompare;
