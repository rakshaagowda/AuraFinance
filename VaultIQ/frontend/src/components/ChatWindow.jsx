import React, { useState, useEffect, useRef } from 'react';
import { queryAPI, documentAPI } from '../services/api';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  FileText, 
  Layers, 
  Info,
  CheckCircle,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatWindow = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]); // List of document IDs active in query scope
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null); // Track clicked citation snippet

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDocumentsAndHistory();
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the chat list on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Sync document scoping and initial history
  const fetchDocumentsAndHistory = async () => {
    setListLoading(true);
    try {
      const docsRes = await documentAPI.list();
      setDocuments(docsRes.data);
      
      // Load general chat history by default
      const historyRes = await queryAPI.getHistory('all');
      setMessages(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  // Whenever user changes selected documents scope, fetch the chat history associated with that specific scope
  const handleScopeChange = async (docIds) => {
    setSelectedDocIds(docIds);
    setLoading(true);
    try {
      const scopeKey = docIds.length === 0 ? 'all' : docIds.sort().join(',');
      const historyRes = await queryAPI.getHistory(scopeKey);
      setMessages(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocSelection = (docId) => {
    const isSelected = selectedDocIds.includes(docId);
    let newSelection = [];
    if (isSelected) {
      newSelection = selectedDocIds.filter(id => id !== docId);
    } else {
      newSelection = [...selectedDocIds, docId];
    }
    handleScopeChange(newSelection);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userMessageText = inputVal.trim();
    setInputVal('');
    
    // Optimistic local update for User bubble
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);
    setActiveCitation(null);

    try {
      const response = await queryAPI.ask(userMessageText, selectedDocIds.length > 0 ? selectedDocIds : null);
      
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.answer,
        sources: JSON.stringify(response.data.citations),
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '⚠️ Failed to connect to VaultIQ RAG pipeline. Verify your LLM keys are configured in the Settings panel.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear chat history for the active document scope?")) {
      return;
    }
    try {
      const scopeKey = selectedDocIds.length === 0 ? 'all' : selectedDocIds.sort().join(',');
      await queryAPI.clearHistory(scopeKey);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] border border-white/5 bg-[#0b0f19]/35 rounded-3xl overflow-hidden backdrop-blur relative">
      
      {/* CHAT SCOPE SELECTOR TOP BAR */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#0b0f19]/70 backdrop-blur flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-gray-200">Chat Context Scope</h3>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-extrabold font-mono">MMR Retrieval</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {selectedDocIds.length === 0 
                ? 'All Vault Documents active' 
                : `Chat restricted to ${selectedDocIds.length} select file(s)`
              }
            </p>
          </div>
        </div>

        {/* Dropdown triggers for file selection */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowDocSelector(!showDocSelector)}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            Select Documents ({selectedDocIds.length})
          </button>
          
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Selector overlay dropdown panel */}
          {showDocSelector && (
            <div className="absolute right-0 top-10 w-72 glass-card border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3 z-30">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-gray-400">Restructure Scope</span>
                <button 
                  onClick={() => setShowDocSelector(false)}
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  Done
                </button>
              </div>

              {listLoading ? (
                <div className="w-full text-center py-4 text-xs text-gray-500">Loading files...</div>
              ) : documents.length === 0 ? (
                <div className="w-full text-center py-4 text-xs text-gray-500">No documents. Go to Dashboard to upload!</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {documents.map(doc => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <label 
                        key={doc.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors ${isChecked ? 'bg-sky-500/5 text-sky-400' : 'text-gray-400'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDocSelection(doc.id)}
                          className="rounded bg-black/40 border-white/10 text-sky-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-semibold truncate select-none">{doc.original_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MESSAGES CONVERSATION SCROLLING PANEL */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !loading ? (
          // Empty State Prompt suggestions
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-gray-300 text-sm">Ask anything about your document context</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                VaultIQ searches matching text chunks in vector space and returns compiled answers with citation sources.
              </p>
            </div>
            <div className="grid grid-cols-1 w-full gap-2 pt-2">
              <button 
                onClick={() => setInputVal("Summarize this document's main points")}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-sky-500/30 text-xs text-gray-400 hover:text-sky-400 transition-all font-semibold"
              >
                "Summarize this document's main points"
              </button>
              <button 
                onClick={() => setInputVal("What are the key deadlines and values mentioned?")}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-sky-500/30 text-xs text-gray-400 hover:text-sky-400 transition-all font-semibold"
              >
                "What are the key deadlines and values mentioned?"
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              // Parse sources JSON
              let sourcesList = [];
              if (!isUser && msg.sources) {
                try {
                  sourcesList = JSON.parse(msg.sources);
                } catch (e) {
                  sourcesList = [];
                }
              }

              return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  
                  {/* Left avatar icon */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-extrabold text-sm shrink-0">
                      VI
                    </div>
                  )}

                  <div className={`max-w-[75%] space-y-2`}>
                    {/* Message Bubble */}
                    <div className={`rounded-2xl p-4 text-xs leading-relaxed border ${
                      isUser 
                        ? 'bg-gradient-to-tr from-sky-500/10 to-sky-400/5 text-gray-100 border-sky-500/20 rounded-tr-none' 
                        : 'bg-[#111622]/80 border-white/5 rounded-tl-none text-gray-200'
                    }`}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Citations references display under AI bubble */}
                    {!isUser && sourcesList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 px-1.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">Sources Cited:</span>
                        {sourcesList.map((src) => (
                          <button
                            key={src.source_id}
                            onClick={() => setActiveCitation(src)}
                            className="inline-flex items-center gap-1 text-[10px] bg-sky-500/10 border border-sky-500/15 hover:bg-sky-500/20 hover:border-sky-500/40 text-sky-400 px-2 py-0.5 rounded font-bold transition-all"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            {src.filename.substring(0, 10)}... p.{src.page}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right avatar icon */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 font-bold text-xs shrink-0 select-none">
                      ME
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* AI Typing Indicator state */}
        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-extrabold text-sm shrink-0">
              VI
            </div>
            <div className="bg-[#111622]/80 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-1 shrink-0">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* FLOATING POPUP FOR CITATION SNIPPETS */}
      {activeCitation && (
        <div className="absolute bottom-24 left-6 right-6 glass-card border border-sky-500/30 rounded-2xl p-4 shadow-2xl z-30 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1 overflow-hidden">
            <div className="flex justify-between items-center pr-2">
              <span className="text-[10px] uppercase font-bold text-sky-400">Cited Extract (Page {activeCitation.page})</span>
              <span className="text-[10px] text-gray-500 truncate max-w-sm font-semibold">{activeCitation.filename}</span>
            </div>
            <p className="text-xs text-gray-300 leading-normal italic line-clamp-3 select-all">
              "{activeCitation.snippet}"
            </p>
          </div>
          <button 
            onClick={() => setActiveCitation(null)}
            className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TEXT INPUT CONTROLS BOTTOM PANEL */}
      <form 
        onSubmit={handleSend}
        className="p-4 border-t border-white/5 bg-[#0b0f19]/70 backdrop-blur shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
            placeholder={
              selectedDocIds.length === 0 
                ? "Ask a question about all document assets..."
                : `Ask a question about selected ${selectedDocIds.length} document(s)...`
            }
            className="w-full glass-input py-3.5 text-xs placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="btn-premium px-5 py-3 rounded-xl disabled:opacity-40 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

    </div>
  );
};

export default ChatWindow;
