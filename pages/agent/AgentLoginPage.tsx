import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { Compass, Lock, Mail, ArrowRight } from 'lucide-react';

export const AgentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useB2BAuth();
  const [email, setEmail] = useState('agent@abctravels.com');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email);
    if (success) {
      navigate('/agent/dashboard');
    } else {
      setError('Agent email not found. Please register or select one of the demo partner accounts below.');
    }
  };

  const handleDemoSelect = async (userEmail: string) => {
    await login(userEmail);
    navigate('/agent/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/25">
            <Compass className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white">GNK Elite B2B Portal</h2>
          <p className="text-xs text-slate-400">Partner & Travel Agency Authentication</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Official Agent Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@agency.com"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                defaultValue="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            Access Partner Dashboard <ArrowRight size={14} />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block text-center">
            Or Click a Demo Account to Test:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoSelect('agent@abctravels.com')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-emerald-400 text-left"
            >
              🏢 ABC Travels (Approved)
            </button>
            <button
              onClick={() => handleDemoSelect('muhammad.ali.travels@gmail.com')}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-amber-400 text-left"
            >
              ⏳ M. Ali (Pending Agent)
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-400">Not a registered partner yet? </span>
          <Link to="/agent/register" className="text-xs font-bold text-cyan-400 hover:underline">
            Apply to Become a Partner
          </Link>
        </div>
      </div>
    </div>
  );
};
