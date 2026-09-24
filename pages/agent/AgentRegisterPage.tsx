import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { 
  Building2, 
  User, 
  Users,
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Compass, 
  ShieldCheck, 
  Clock, 
  Lock,
  Phone,
  Mail,
  Check
} from 'lucide-react';
import { FileUploadDropzone } from '../../components/FileUploadDropzone';

export const AgentRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useB2BAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [accountType, setAccountType] = useState<'AGENCY' | 'INDIVIDUAL' | 'TEAM_MEMBER'>('AGENCY');
  
  // Step 2: Contact Credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('partner123');
  const [agencyCode, setAgencyCode] = useState('');

  // Step 3: Business Details
  const [agencyName, setAgencyName] = useState('');
  const [city, setCity] = useState('Karachi');
  const [officeAddress, setOfficeAddress] = useState('');
  const [ntnNumber, setNtnNumber] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  
  // Step 4: Documents
  const [dtsLicenseUrl, setDtsLicenseUrl] = useState('');
  const [ntnCertificateUrl, setNtnCertificateUrl] = useState('');
  const [cnicDocUrl, setCnicDocUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      if (accountType === 'TEAM_MEMBER' && currentStep === 2) {
        // Skip step 3 & 4 for team members joining with code
        handleFinalSubmit();
        return;
      }
      if (accountType === 'INDIVIDUAL' && currentStep === 2) {
        // Skip business step directly to documents
        setCurrentStep(4);
        return;
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const generatedId = `REG-${Math.floor(100000 + Math.random() * 900000)}`;
      setTrackingId(generatedId);

      await register({
        fullName,
        email,
        phone,
        password,
        accountType: accountType === 'TEAM_MEMBER' ? 'AGENCY' : accountType,
        agencyName: accountType === 'AGENCY' ? agencyName : (accountType === 'TEAM_MEMBER' ? `Team Member of ${agencyCode}` : `${fullName} Travel Services`),
        city,
        officeAddress,
        ntnNumber,
        tradeLicenseNumber,
        dtsLicenseUrl,
        ntnCertificateUrl,
      });

      setSubmitting(false);
      setIsCompleted(true);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Compass className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-white">
              GNK <span className="text-cyan-400">ELITE</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white">B2B Partner & Agency Onboarding</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Join the GNK Elite Reseller Platform powered by AirDesk GDS. Access wholesale group departures, instant PNRs, and trade credit lines.
          </p>
        </div>

        {/* Wizard Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          {!isCompleted ? (
            <>
              {/* Stepper Indicator */}
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-0"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-cyan-500 transition-all duration-300 -z-0"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                ></div>

                {[
                  { step: 1, title: 'Type' },
                  { step: 2, title: 'Credentials' },
                  { step: 3, title: 'Agency Info' },
                  { step: 4, title: 'Verification' }
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center gap-1.5 z-10 bg-slate-900 px-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        currentStep === s.step
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                          : currentStep > s.step
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {currentStep > s.step ? <Check size={14} /> : s.step}
                    </div>
                    <span className={`text-[11px] font-semibold ${currentStep >= s.step ? 'text-white' : 'text-slate-500'}`}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleNextStep} className="space-y-6">
                
                {/* STEP 1: Account Type Selection */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white">Select Account Structure</h2>
                      <p className="text-xs text-slate-400">Choose the profile that best matches your organization</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType('AGENCY')}
                        className={`p-4 rounded-2xl border text-left transition-all space-y-2 flex flex-col justify-between ${
                          accountType === 'AGENCY'
                            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl w-fit ${accountType === 'AGENCY' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-cyan-400'}`}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">Registered Travel Agency</div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            For licensed DTS / IATA agencies requiring multi-staff logins & credit lines.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType('INDIVIDUAL')}
                        className={`p-4 rounded-2xl border text-left transition-all space-y-2 flex flex-col justify-between ${
                          accountType === 'INDIVIDUAL'
                            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl w-fit ${accountType === 'INDIVIDUAL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-cyan-400'}`}>
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">Freelance Consultant</div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            For independent travel planners, solo agents and tour group leaders.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType('TEAM_MEMBER')}
                        className={`p-4 rounded-2xl border text-left transition-all space-y-2 flex flex-col justify-between ${
                          accountType === 'TEAM_MEMBER'
                            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl w-fit ${accountType === 'TEAM_MEMBER' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-cyan-400'}`}>
                          <Users size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">Join Existing Agency</div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Join your travel agency team using an agency code or invite link.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Credentials & Authorized Contact */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white">Authorized Agent Credentials</h2>
                      <p className="text-xs text-slate-400">Set up your primary login credentials and contact numbers</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-300">Authorized Officer Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tariq Mansoor"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Official Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@agency.com"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Direct WhatsApp / Mobile</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+92 300 1234567"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-300">Account Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            required
                          />
                        </div>
                      </div>

                      {accountType === 'TEAM_MEMBER' && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300">Agency Invitation Code</label>
                          <input
                            type="text"
                            value={agencyCode}
                            onChange={(e) => setAgencyCode(e.target.value)}
                            placeholder="e.g. ABC-TRV-2026"
                            className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 uppercase"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: Business Information (For Agencies) */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white">Agency Corporate Profile</h2>
                      <p className="text-xs text-slate-400">Enter registered trade details for DTS & FBR verification</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-300">Registered Agency Trade Name</label>
                        <input
                          type="text"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          placeholder="e.g. Falcon Travels & Tours (Pvt) Ltd"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">DTS Tourism License Number</label>
                        <input
                          type="text"
                          value={tradeLicenseNumber}
                          onChange={(e) => setTradeLicenseNumber(e.target.value)}
                          placeholder="e.g. DTS-KHI-4920"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">NTN / FBR Tax Number</label>
                        <input
                          type="text"
                          value={ntnNumber}
                          onChange={(e) => setNtnNumber(e.target.value)}
                          placeholder="e.g. 7392810-4"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Operating City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Office / Branch Address</label>
                        <input
                          type="text"
                          value={officeAddress}
                          onChange={(e) => setOfficeAddress(e.target.value)}
                          placeholder="Suite #, Building, Main Road"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: KYC & Verification Documents */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white">License & KYC Document Scans</h2>
                      <p className="text-xs text-slate-400">Upload official accreditation documents for faster verification approval</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileUploadDropzone
                        label="DTS Tourism License"
                        helperText="Upload valid Department of Tourist Services certificate"
                        category="DTS_LICENSE"
                        value={dtsLicenseUrl}
                        onChange={(url) => setDtsLicenseUrl(url)}
                      />

                      <FileUploadDropzone
                        label="FBR NTN Tax Certificate"
                        helperText="Upload official NTN registration certificate copy"
                        category="NTN_CERTIFICATE"
                        value={ntnCertificateUrl}
                        onChange={(url) => setNtnCertificateUrl(url)}
                      />

                      <div className="sm:col-span-2">
                        <FileUploadDropzone
                          label="Owner / Director CNIC Scan"
                          helperText="Front and back scan of authorized signatory CNIC / Passport"
                          category="CNIC_DOCUMENT"
                          value={cnicDocUrl}
                          onChange={(url) => setCnicDocUrl(url)}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-cyan-400 flex-shrink-0" />
                      <span>
                        Documents are transmitted over encrypted TLS channels and audited by GNK Elite Compliance within 2 hours.
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Application...' : currentStep === 4 ? 'Complete Registration' : 'Continue'} 
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* REGISTRATION SUCCESS / TRACKING SCREEN */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Partner Application Submitted!</h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your agency application for <strong>{agencyName || fullName}</strong> has been logged in the GNK Operations verification queue.
                </p>
              </div>

              {/* Ticket Badge */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Application Tracking Reference</span>
                <div className="text-lg font-mono font-black text-cyan-400">{trackingId}</div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <Clock size={12} /> Expected Verification SLA: ~2 Hours
                </div>
              </div>

              {/* Action options */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/agent/dashboard')}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
                >
                  Explore Catalog in Sandbox Mode →
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/agent/profile')}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl text-xs"
                >
                  View Application Status
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-2 border-t border-slate-800/60">
            <span className="text-xs text-slate-400">Already registered with GNK Elite? </span>
            <Link to="/agent/login" className="text-xs font-bold text-cyan-400 hover:underline">
              Sign In to Agent Portal
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AgentRegisterPage;
