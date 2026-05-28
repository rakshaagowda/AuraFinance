import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, KeyRound } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center relative p-6 overflow-hidden">
      {/* Dynamic blurred background glows */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[120px] top-[10%] left-[20%] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px] bottom-[10%] right-[10%] pointer-events-none" />

      {/* Main glassmorphic login card */}
      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl relative z-10 border border-white/10">
        
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-purple-600 flex items-center justify-center font-black text-white text-3xl tracking-widest mx-auto mb-4 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            V
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
            Welcome back
          </h2>
          <p className="text-sm text-gray-400 mt-2">Enter credentials to access VaultIQ</p>
        </div>

        {/* Validation Errors */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input pl-12"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-premium py-3.5 text-white disabled:opacity-50 select-none mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Register Redirect footer */}
        <div className="text-center mt-8 pt-6 border-t border-white/5">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-bold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
