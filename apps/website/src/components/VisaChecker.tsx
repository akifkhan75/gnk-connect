import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ArrowRight, CheckCircle2, Clock, Shield, Sparkles, Search } from 'lucide-react';

export interface VisaRequirement {
  destination: string;
  type: 'E-Visa' | 'Sticker Visa' | 'Embassy Submission' | 'Visa on Arrival';
  processingTime: string;
  validity: string;
  entryType: string;
  price: string;
  requirements: string[];
  notes?: string;
}

export const VISA_DATA: Record<string, VisaRequirement> = {
  uae: {
    destination: 'United Arab Emirates (Dubai / Abu Dhabi)',
    type: 'E-Visa',
    processingTime: '3 - 4 Working Days',
    validity: '30 / 60 Days',
    entryType: 'Single Entry',
    price: '$150',
    requirements: [
      'Original Passport scan (Minimum 6 months validity)',
      'Passport size photograph with white background',
      'Valid CNIC / National ID card copy',
      'Confirmed return flight itinerary (Provided by GNK)',
      'Mandatory COVID & travel medical insurance included',
    ],
    notes: 'No physical embassy appointment required. 100% online processing.',
  },
  saudi: {
    destination: 'Saudi Arabia (Umrah / Tourist Visa)',
    type: 'E-Visa',
    processingTime: '24 - 48 Hours',
    validity: '90 Days / 1 Year Multiple',
    entryType: 'Multiple Entry',
    price: '$180',
    requirements: [
      'Valid Passport scan (Minimum 6 months validity)',
      'Recent high-resolution digital photograph',
      'Confirmed Makkah/Madinah hotel reservation voucher',
      'Mandatory comprehensive medical insurance included',
    ],
    notes:
      'Permits Umrah rituals and tourism across all cities including Riyadh, Jeddah, Makkah, and Madinah.',
  },
  thailand: {
    destination: 'Thailand',
    type: 'Sticker Visa',
    processingTime: '5 - 7 Working Days',
    validity: '60 Days',
    entryType: 'Single Entry',
    price: '$80',
    requirements: [
      'Original Passport with at least 2 blank pages',
      '2 Recent Photographs (3.5 x 4.5 cm, white background)',
      '6-Month Bank Statement with minimum balance confirmation letter',
      'Employment verification letter / Business NTN registration',
      'Confirmed hotel voucher and round-trip flight booking',
    ],
    notes: 'Official sticker visa endorsed in passport via Royal Thai Embassy / Gerrys.',
  },
  schengen: {
    destination: 'Schengen Europe (France, Germany, Italy, Spain, Switzerland)',
    type: 'Embassy Submission',
    processingTime: '15 - 20 Working Days',
    validity: 'As per itinerary (Up to 90 Days)',
    entryType: 'Single / Multiple Entry',
    price: '$200',
    requirements: [
      'Complete embassy dossier prepared by GNK specialists',
      '6-Month verified bank statement & tax returns (NTN / FBR)',
      'Verifiable hotel & flight reservations for full itinerary',
      '€30,000 Schengen travel health insurance policy',
      'Personal cover letter & day-by-day travel schedule',
      'Biometric appointment at VFS / Gerrys',
    ],
    notes:
      'Includes complete file preparation, appointment assistance, and 1-on-1 mock interview session.',
  },
  malaysia: {
    destination: 'Malaysia',
    type: 'E-Visa',
    processingTime: '2 - 3 Working Days',
    validity: '30 Days',
    entryType: 'Single Entry',
    price: '$75',
    requirements: [
      'Passport bio-page scan',
      'Studio photograph (35x50mm, white background)',
      '3-Month bank statement',
      'Confirmed return flight tickets & hotel reservation',
    ],
    notes: 'Electronic visa delivered directly via email.',
  },
  singapore: {
    destination: 'Singapore',
    type: 'E-Visa',
    processingTime: '3 - 5 Working Days',
    validity: '30 Days',
    entryType: 'Single Entry',
    price: '$90',
    requirements: [
      'Passport bio-page scan (6 months validity)',
      'White background digital photograph',
      'Employment letter or business proof',
      'Confirmed hotel and flight itinerary',
    ],
    notes: 'Paperless electronic submission via authorized Singapore agency partner.',
  },
  vietnam: {
    destination: 'Vietnam',
    type: 'E-Visa',
    processingTime: '4 - 5 Working Days',
    validity: '30 / 90 Days',
    entryType: 'Single / Multiple Entry',
    price: '$65',
    requirements: [
      'Passport scan (JPEG/PDF)',
      'Digital passport-style portrait',
      'Entry and exit port details',
    ],
    notes: 'Official government e-visa for leisure and tourism.',
  },
};

