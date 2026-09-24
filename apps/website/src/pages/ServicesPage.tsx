import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SERVICES, BRAND_NAME, CONTACT_INFO } from '../constants';
import { CheckCircle, ArrowLeft, ArrowRight, Moon, FileCheck, Hotel, Plane, Map, ShieldCheck, Globe, Upload, Calendar, Users, Info, Check } from 'lucide-react';
import { ServiceIconType, ServicePackage } from '@gnk/types';
import InquiryModal from '../components/InquiryModal';
import ItineraryTimeline from '../components/ItineraryTimeline';
import PackageComparison from '../components/PackageComparison';
import VisaChecker from '../components/VisaChecker';
import FAQSection from '../components/FAQSection';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';

const ServiceIcon: React.FC<{ name: ServiceIconType; size?: number; className?: string }> = ({ name, size = 28, className }) => {
  switch (name) {
    case 'Moon': return <Moon size={size} className={className} />;
    case 'FileCheck': return <FileCheck size={size} className={className} />;
    case 'Hotel': return <Hotel size={size} className={className} />;
    case 'Plane': return <Plane size={size} className={className} />;
    case 'Map': return <Map size={size} className={className} />;
    case 'ShieldCheck': return <ShieldCheck size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    default: return <CheckCircle size={size} className={className} />;
  }
};

