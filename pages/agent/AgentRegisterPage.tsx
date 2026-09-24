import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { 
  Building2, 
  User, 
  ArrowRight 
} from 'lucide-react';
import { FileUploadDropzone } from '../../components/FileUploadDropzone';

export const AgentRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useB2BAuth();

  const [accountType, setAccountType] = useState<'AGENCY' | 'INDIVIDUAL'>('AGENCY');
  const [agencyName, setAgencyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Karachi');
  const [officeAddress, setOfficeAddress] = useState('');
  const [ntnNumber, setNtnNumber] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [dtsLicenseUrl, setDtsLicenseUrl] = useState('');
  const [ntnCertificateUrl, setNtnCertificateUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await register({
        fullName,
        email,
        phone,
        accountType,
        agencyName: accountType === 'AGENCY' ? agencyName : `${fullName} Travel Services`,
        city,
        officeAddress,
        ntnNumber,
        tradeLicenseNumber,
        dtsLicenseUrl,
        ntnCertificateUrl,
      });
      setSubmitting(false);
      navigate('/agent/dashboard');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            B2B Partner Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Join the GNK Elite Reseller Network</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Get wholesale access to verified group departures, preferential markup engine, and instant AirDesk group allocations.
          </p>
        </div>

        {/* Account Type Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setAccountType('AGENCY')}
            className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              accountType === 'AGENCY'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 size={16} /> Travel Agency (Corporate)
          </button>
          <button
            type="button"
            onClick={() => setAccountType('INDIVIDUAL')}
            className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              accountType === 'INDIVIDUAL'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={16} /> Individual Travel Agent
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {accountType === 'AGENCY' && (
            <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Agency Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Registered Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Paramount Travels & Tours"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">NTN / Tax Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 8492019-2"
                    value={ntnNumber}
                    onChange={(e) => setNtnNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">DTS License #</label>
                  <input
                    type="text"
                    placeholder="e.g. DTS-3920-KHI"
                    value={tradeLicenseNumber}
                    onChange={(e) => setTradeLicenseNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Office Address</label>
                  <input
                    type="text"
                    placeholder="Office #, Plaza, Street"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Person Details */}
          <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Authorized Agent Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Raza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Official Email</label>
                <input
                  type="email"
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300">Phone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Verification Document Upload Subsystem */}
          <div className="space-y-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Agency KYC & License Verification Documents
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUploadDropzone
                label="DTS Tourism License / Agency Certificate"
                helperText="Upload official DTS tourism license (PDF, PNG, JPG)"
                category="DTS_LICENSE"
                value={dtsLicenseUrl}
                onChange={(url) => setDtsLicenseUrl(url)}
              />

              <FileUploadDropzone
                label="NTN Tax Certificate / CNIC Proof"
                helperText="Upload FBR NTN registration or CNIC copy"
                category="NTN_CERTIFICATE"
                value={ntnCertificateUrl}
                onChange={(url) => setNtnCertificateUrl(url)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating Partner Profile...' : (
              <>
                Submit Partner Registration <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-400">Already registered? </span>
          <Link to="/agent/login" className="text-xs font-bold text-cyan-400 hover:underline">
            Sign In to Partner Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