export const VisaChecker: React.FC<{ onApply?: (visaTitle: string, notes: string) => void }> = ({
  onApply,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('uae');
  const visa = VISA_DATA[selectedCountry] || VISA_DATA['uae'];

  const handleApplyClick = () => {
    if (onApply) {
      onApply(
        `${visa.destination} (${visa.type})`,
        `Inquiring for ${visa.destination} visa. Type: ${visa.type}, Price: ${visa.price}, Processing: ${visa.processingTime}.`,
      );
    }
  };

  return (
    <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-10 border border-navy-800 shadow-2xl relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-2 border border-cyan-400/30">
              <FileCheck size={14} /> Visa Intelligence Engine
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Check Visa Requirements & Guidelines
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Select your travel destination to review mandatory embassy documents, turnaround
              times, and fee structures.
            </p>
          </div>
        </div>

        {/* Country Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {[
            { id: 'uae', label: 'Dubai (UAE)' },
            { id: 'saudi', label: 'Saudi Arabia' },
            { id: 'thailand', label: 'Thailand' },
            { id: 'schengen', label: 'Schengen Europe' },
            { id: 'malaysia', label: 'Malaysia' },
            { id: 'singapore', label: 'Singapore' },
            { id: 'vietnam', label: 'Vietnam' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedCountry(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCountry === item.id
                  ? 'bg-brand text-white shadow-lg shadow-cyan-500/25 scale-105'
                  : 'bg-navy-800 text-gray-300 border border-navy-700 hover:bg-navy-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Selected Visa Intelligence Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Details & Documents */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-navy-800/90 rounded-2xl p-6 border border-navy-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-navy-700">
                <div>
                  <span className="text-xs font-bold text-cyan-400 block mb-1">{visa.type}</span>
                  <h4 className="text-xl sm:text-2xl font-bold text-white">{visa.destination}</h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-cyan-400">{visa.price}</span>
                  <span className="text-[10px] text-gray-400 block">Service & Fee</span>
                </div>
              </div>

              {/* Key Specs Bar */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-navy-900/80 rounded-xl border border-navy-700/80 text-center mb-6">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block mb-1 flex items-center justify-center gap-1">
                    <Clock size={12} className="text-cyan-400" /> Processing
                  </span>
                  <strong className="text-xs sm:text-sm text-white">{visa.processingTime}</strong>
                </div>
                <div className="border-l border-r border-navy-700">
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Validity</span>
                  <strong className="text-xs sm:text-sm text-white">{visa.validity}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block mb-1">Entry Mode</span>
                  <strong className="text-xs sm:text-sm text-white">{visa.entryType}</strong>
                </div>
              </div>

              {/* Document Checklist */}
              <div>
                <h5 className="text-xs font-bold text-gray-300 mb-3">
                  Mandatory Submission Checklist:
                </h5>
                <div className="space-y-2.5">
                  {visa.requirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-navy-900/50 border border-navy-700/60 text-xs text-gray-200"
                    >
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {visa.notes && (
                <div className="mt-5 p-3.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-start gap-2 text-xs text-cyan-200">
                  <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span>{visa.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick CTA Card */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-gradient-to-br from-navy-800 to-navy-900 border border-navy-700 p-6 rounded-2xl">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-400/30">
                <Shield size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">High Success Visa Desk</h4>
              <p className="text-gray-300 text-xs leading-relaxed mb-6">
                Our certified visa documentation officers scrutinize all banking statements, cover
                letters, and embassy bookings to eliminate rejections.
              </p>

              <div className="space-y-2 mb-6 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span>Embassy-Compliant Vouchers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span>Expedited Appointment Booking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span>Full Financial File Auditing</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleApplyClick}
                className="w-full bg-brand hover:bg-brand text-white py-3.5 rounded-full font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Apply for {visa.destination.split(' ')[0]} Visa</span>
                <ArrowRight size={14} />
              </button>

              <Link
                to="/tracking"
                className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Search size={13} className="text-cyan-400" />
                <span>Track Existing Application Status</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisaChecker;