// Form 1: Visa Form
const VisaForm: React.FC<{ serviceTitle: string; onOpenModal: (pkg: string, note: string) => void }> = ({ serviceTitle, onOpenModal }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [visaType, setVisaType] = useState('Dubai UAE E-Visa');
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenModal(`${serviceTitle} (${visaType})`, `Applicant: ${fullName}, Phone: ${phone}. Visa Category: ${visaType}`);
    showToast('Visa Application Received', 'Please confirm your submission details.', 'info');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label htmlFor="visa-fullname" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
          Full Name *
        </label>
        <input 
          id="visa-fullname"
          type="text" 
          required 
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
          placeholder="As shown on passport" 
        />
      </div>
      <div>
        <label htmlFor="visa-phone" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
          Contact Phone / WhatsApp *
        </label>
        <input 
          id="visa-phone"
          type="tel" 
          required 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
          placeholder="0300 1234567" 
        />
      </div>

      <div>
        <label htmlFor="visa-type" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
          Destination Country / Visa Type
        </label>
        <select
          id="visa-type"
          value={visaType}
          onChange={(e) => setVisaType(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        >
          <option value="Dubai UAE E-Visa">Dubai (UAE) 30/60 Days E-Visa ($150)</option>
          <option value="Thailand Sticker Visa">Thailand Official Sticker Visa ($80)</option>
          <option value="Schengen File Consultation">Schengen Complete Dossier ($200)</option>
          <option value="UK & USA Visit Visa File">UK / USA File Preparation</option>
          <option value="Malaysia & Singapore Visa">Malaysia / Singapore E-Visa</option>
        </select>
      </div>
      
      <div className="p-4 bg-cyan-50/60 rounded-xl border-2 border-dashed border-cyan-200 hover:border-cyan-400 transition-colors text-center cursor-pointer">
        <Upload className="text-cyan-600 mx-auto mb-1" size={20} />
        <span className="text-xs font-bold text-navy-900 block">Attach Passport Copy (Optional)</span>
        <span className="text-[10px] text-gray-500">PDF, JPG, PNG (Max 5MB)</span>
      </div>

      <button 
        type="submit" 
        className="w-full bg-navy-900 text-white py-3.5 rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-navy-900 transition-colors shadow-lg"
      >
        Proceed to File Submission
      </button>
    </form>
  );
};

// Form 2: Booking Form
const BookingForm: React.FC<{ packages?: ServicePackage[]; serviceTitle: string; onOpenModal: (pkg: string, note: string) => void }> = ({ packages, serviceTitle, onOpenModal }) => {
  const [name, setName] = useState('');
  const [selectedPkg, setSelectedPkg] = useState(packages?.[0]?.name || 'Standard Package');
  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState('2');
  const [phone, setPhone] = useState('');
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenModal(`${serviceTitle} - ${selectedPkg}`, `Booking request for ${name} (${phone}), ${adults} travelers on date ${travelDate}.`);
    showToast('Booking Request Initiated', 'Please confirm your reservation details in the modal.', 'info');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
      <div>
        <label htmlFor="booking-name" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
          Full Name *
        </label>
        <input 
          id="booking-name"
          type="text" 
          required 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
          placeholder="Your Full Name" 
        />
      </div>

      <div>
        <label htmlFor="booking-package" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
          Select Package
        </label>
        <select 
          id="booking-package"
          value={selectedPkg}
          onChange={(e) => setSelectedPkg(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        >
          {packages?.map((p, i) => <option key={i} value={p.name}>{p.name} ({p.price})</option>)}
          <option value="Custom VIP Itinerary">Custom VIP Itinerary</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="booking-date" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
          Estimated Travel Date
        </label>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
          <input 
            id="booking-date"
            type="date" 
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="booking-adults" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
            Guests
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            <input 
              id="booking-adults"
              type="number" 
              min="1" 
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
            />
          </div>
        </div>
        <div>
          <label htmlFor="booking-phone" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
            Phone Number *
          </label>
          <input 
            id="booking-phone"
            type="tel" 
            placeholder="0300 1234567" 
            required 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" 
          />
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-navy-900 text-white py-3.5 rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-navy-900 transition-colors shadow-lg mt-2"
      >
        Request {serviceTitle} Reservation
      </button>
    </form>
  );
};

// Main Page Component
const ServicesPage: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPackageName, setModalPackageName] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const { formatPrice } = useCurrency();

  const activeService = slug ? SERVICES.find(s => s.link.endsWith(slug)) : null;

  useEffect(() => {
    if (slug && !activeService) {
      navigate('/services');
    }
  }, [slug, activeService, navigate]);

  const handleOpenModal = (pkg: string, note = '') => {
    setModalPackageName(pkg);
    setModalNotes(note);
    setModalOpen(true);
  };

  // Main Services Listing View
  if (!activeService) {
    return (
      <div className="pt-20 bg-gray-50 min-h-screen pb-20">
        <div className="bg-navy-900 text-white py-20 px-4 relative overflow-hidden">
          <div className="container mx-auto text-center relative z-10">
            <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-2 block">{BRAND_NAME} Services</span>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Premium Travel Portfolio</h1>
            <p className="text-gray-300 max-w-2xl mx-auto text-base font-light">
              From executive Umrah packages and express sticker visas to bespoke domestic expeditions and worldwide flights.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-16 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                key={service.id}
              >
                <div className="group block h-full bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 bg-navy-50 rounded-2xl flex items-center justify-center text-navy-900 mb-6 group-hover:bg-cyan-500 group-hover:text-navy-900 transition-colors shadow-sm">
                      <ServiceIcon name={service.iconName} size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-navy-900 mb-3 group-hover:text-cyan-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <Link to={service.link} className="inline-flex items-center text-xs font-bold text-cyan-600 hover:text-cyan-500 transition-colors">
                      <span>Explore Details</span> <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(service.title, `Quick inquiry for ${service.title}`)}
                      className="bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visa Intelligence Tool */}
          <VisaChecker onApply={handleOpenModal} />

          {/* Package Comparison Matrix */}
          <PackageComparison onSelectPackage={(pkg) => handleOpenModal(pkg, `Selected via package comparison matrix.`)} />

          {/* FAQs */}
          <FAQSection />
        </div>

        <InquiryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          packageName={modalPackageName}
          initialNotes={modalNotes}
        />
      </div>
    );
  }

  // Detailed Single Service View
  const isVisa = activeService.title.toLowerCase().includes('visa');
  const isUmrah = activeService.title.toLowerCase().includes('umrah');

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Immersive Header */}
      <div className="relative h-[50vh] min-h-[420px] w-full overflow-hidden bg-navy-900">
        <img 
          src={activeService.image} 
          alt={activeService.title} 
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-navy-900/40 to-navy-900/80"></div>
        
        <div className="absolute inset-0 flex flex-col justify-center container mx-auto px-4 md:px-6 pt-16">
          <Link 
            to="/services" 
            className="inline-flex items-center gap-1.5 text-white/90 hover:text-cyan-400 transition-colors mb-4 text-xs font-semibold w-fit px-3.5 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10"
          >
            <ArrowLeft size={14} /> Back to All Services
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              {activeService.title}
            </h1>
            <p className="text-base sm:text-lg text-gray-200 max-w-2xl leading-relaxed font-light">
              {activeService.description}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="lg:w-2/3 space-y-8">
            {/* Overview Card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100">
              <h2 className="text-xl font-bold text-navy-900 mb-4 flex items-center gap-2.5">
                <Info className="text-cyan-500" /> Executive Overview
              </h2>
              <p className="text-gray-600 leading-relaxed text-base">
                {activeService.longDescription || activeService.description}
              </p>
            </div>
            
            {/* Packages Grid */}
            {activeService.packages && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-navy-900">Available Tiered Packages</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeService.packages.map((pkg, idx) => (
                    <div 
                      key={idx} 
                      className="border border-gray-200 rounded-3xl p-6 bg-white hover:border-cyan-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-navy-900">{pkg.name}</h3>
                            {pkg.duration && (
                              <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                                {pkg.duration}
                              </span>
                            )}
                          </div>
                          <div className="text-cyan-600 font-extrabold text-2xl">
                            {formatPrice(pkg.price)}
                          </div>
                        </div>
                        <div className="h-px w-full bg-gray-100 my-3"></div>
                        <ul className="space-y-2 mb-6">
                          {pkg.features.map((feature, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2.5 text-xs text-gray-600">
                              <Check size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleOpenModal(`${activeService.title} - ${pkg.name}`, `Booking inquiry for ${pkg.name} (${formatPrice(pkg.price)}).`)}
                        className="w-full py-2.5 rounded-xl border-2 border-navy-900 text-navy-900 text-center font-bold text-xs hover:bg-navy-900 hover:text-white transition-all block"
                      >
                        Book {pkg.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itinerary Timeline */}
            {isUmrah && (
              <ItineraryTimeline />
            )}

            {/* Visa Checker on Visa Pages */}
            {isVisa && (
              <VisaChecker onApply={handleOpenModal} />
            )}

            {/* Process Steps */}
            {activeService.processSteps && (
              <div className="bg-navy-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <h2 className="text-xl font-bold mb-6">Seamless Step-by-Step Process</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeService.processSteps.map((step, i) => (
                    <div key={i} className="flex gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 text-navy-900 font-bold flex items-center justify-center shrink-0 shadow-lg text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                        <p className="text-gray-300 text-xs opacity-90 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Benefits */}
            {activeService.benefits && (
              <div>
                <h2 className="text-xl font-bold text-navy-900 mb-4">Why Book With {BRAND_NAME}?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeService.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="p-1.5 bg-green-50 text-green-600 rounded-lg shrink-0">
                        <CheckCircle size={16} />
                      </div>
                      <span className="font-medium text-gray-700 text-xs">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              {/* Inquiry Form */}
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <h3 className="text-lg font-bold text-navy-900 mb-1">
                  {isVisa ? 'Visa Document Intake' : 'Request Instant Reservation'}
                </h3>
                <p className="text-gray-500 text-xs mb-4">
                  Fill in your requirements for rapid confirmation from our executive desk.
                </p>
                
                {isVisa ? (
                  <VisaForm serviceTitle={activeService.title} onOpenModal={handleOpenModal} />
                ) : (
                  <BookingForm packages={activeService.packages} serviceTitle={activeService.title} onOpenModal={handleOpenModal} />
                )}
              </div>

              {/* Direct Telephone Card */}
              <div className="bg-navy-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <h4 className="font-bold text-base mb-1">Direct Consultant Helpline</h4>
                <p className="text-xs text-gray-300 mb-4">
                  Need immediate customized pricing or emergency date changes?
                </p>
                <a 
                  href={`tel:${CONTACT_INFO.phone}`} 
                  className="w-full bg-cyan-500 text-navy-900 py-3 rounded-xl font-bold text-xs hover:bg-cyan-400 transition-colors text-center block shadow-md"
                >
                  Call {CONTACT_INFO.displayPhone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global FAQ on Detailed Service */}
      <div className="mt-12">
        <FAQSection />
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

export default ServicesPage;