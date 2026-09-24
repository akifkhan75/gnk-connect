import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { 
  Compass, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  Plane, 
  Wallet, 
  Users, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const AgentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useB2BAuth();
  const [email, setEmail] = useState('agent@abctravels.com');
  const [password, setPassword] = useState('partner123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        if (email.includes('admin@gnkelite.com') || email.includes('ops@gnkelite.com')) {
          navigate('/admin');
        } else {
          navigate('/agent/dashboard');
        }
      } else {
        setError('Invalid credentials or unregistered agent account. Please select a demo profile or apply for partner onboarding.');
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('partner123');
    setLoading(true);
    await login(demoEmail, 'partner123');
    setLoading(false);
    if (demoEmail.includes('admin@gnkelite.com') || demoEmail.includes('ops@') || demoEmail.includes('finance@') || demoEmail.includes('relations@')) {
      navigate('/admin');
    } else {
      navigate('/agent/dashboard');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setForgotModal(false);
      setForgotSent(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: AirDesk B2B Value Proposition Showcase */}
        <div className="lg:col-span-6 space-y-6 lg:pr-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  GNK <span className="text-cyan-400">ELITE</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                  AirDesk GDS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">B2B Reseller & Wholesale Inventory Engine</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Enterprise Wholesale Travel <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
                Powering Leading Agencies
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Access real-time group allocations, wholesale net fares, dual-ID instant PNR ticketing, and flexible credit float limits tailored for travel businesses.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Plane size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">AirDesk Group Series</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Direct seat holds on direct Emirates, Saudia & FlyDubai groups</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Credit Float & Limits</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Approved agency credit limits with monthly Statement of Account (SOA)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Agency Team RBAC</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Multi-tier roles for Owners, Managers, and Ticketing Staff</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Official E-Vouchers</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated B2B travel vouchers with QR verification & passenger rosters</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles size={16} className="text-cyan-400" />
              <span>Are you a registered Travel Agency or Tour Operator?</span>
            </div>
            <Link
              to="/agent/register"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
            >
              Apply Now <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Professional Login Box */}
        <div className="lg:col-span-6 max-w-md w-full mx-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Sign In to Partner Portal</h2>
              <p className="text-xs text-slate-400">Enter your official agency credentials to access live AirDesk inventory</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Agency / Agent Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@agency.com"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotModal(true)}
                    className="text-[11px] font-medium text-cyan-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/20"
                  />
                  <span>Remember workstation session</span>
                </label>
                <span className="text-[10px] text-slate-500">256-bit TLS Encrypted</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'} <ArrowRight size={15} />
              </button>
            </form>

            {/* ONE-CLICK DEMO ROLE PRESETS */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  ⚡ 1-Click Interactive Demo Logins:
                </span>
                <span className="text-[10px] text-cyan-400/80">Select role below</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSelect('agent@abctravels.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">
                    🏢 Agency Owner
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Tariq Mansoor (ABC Travels)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoSelect('farhan@abctravels.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300">
                    👥 Agency Manager
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Farhan Zaidi (Supervisor)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoSelect('sara@abctravels.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300">
                    🎫 Ticketing Staff
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Sara Khan (Sales Agent)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoSelect('muhammad.ali.travels@gmail.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300">
                    ⏳ Pending Review
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Muhammad Ali (KYC Pending)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoSelect('zubair.travels@gmail.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300">
                    👤 Freelance Agent
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Zubair Qureshi (Solo)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoSelect('admin@gnkelite.com')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group"
                >
                  <div className="text-[11px] font-bold text-rose-400 group-hover:text-rose-300">
                    🛡️ GNK Operations
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Super Admin Gateway</div>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">Need a new partner account? </span>
              <Link to="/agent/register" className="text-xs font-bold text-cyan-400 hover:underline">
                Apply for Agency Onboarding
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Forgot Password Simulation Modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reset Agency Password</h3>
            <p className="text-xs text-slate-400">
              Enter your official agency email and we will dispatch a secure reset OTP to your registered corporate contact.
            </p>

            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} /> Password reset instructions sent to your email!
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="agent@agency.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2 rounded-xl text-xs font-bold"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentLoginPage;
