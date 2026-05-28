import React, { useState, useEffect, useRef } from 'react';
import { documentAPI } from '../services/api';
import { 
  UploadCloud, 
  FolderPlus, 
  Folder, 
  FileText, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  FolderTree,
  Coins,
  Activity,
  Layers,
  Sparkles,
  Move,
  X
} from 'lucide-react';

const Dashboard = () => {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(''); // 'uploading', 'parsing', 'summarizing', ''
  const [activeSummaryDoc, setActiveSummaryDoc] = useState(null); // Document object for summary modal
  const [showMoveDropdownDocId, setShowMoveDropdownDocId] = useState(null); // Track which file is moving
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const foldersRes = await documentAPI.getFolders();
      setFolders(foldersRes.data);
      const docsRes = await documentAPI.list();
      setDocuments(docsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setErrorMsg("Failed to retrieve dashboard assets.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await documentAPI.createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
      setSuccessMsg(`Folder "${newFolderName}" created successfully.`);
      const foldersRes = await documentAPI.getFolders();
      setFolders(foldersRes.data);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to create folder.");
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Are you sure you want to delete the folder "${folderName}"? Associated documents will not be deleted; they will be moved to the root files directory.`)) {
      return;
    }
    try {
      await documentAPI.deleteFolder(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      setSuccessMsg(`Folder "${folderName}" deleted.`);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to delete folder.");
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      triggerUpload(droppedFile);
    } else {
      setErrorMsg("Only PDF files are supported.");
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      triggerUpload(selectedFile);
    }
  };

  const triggerUpload = async (file) => {
    setUploadStatus('uploading');
    setErrorMsg('');
    
    // Simulating sub-status messages for better UX
    const statusSequence = [
      { text: 'Ingesting PDF data...', delay: 0 },
      { text: 'Parsing text and formatting tables...', delay: 2000 },
      { text: 'Running local SentenceTransformers embeddings...', delay: 4000 },
      { text: 'Generating AI Executive Summary...', delay: 6500 },
      { text: 'Finalizing vector persistence...', delay: 9000 }
    ];

    statusSequence.forEach(item => {
      setTimeout(() => {
        setUploadStatus(prev => prev ? item.text : '');
      }, item.delay);
    });

    try {
      await documentAPI.upload(file, selectedFolderId);
      setSuccessMsg(`Document "${file.name}" ingested and indexed successfully.`);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Ingestion workflow failed. Please verify PDF content or API Keys.");
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently erase the document vectors and local file.`)) {
      return;
    }
    try {
      await documentAPI.delete(docId);
      setSuccessMsg(`Erase complete: "${name}" removed.`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg("Deletion process failed.");
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleMoveDocument = async (docId, folderId) => {
    try {
      await documentAPI.move(docId, folderId);
      setSuccessMsg("Document relocated.");
      setShowMoveDropdownDocId(null);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg("Failed to move document.");
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Filter documents based on selection
  const filteredDocs = selectedFolderId === null
    ? documents
    : documents.filter(doc => doc.folder_id === selectedFolderId);

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Upload Overlay blur backdrop */}
      {uploadStatus && (
        <div className="fixed inset-0 bg-[#07090e]/85 backdrop-blur-md flex items-center justify-center z-50">
          <div className="max-w-md w-full glass-card p-8 rounded-3xl text-center space-y-6 border border-sky-500/20 shadow-[0_0_50px_rgba(56,189,248,0.15)]">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-sky-500/10 border-t-sky-400 animate-spin" />
              <div className="absolute inset-2.5 rounded-full border-4 border-purple-500/10 border-b-purple-400 animate-spin [animation-direction:reverse]" />
              <UploadCloud className="absolute inset-0 m-auto w-7 h-7 text-sky-400 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-xl text-gray-100">Document Ingestion Pipeline</h3>
              <p className="text-sm font-semibold text-sky-400 font-mono tracking-wide animate-pulse">
                {uploadStatus}
              </p>
            </div>
            <p className="text-[11px] text-gray-500">VaultIQ is extracting text blocks, creating embeddings locally, index storing in ChromaDB, and summarizing PDF sections.</p>
          </div>
        </div>
      )}

      {/* Header and statistics widgets */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Document Vault</h2>
          <p className="text-sm text-gray-400 mt-1">Manage files and index structures</p>
        </div>
        
        {/* Dynamic statistics */}
        <div className="flex items-center gap-4 bg-[#0e1322]/60 border border-white/5 p-3 rounded-2xl backdrop-blur">
          <div className="flex items-center gap-2.5 px-3 border-r border-white/5">
            <Layers className="w-4 h-4 text-sky-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Documents</p>
              <p className="text-sm font-extrabold text-gray-200">{documents.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 border-r border-white/5">
            <FolderTree className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Folders</p>
              <p className="text-sm font-extrabold text-gray-200">{folders.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">DB Schema</p>
              <p className="text-sm font-extrabold text-gray-200">ChromaDB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications banner */}
      {successMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: Folders Navigation tree */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FolderTree className="w-4 h-4" /> Organization
              </span>
              {!isCreatingFolder ? (
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> Add
                </button>
              ) : (
                <button 
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-400"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Folder creation box */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  autoFocus
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500/50"
                />
                <button 
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                >
                  Save
                </button>
              </form>
            )}

            {/* Navigation Folders list */}
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedFolderId === null 
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4 shrink-0" />
                  All Files
                </span>
                <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400">
                  {documents.length}
                </span>
              </button>

              {folders.map(folder => {
                const folderDocsCount = documents.filter(d => d.folder_id === folder.id).length;
                return (
                  <div key={folder.id} className="group flex items-center justify-between rounded-xl hover:bg-white/5 transition-all">
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-all ${
                        selectedFolderId === folder.id 
                          ? 'text-sky-400 font-bold border-l-2 border-sky-400 pl-2' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Folder className={`w-4 h-4 shrink-0 ${selectedFolderId === folder.id ? 'text-sky-400' : 'text-gray-500 group-hover:text-gray-400'}`} />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    
                    <div className="flex items-center pr-2 gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500">
                        {folderDocsCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id, folder.name);
                        }}
                        className="text-gray-600 hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Drag-drop uploads and Document Listings */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* File Upload drag area */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="border border-dashed border-white/10 hover:border-sky-500/40 rounded-3xl p-8 bg-[#0b0f19]/30 hover:bg-[#0e1322]/40 backdrop-blur cursor-pointer text-center space-y-3 transition-all duration-300"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-105">
              <UploadCloud className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="font-bold text-gray-200 text-sm">Drag and drop document, or click to upload</p>
              <p className="text-xs text-gray-500 mt-1">Accepts PDF documents up to 25MB</p>
            </div>
            {selectedFolderId !== null && (
              <span className="inline-block text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold">
                Target Folder: {folders.find(f => f.id === selectedFolderId)?.name}
              </span>
            )}
          </div>

          {/* Files List panel */}
          <div className="space-y-3">
            <h3 className="font-bold text-base text-gray-200">
              {selectedFolderId === null ? 'All Vault Files' : `Files in "${folders.find(f => f.id === selectedFolderId)?.name}"`}
            </h3>

            {loading ? (
              // Loading placeholders skeleton
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 w-full glass-card rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              // Empty State UI
              <div className="glass-card rounded-2xl p-12 text-center border border-white/5 space-y-3">
                <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                <div>
                  <p className="font-semibold text-gray-400 text-sm">No files uploaded yet</p>
                  <p className="text-xs text-gray-500">Drop a PDF above to begin vector indexing and RAG pipeline setup.</p>
                </div>
              </div>
            ) : (
              // Document Table row list
              <div className="space-y-3">
                {filteredDocs.map(doc => (
                  <div 
                    key={doc.id}
                    className="glass-card rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4 transition-all duration-300 hover:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/5 border border-sky-500/15 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-200 truncate pr-4">{doc.original_name}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Utilities panel */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Summarize button */}
                      <button
                        onClick={() => setActiveSummaryDoc(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 font-bold text-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Summarize
                      </button>

                      {/* Move Folder trigger dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowMoveDropdownDocId(showMoveDropdownDocId === doc.id ? null : doc.id)}
                          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors"
                          title="Move to Folder"
                        >
                          <Move className="w-4 h-4" />
                        </button>
                        
                        {showMoveDropdownDocId === doc.id && (
                          <div className="absolute right-0 mt-2 w-48 glass-card border border-white/10 rounded-xl py-1 shadow-2xl z-20">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Move Document</p>
                            <button
                              onClick={() => handleMoveDocument(doc.id, null)}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-sky-400 flex items-center gap-2"
                            >
                              <Folder className="w-3.5 h-3.5 shrink-0" /> Root Files
                            </button>
                            {folders.filter(f => f.id !== doc.folder_id).map(folder => (
                              <button
                                key={folder.id}
                                onClick={() => handleMoveDocument(doc.id, folder.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 hover:text-sky-400 flex items-center gap-2 truncate"
                              >
                                <Folder className="w-3.5 h-3.5 shrink-0" /> {folder.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.original_name)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY MODAL VIEW */}
      {activeSummaryDoc && (
        <div className="fixed inset-0 bg-[#07090e]/80 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="w-full max-w-2xl h-screen bg-[#0b0f19] border-l border-white/10 shadow-2xl flex flex-col p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4 shrink-0">
              <div>
                <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 w-fit mb-1.5">
                  <Sparkles className="w-3 h-3" /> AI Analysis
                </span>
                <h3 className="font-extrabold text-xl text-gray-100 truncate max-w-lg">{activeSummaryDoc.original_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ingested: {new Date(activeSummaryDoc.created_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setActiveSummaryDoc(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll content */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="markdown-body bg-black/20 p-5 rounded-2xl border border-white/5 min-h-[300px]">
                {/* Parse summary markdown spacing */}
                {activeSummaryDoc.summary.split('\n').map((line, idx) => {
                  if (line.startsWith('## ')) {
                    return <h3 key={idx} className="font-bold text-gray-100 text-lg border-b border-white/5 pb-1 mt-6 mb-2">{line.replace('## ', '')}</h3>;
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
                    return <li key={idx} className="text-xs text-gray-300 ml-4 my-1.5 list-disc">{line.replace(/^\* /, '').replace(/^\- /, '')}</li>;
                  }
                  if (line.trim() === '---') {
                    return <hr key={idx} className="border-white/5 my-4" />;
                  }
                  return line.trim() ? <p key={idx} className="text-xs text-gray-300 my-2 leading-relaxed">{line}</p> : null;
                })}
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="border-t border-white/5 pt-4 shrink-0 flex justify-end">
              <button
                onClick={() => setActiveSummaryDoc(null)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 px-5 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
