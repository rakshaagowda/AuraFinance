import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Token dynamically into every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vaultiq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Services
export const authAPI = {
  register: (username, password) => api.post('/api/auth/register', { username, password }),
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  getProfile: () => api.get('/api/auth/me'),
  updateKeys: (openaiKey, geminiKey) => api.put('/api/auth/keys', { openai_key: openaiKey, gemini_key: geminiKey }),
};

// Document & Folder Services
export const documentAPI = {
  createFolder: (name) => api.post('/api/docs/folders', { name }),
  getFolders: () => api.get('/api/docs/folders'),
  deleteFolder: (folderId) => api.delete(`/api/docs/folders/${folderId}`),
  
  upload: (file, folderId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId !== null) {
      formData.append('folder_id', folderId);
    }
    return api.post('/api/docs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  list: (folderId = null) => {
    const params = folderId !== null ? { folder_id: folderId } : {};
    return api.get('/api/docs', { params });
  },
  
  delete: (docId) => api.delete(`/api/docs/${docId}`),
  
  move: (docId, folderId) => api.put(`/api/docs/${docId}/move`, { folder_id: folderId }),
  
  compare: (docId1, docId2) => api.post('/api/docs/compare', { doc_id_1: docId1, doc_id_2: docId2 }),
};

// Query & Chat Services
export const queryAPI = {
  ask: (question, documentIds = null) => api.post('/api/query/ask', { question, document_ids: documentIds }),
  getHistory: (scope = 'all') => api.get('/api/query/chat-history', { params: { document_scope: scope } }),
  clearHistory: (scope = 'all') => api.delete('/api/query/chat-history', { params: { document_scope: scope } }),
};

export default api;
