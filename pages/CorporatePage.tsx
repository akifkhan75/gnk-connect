import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  Users, 
  Plane, 
  CheckCircle2, 
  Send, 
  ChevronRight
} from 'lucide-react';
import { BRAND_NAME, CONTACT_INFO } from '../constants';
import { useToast } from '../context/ToastContext';
import InquiryModal from '../components/InquiryModal';

const CORPORATE_SERVICES = [
  {
    icon: Building2,
    title: 'MICE & Annual Company Retreats',
    desc: 'Turnkey event planning, scenic mountain resorts in Hunza & Skardu, luxury gala dinners, team building expeditions, and complete audio-visual logistics.',
    highlight: 'Up to 500+ Pax Delegations'
  },
  {
    icon: Users,
    title: 'Corporate Employee Umrah Groups',
    desc: 'Subsidized annual corporate Umrah batches with 5-star Haram courtyard floor buyouts, dedicated group coordinators, and express visa processing.',
    highlight: 'Customized Payment Plans'
  },
  {
    icon: Plane,
    title: 'Executive Air Charter & GDS Ticketing',
    desc: 'Direct GDS ticketing with flexible cancellation, zero change fees for corporate accounts, priority seat blocking, and private jet chartering.',
    highlight: 'Consolidated Monthly Invoicing'
  },
  {
    icon: Briefcase,
    title: 'Business Visas & Diplomatic Delegations',
    desc: 'Expedited fast-track filing for single & multiple-entry commercial visas to UAE, Saudi Arabia, UK, EU Schengen, China, and North America.',
    highlight: '99% Embassy Approval Rate'
  }
];

const CORPORATE_PERKS = [
  { title: 'Dedicated Key Account Manager', desc: 'A dedicated senior travel consultant assigned exclusively to your organization with direct 24/7 hotline access.' },
  { title: 'Flexible Credit & Centralized Billing', desc: 'Consolidated monthly invoicing with detailed department-wise travel spend reports and audit-compliant statements.' },
  { title: 'Priority Airport Fast-Track & CIP Lounges', desc: 'Complimentary VIP CIP lounge access and fast-track immigration meet & greet for executive leadership.' },
  { title: '24/7 Flight Rebooking & Duty of Care', desc: 'Instant rerouting, emergency ticket reissuance, and 24/7 traveller tracking anywhere in the world.' }
];

const PAST_CASE_STUDIES = [
  {
    client: 'Leading FinTech Enterprise',
    attendees: '140 Delegates',
    destination: 'Skardu & Shangrila Resort',
    scope: 'Chartered flights from Islamabad, luxury 4x4 convoys, gala dinner under the stars at Cold Desert, and keynote seminar setup.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop'
  },
  {
    client: 'Multinational FMCG Corporation',
    attendees: '85 Executives',
    destination: 'Dubai Marina & Desert Safari',
    scope: '5-star Marina hotel takeover, private yacht dinner cruise, dune bashing team challenge, and business visa express clearances.',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop'
  },
  {
    client: 'National Engineering Group',
    attendees: '60 Pilgrims',
    destination: 'Makkah & Madinah (VIP Umrah)',
    scope: 'Executive Umrah program with Haram view suites at Clock Tower, private GMC Suburban convoy, and dedicated religious scholars.',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800&auto=format&fit=crop'
  }
];

