import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  AlertCircle, 
  Phone, 
  ShieldCheck, 
  Plane,
  Calendar,
  Sparkles
} from 'lucide-react';
import { BRAND_NAME, CONTACT_INFO } from '../constants';
import { useToast } from '../context/ToastContext';

interface TrackingRecord {
  trackingId: string;
  applicantName: string;
  destination: string;
  visaType: string;
  submissionDate: string;
  estimatedCompletion: string;
  currentStep: number; // 1 to 4
  statusText: string;
  statusColor: 'green' | 'blue' | 'amber';
  passportNumberMasked: string;
  steps: {
    title: string;
    description: string;
    timestamp: string;
    completed: boolean;
    active: boolean;
  }[];
  downloadAvailable: boolean;
}

const SAMPLE_RECORDS: Record<string, TrackingRecord> = {
  'GNK-UMRAH-101': {
    trackingId: 'GNK-UMRAH-101',
    applicantName: 'Muhammad Salman Khan',
    destination: 'Kingdom of Saudi Arabia (Umrah E-Visa)',
    visaType: '1-Year Multiple Entry Tourist / Umrah E-Visa',
    submissionDate: '20 Feb 2025',
    estimatedCompletion: '22 Feb 2025',
    currentStep: 4,
    statusText: 'Visa Approved & Issued',
    statusColor: 'green',
    passportNumberMasked: 'BL9283***',
    downloadAvailable: true,
    steps: [
      { title: 'Document & Passport Verification', description: 'Application vetted and verified by GNK Connect Senior Visa Desk.', timestamp: '20 Feb 2025, 10:30 AM', completed: true, active: false },
      { title: 'MOFA Saudi Arabia Portal Submission', description: 'Visa file transmitted to Ministry of Foreign Affairs (MOFA) portal.', timestamp: '20 Feb 2025, 02:15 PM', completed: true, active: false },
      { title: 'Insurance & Fee Clearance', description: 'Medical insurance policy issued and government fees cleared.', timestamp: '21 Feb 2025, 11:00 AM', completed: true, active: false },
      { title: 'Official Umrah Visa Issued', description: 'Official E-Visa generated with barcode. Ready for immediate travel.', timestamp: '21 Feb 2025, 04:30 PM', completed: true, active: true },
    ]
  },
  'GNK-DUBAI-202': {
    trackingId: 'GNK-DUBAI-202',
    applicantName: 'Zainab Bibi',
    destination: 'United Arab Emirates (Dubai 30-Day)',
    visaType: '30-Day Single Entry Tourist Visa',
    submissionDate: '22 Feb 2025',
    estimatedCompletion: '24 Feb 2025',
    currentStep: 3,
    statusText: 'Under GDRFA Immigration Review',
    statusColor: 'blue',
    passportNumberMasked: 'CW8192***',
    downloadAvailable: false,
    steps: [
      { title: 'Document Verification', description: 'Passport scan and white background photo approved.', timestamp: '22 Feb 2025, 09:00 AM', completed: true, active: false },
      { title: 'GDRFA Dubai Submission', description: 'Application lodged with Dubai Immigration system.', timestamp: '22 Feb 2025, 12:45 PM', completed: true, active: false },
      { title: 'Security & Immigration Clearance', description: 'Under standard review by GDRFA Dubai officers.', timestamp: '23 Feb 2025, 10:00 AM', completed: false, active: true },
      { title: 'E-Visa PDF Issuance', description: 'Official electronic visa approval.', timestamp: 'Estimated: 24 Feb 2025', completed: false, active: false },
    ]
  },
  'GNK-SCHENGEN-303': {
    trackingId: 'GNK-SCHENGEN-303',
    applicantName: 'Farhan Ahmed Malik',
    destination: 'Schengen Zone (Embassy of Italy / France)',
    visaType: 'Short Stay C-Type Tourist Sticker Visa',
    submissionDate: '15 Feb 2025',
    estimatedCompletion: '02 Mar 2025',
    currentStep: 2,
    statusText: 'Embassy Processing & Biometrics Lodged',
    statusColor: 'amber',
    passportNumberMasked: 'DK4920***',
    downloadAvailable: false,
    steps: [
      { title: 'File Preparation & Cover Letter', description: 'Bank statements, tax returns, flight reservations, and cover letter organized.', timestamp: '15 Feb 2025, 03:00 PM', completed: true, active: false },
      { title: 'VFS Global Appointment & Biometrics', description: 'Fingerprints and passport handed over at VFS Islamabad.', timestamp: '18 Feb 2025, 11:30 AM', completed: true, active: true },
      { title: 'Embassy Consular Assessment', description: 'Passport currently in custody of the diplomatic mission.', timestamp: 'Estimated: 26 Feb 2025', completed: false, active: false },
      { title: 'Passport Ready for Pickup', description: 'Passport with stamped visa returned to GNK Connect desk.', timestamp: 'Estimated: 02 Mar 2025', completed: false, active: false },
    ]
  },
  'GNK-BAKU-404': {
    trackingId: 'GNK-BAKU-404',
    applicantName: 'Hamza Tariq',
    destination: 'Republic of Azerbaijan (ASAN E-Visa)',
    visaType: 'ASAN Standard E-Visa (30 Days Stay)',
    submissionDate: '23 Feb 2025',
    estimatedCompletion: '26 Feb 2025',
    currentStep: 2,
    statusText: 'ASAN Government Portal Processing',
    statusColor: 'blue',
    passportNumberMasked: 'EZ7719***',
    downloadAvailable: false,
    steps: [
      { title: 'Document Verification', description: 'Passport validity and photo confirmed.', timestamp: '23 Feb 2025, 11:00 AM', completed: true, active: false },
      { title: 'ASAN Portal Payment & Submission', description: 'State fee paid and application submitted to Baku immigration.', timestamp: '23 Feb 2025, 02:00 PM', completed: true, active: true },
      { title: 'State Migration Service Clearance', description: 'Background vetting by Azerbaijan State Migration Service.', timestamp: 'Estimated: 25 Feb 2025', completed: false, active: false },
      { title: 'ASAN Visa PDF Dispatch', description: 'Electronic visa ready for travel.', timestamp: 'Estimated: 26 Feb 2025', completed: false, active: false },
    ]
  }
};

const VisaTrackingPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeRecord, setActiveRecord] = useState<TrackingRecord | null>(SAMPLE_RECORDS['GNK-UMRAH-101']);
  const [notFound, setNotFound] = useState(false);
  const { showToast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) {
      showToast('Input Required', 'Please enter a Tracking Reference ID or Passport Number.', 'error');
      return;
    }

    const found = SAMPLE_RECORDS[cleanQuery];
    if (found) {
      setActiveRecord(found);
      setNotFound(false);
      showToast('Record Found', `Displaying live status for ${cleanQuery}.`, 'success');
    } else {
      setActiveRecord(null);
      setNotFound(true);
      showToast('No Record Found', `No active application matching "${cleanQuery}".`, 'error');
    }
  };

  const handleQuickSelect = (id: string) => {
    setQuery(id);
    setActiveRecord(SAMPLE_RECORDS[id]);
    setNotFound(false);
  };

  const handleDownloadApproval = () => {
    showToast('Download Initiated', 'Your official E-Visa approval document is being prepared.', 'success');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden print:hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3 border border-cyan-400/30">
            <ShieldCheck size={14} /> Official Visa &amp; Application Status
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-white tracking-tight">
            Live Application Tracker
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed mb-8">
            Check real-time embassy review updates, MOFA portal approvals, and biometrics status for all your visa files managed by {BRAND_NAME}.
          </p>

          {/* Search Input Bar */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="flex gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/20">
              <div className="flex-1 flex items-center px-4">
                <Search className="text-gray-300 mr-2.5 shrink-0" size={18} />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter Tracking ID (e.g. GNK-UMRAH-101) or Passport..." 
                  aria-label="Enter Tracking ID"
                  className="w-full bg-transparent outline-none text-white placeholder-gray-300 text-sm font-semibold"
                />
              </div>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shrink-0 active:scale-95"
              >
                Track Status
              </button>
            </form>

            {/* Quick Demo Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="text-gray-400 font-medium">Try Sample Tracking IDs:</span>
              {Object.keys(SAMPLE_RECORDS).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleQuickSelect(id)}
                  className="bg-white/10 hover:bg-white/20 text-cyan-300 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border border-white/10"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20 max-w-4xl">
        {/* If Not Found */}
        {notFound && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 shadow-xl max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-navy-900 mb-2">Application Reference Not Found</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              We could not find an active file matching <strong>"{query}"</strong>. Please verify the tracking number provided on your receipt or contact our helpline.
            </p>
            <div className="flex justify-center gap-3">
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Phone size={14} />
                <span>Call Helpline: {CONTACT_INFO.displayPhone}</span>
              </a>
            </div>
          </div>
        )}

        {/* Display Active Record */}
        {activeRecord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Top Status Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-gray-100 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-black bg-navy-50 text-navy-900 px-3 py-1 rounded-lg">
                      {activeRecord.trackingId}
                    </span>
                    <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                      activeRecord.statusColor === 'green'
                        ? 'bg-green-100 text-green-800'
                        : activeRecord.statusColor === 'blue'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      ● {activeRecord.statusText}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mt-2">
                    {activeRecord.applicantName}
                  </h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>Passport: <strong>{activeRecord.passportNumberMasked}</strong></span>
                    <span>•</span>
                    <span>Submitted: {activeRecord.submissionDate}</span>
                  </p>
                </div>

                {activeRecord.downloadAvailable && (
                  <button
                    type="button"
                    onClick={handleDownloadApproval}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 print:hidden"
                  >
                    <Download size={14} />
                    <span>Download Official Approval PDF</span>
                  </button>
                )}
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase block mb-1 text-[10px]">Target Destination</span>
                  <p className="font-bold text-navy-900 flex items-center gap-1.5">
                    <Plane size={14} className="text-cyan-600 shrink-0" />
                    <span>{activeRecord.destination}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase block mb-1 text-[10px]">Visa Category</span>
                  <p className="font-bold text-navy-900 flex items-center gap-1.5">
                    <FileText size={14} className="text-cyan-600 shrink-0" />
                    <span>{activeRecord.visaType}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold uppercase block mb-1 text-[10px]">Target Completion</span>
                  <p className="font-bold text-navy-900 flex items-center gap-1.5">
                    <Calendar size={14} className="text-cyan-600 shrink-0" />
                    <span>{activeRecord.estimatedCompletion}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline Milestones */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
                <Clock size={18} className="text-cyan-600" />
                <span>Application Progress Timeline</span>
              </h3>

              <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-gray-200">
                {activeRecord.steps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 z-10 transition-all ${
                      step.completed
                        ? 'bg-green-500 text-white ring-4 ring-green-100'
                        : step.active
                        ? 'bg-cyan-500 text-navy-900 ring-4 ring-cyan-100 animate-pulse'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step.completed ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>

                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mb-1">
                        <h4 className={`font-bold text-sm ${
                          step.completed ? 'text-navy-900' : step.active ? 'text-cyan-700' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </h4>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {step.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Callout */}
            <div className="bg-navy-900 text-white rounded-3xl p-6 shadow-xl border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-sm mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles size={16} className="text-cyan-400" />
                  <span>Have questions regarding your visa processing timeline?</span>
                </h4>
                <p className="text-xs text-gray-300">
                  Our Islamabad visa desk officers are available 6 days a week to provide immediate status briefings.
                </p>
              </div>

              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shrink-0"
              >
                Call Desk: {CONTACT_INFO.displayPhone}
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VisaTrackingPage;
