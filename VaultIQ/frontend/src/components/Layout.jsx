import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  GitCompare, 
  Settings as SettingsIcon, 
  LogOut, 
  ShieldAlert,
  FolderOpen
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Document Compare', path: '/compare', icon: GitCompare },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#07090e] overflow-hidden text-gray-200">
      {/* Decorative subtle background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* Sidebar Section */}
      <aside className="w-64 border-r border-white/5 bg-[#0b0f19]/80 backdrop-blur-xl flex flex-col justify-between z-10">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-purple-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              V
            </div>
            <div>
              <h1 className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight">
                VaultIQ
              </h1>
              <p className="text-[10px] text-sky-400 font-bold tracking-widest uppercase">Document Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/10 to-purple-500/10 text-sky-400 border-l-2 border-sky-400 font-semibold pl-3.5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-sky-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout bottom Panel */}
        <div className="p-4 border-t border-white/5 bg-black/10">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-base shadow-[0_0_10px_rgba(56,189,248,0.1)]">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="font-bold text-sm text-gray-200 truncate">{user?.username}</h4>
              <p className="text-[11px] text-gray-500 truncate">Authenticated User</p>
            </div>
          </div>
          
          {/* Key missing warning */}
          {(!user?.openai_key && !user?.gemini_key) && (
            <div className="mx-2 mt-1 mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-500 font-medium leading-tight">No LLM API keys set. VaultIQ running in mock mode.</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-brand-bg relative overflow-y-auto">
        <div className="flex-1 p-8 max-w-7xl w-full mx-auto pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