const CorporatePage: React.FC = () => {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPackageName, setModalPackageName] = useState('Corporate RFP Inquiry');
  const [modalNotes, setModalNotes] = useState('');

  // RFP Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('Annual Company Retreat (Northern Pakistan)');
  const [headcount, setHeadcount] = useState('25 - 50 Pax');
  const [targetDate, setTargetDate] = useState('');
  const [budgetPerPerson, setBudgetPerPerson] = useState('$500 - $1,000');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRFPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !workEmail.trim() || !phone.trim()) {
      showToast('Required Fields Missing', 'Please fill in all mandatory company contact details.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast(
        'Corporate RFP Received!',
        `Thank you ${contactPerson}. A Senior Corporate Account Director will review ${companyName}'s brief and send a proposal within 4 hours.`,
        'success'
      );
      setCompanyName('');
      setContactPerson('');
      setWorkEmail('');
      setPhone('');
      setAdditionalRequirements('');
      setTargetDate('');
    }, 600);
  };

  const handleOpenQuickInquiry = (serviceTitle: string) => {
    setModalPackageName(`Corporate Solution: ${serviceTitle}`);
    setModalNotes(`Inquiring regarding ${serviceTitle} for corporate delegation. Please provide custom quotation.`);
    setModalOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="bg-navy-900 pt-32 pb-24 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4 border border-cyan-400/30">
              <Briefcase size={14} /> {BRAND_NAME} Corporate &amp; MICE Division
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight leading-tight">
              Enterprise Travel &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400">
                Corporate Delegations
              </span>
            </h1>
            <p className="text-gray-300 text-sm sm:text-base font-light leading-relaxed mb-8">
              End-to-end corporate retreat orchestration, executive Umrah groups, flexible corporate airline ticketing, and business visa compliance for top organizations.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="#rfp-section"
                className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-extrabold px-8 py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
              >
                Submit Corporate RFP / Brief
              </a>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-xl text-xs transition-all border border-white/20"
              >
                Direct Corporate Desk: {CONTACT_INFO.displayPhone}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-12 relative z-20 max-w-6xl">
        {/* Core Pillars Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { metric: '150+', label: 'Corporate Clients Served' },
            { metric: '15,000+', label: 'Business Travelers Managed' },
            { metric: '99.4%', label: 'Flight On-Time Rerouting' },
            { metric: '24/7/365', label: 'Dedicated Account Support' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 text-center shadow-xl border border-gray-100">
              <span className="text-2xl sm:text-3xl font-black text-navy-900 block mb-1">{stat.metric}</span>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Corporate Solutions Bento Grid */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Tailored Enterprise Services</span>
            <h2 className="text-3xl font-extrabold text-navy-900 mb-2">Corporate Solutions Portfolio</h2>
            <p className="text-gray-600 text-xs sm:text-sm">From annual company excursions to high-volume corporate ticketing accounts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CORPORATE_SERVICES.map((serv, idx) => {
              const Icon = serv.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Icon size={24} />
                      </div>
                      <span className="bg-navy-50 text-navy-900 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                        {serv.highlight}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-navy-900 mb-2">{serv.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6">{serv.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenQuickInquiry(serv.title)}
                    className="w-full bg-navy-50 hover:bg-navy-900 hover:text-white text-navy-900 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Request Custom Proposal</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why Corporates Choose GNK Connect */}
        <div className="bg-navy-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl mb-20 border border-navy-800">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-400 font-bold uppercase tracking-wider text-xs block mb-1">Enterprise Benefits</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Why Corporate Leaders Partner With Us</h2>
            <p className="text-gray-300 text-xs sm:text-sm">Engineered for procurement transparency, executive comfort, and cost efficiency.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CORPORATE_PERKS.map((perk, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">{perk.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Case Studies / Past Delegations */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Track Record of Excellence</span>
            <h2 className="text-3xl font-extrabold text-navy-900 mb-2">Featured Corporate Delegations</h2>
            <p className="text-gray-600 text-xs sm:text-sm">A glimpse into recent large-scale corporate programs executed by our teams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAST_CASE_STUDIES.map((cs, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="h-48 relative overflow-hidden">
                    <img src={cs.image} alt={cs.client} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-navy-900/90 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-bold text-cyan-300">
                      {cs.attendees}
                    </div>
                  </div>
                  <div className="p-6">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase block mb-1">{cs.destination}</span>
                    <h3 className="font-bold text-base text-navy-900 mb-2">{cs.client}</h3>
                    <p className="text-gray-600 text-xs leading-relaxed">{cs.scope}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RFP / Proposal Submission Form Section */}
        <div id="rfp-section" className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-100">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Fast Turnaround (Within 4 Hours)</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mb-2">Request Corporate Proposal (RFP)</h2>
            <p className="text-gray-600 text-xs sm:text-sm">Fill out the brief below. Our enterprise desk will create an itemized itinerary and cost estimate.</p>
          </div>

          <form onSubmit={handleRFPSubmit} className="space-y-4 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Systems Limited / Habib Bank"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Person &amp; Title *</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Tariq Mehmood (Head of HR)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Official Work Email *</label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Direct Phone / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300 1234567"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Service Required</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Annual Company Retreat (Northern Pakistan)">Annual Company Retreat</option>
                  <option value="International Corporate Delegation (Dubai/Baku)">International Delegation</option>
                  <option value="Corporate Employee Umrah Batch">Corporate Umrah Batch</option>
                  <option value="Dedicated Air Ticketing Account">Dedicated Ticketing Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Headcount</label>
                <select
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="10 - 25 Pax">10 - 25 Pax (Small Delegation)</option>
                  <option value="25 - 50 Pax">25 - 50 Pax (Mid Sized Group)</option>
                  <option value="50 - 150 Pax">50 - 150 Pax (Large Retreat)</option>
                  <option value="150+ Pax">150+ Pax (Full Charter / Mega)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Travel Month</label>
                <input
                  type="text"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  placeholder="e.g. May 2025"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Budget / Pax</label>
                <select
                  value={budgetPerPerson}
                  onChange={(e) => setBudgetPerPerson(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="$300 - $600 (Economy)">$300 - $600 / person</option>
                  <option value="$600 - $1,200 (Executive)">$600 - $1,200 / person</option>
                  <option value="$1,200 - $2,500 (VIP Luxury)">$1,200 - $2,500 / person</option>
                  <option value="$2,500+ (Custom Deluxe)">$2,500+ / person</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Event Goals, Specific Destinations, or Special Requirements</label>
              <textarea
                rows={4}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Mention conference hall requirements, preferred hotel chains, private charter preferences, team building activities..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white font-bold py-4 rounded-xl text-xs transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Transmitting RFP...' : 'Submit Corporate RFP & Request Quotation'}</span>
            </button>
          </form>
        </div>
      </div>

      <InquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageName={modalPackageName}
        initialNotes={modalNotes}
      />
    </div>
  );
};

export default CorporatePage;
