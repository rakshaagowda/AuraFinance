import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Key, Info, CheckCircle, ShieldAlert } from 'lucide-react';

const Settings = () => {
  const { user, updateApiKeys } = useAuth();
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Load existing user settings keys
  useEffect(() => {
    if (user) {
      setOpenaiKey(user.openai_key || '');
      setGeminiKey(user.gemini_key || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await updateApiKeys(openaiKey, geminiKey);
      setStatusMsg({ type: 'success', text: 'API Keys updated successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update keys.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">System Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Configure LLM providers and view system status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keys config panel */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Key className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-lg text-gray-100">LLM Provider API Keys</h3>
          </div>

          {statusMsg.text && (
            <div className={`px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <p>{statusMsg.text}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-200">Google Gemini API Key</label>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase">Recommended</span>
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={user?.gemini_key ? "••••••••••••••••••••••••" : "AIzaSy..."}
                className="w-full glass-input"
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Gemini API powers document summarization, single-file chat, and document comparison. Obtain a key from Google AI Studio.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={user?.openai_key ? "••••••••••••••••••••••••" : "sk-proj-..."}
                className="w-full glass-input"
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Allows VaultIQ to generate responses using OpenAI models like `gpt-4o-mini`. Obtain a key from the OpenAI Developer Platform.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium px-6 py-3 text-white disabled:opacity-50 select-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Keys
                </>
              )}
            </button>
          </form>
        </div>

        {/* Architecture details panel */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 h-fit">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Info className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-lg text-gray-100">System Architecture</h3>
          </div>

          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div>
              <h4 className="font-bold text-gray-100 text-sm mb-1">Vector Indexing</h4>
              <p>Embeddings are generated locally on the server CPU using the <b>sentence-transformers/all-MiniLM-L6-v2</b> model (384 dimensions). This process is offline and fully private.</p>
            </div>

            <div>
              <h4 className="font-bold text-gray-100 text-sm mb-1">Vector Storage</h4>
              <p>Text chunks are indexed in an offline <b>ChromaDB</b> collection, isolated with metadata filters containing your user signature.</p>
            </div>

            <div>
              <h4 className="font-bold text-gray-100 text-sm mb-1">Generative Answers</h4>
              <p>VaultIQ performs Maximal Marginal Relevance (MMR) retrieval to extract candidate chunks, formats them as context, and routes queries to your selected cloud LLM (Gemini or OpenAI) to generate cited responses.</p>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Database Engine:</span>
                <span className="text-emerald-400 font-bold font-mono">SQLite 3</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Vector Store:</span>
                <span className="text-emerald-400 font-bold font-mono">ChromaDB</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Embeddings Run:</span>
                <span className="text-sky-400 font-bold font-mono">Local CPU</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
