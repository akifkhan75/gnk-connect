import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SERVICES } from '../constants';
import { CheckCircle, ArrowRight, ArrowLeft, Moon, FileCheck, Hotel, Plane, Map, ShieldCheck, Globe, Upload, Calendar, Users, Info, ChevronRight, Check } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Moon': return <Moon />;
      case 'FileCheck': return <FileCheck />;
      case 'Hotel': return <Hotel />;
      case 'Plane': return <Plane />;
      case 'Map': return <Map />;
      case 'ShieldCheck': return <ShieldCheck />;
      case 'Globe': return <Globe />;
      default: return <CheckCircle />;
    }
  };

  const activeService = slug ? SERVICES.find(s => s.link.endsWith(slug)) : null;

  useEffect(() => {
    if (slug && !activeService) {
        navigate('/services');
    }
  }, [slug, activeService, navigate]);

  // --- Form Components ---
  
  const VisaForm = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Documents uploaded successfully! Our visa team will contact you shortly.");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm" placeholder="As on passport" />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Number</label>
                <input type="tel" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm" placeholder="0300..." />
            </div>
            
            <div className="p-4 bg-cyan-50/50 rounded-xl border-2 border-dashed border-cyan-200 hover:border-cyan-400 transition-colors group cursor-pointer">
                <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="text-cyan-500 mb-2 group-hover:scale-110 transition-transform" size={24} />
                    <span className="text-sm font-bold text-navy-800">Upload Passport</span>
                    <span className="text-xs text-gray-500 mt-1">PDF or JPG (Max 2MB)</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                </label>
            </div>

            <div className="p-4 bg-cyan-50/50 rounded-xl border-2 border-dashed border-cyan-200 hover:border-cyan-400 transition-colors group cursor-pointer">
                <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="text-cyan-500 mb-2 group-hover:scale-110 transition-transform" size={24} />
                    <span className="text-sm font-bold text-navy-800">Bank Statement</span>
                    <span className="text-xs text-gray-500 mt-1">Last 6 Months</span>
                    <input type="file" className="hidden" accept=".pdf" />
                </label>
            </div>

            <button type="submit" className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-cyan-500 hover:text-navy-900 transition-colors shadow-lg">
                Submit Application
            </button>
        </form>
    );
  };

  const BookingForm = ({ packages }: { packages?: { name: string }[] }) => {
      const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          alert("Booking inquiry sent! We will confirm availability shortly.");
      };

      return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="Your Name" />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Package</label>
                <div className="relative">
                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm appearance-none">
                        <option value="">-- Choose a Package --</option>
                        {packages?.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
                        <option value="Custom">Custom Package</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-gray-500">▼</div>
                </div>
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Travel Date</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-3 text-gray-400" size={18} />
                    <input type="date" required className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Adults</label>
                    <div className="relative">
                        <Users className="absolute left-4 top-3 text-gray-400" size={18} />
                        <input type="number" min="1" defaultValue="1" className="w-full pl-12 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Children</label>
                    <input type="number" min="0" defaultValue="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" placeholder="0" />
                </div>
            </div>

            <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Number</label>
                 <input type="tel" placeholder="0300 1234567" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>

            <button type="submit" className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-cyan-500 hover:text-navy-900 transition-colors shadow-lg">
                Request Booking
            </button>
        </form>
      );
  };

  // --- MAIN LISTING VIEW ---
  if (!activeService) {
    return (
      <div className="pt-20 bg-gray-50 min-h-screen">
        <div className="bg-navy-900 text-white py-20 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl"></div>
          </div>
          <div className="container mx-auto text-center relative z-10">
            <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-2 block">What We Do</span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Our Premium Services</h1>
            <p className="text-navy-100 max-w-2xl mx-auto text-lg font-light">
              From executive Umrah packages to complex visa processing, we handle the details so you can enjoy the journey.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SERVICES.map((service, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={service.id}
                >
                  <Link to={service.link} className="group block h-full bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity scale-150">
                        {React.cloneElement(getServiceIcon(service.iconName) as React.ReactElement<any>, { size: 100 })}
                     </div>
                     
                     <div className="relative z-10">
                        <div className="w-14 h-14 bg-navy-50 rounded-2xl flex items-center justify-center text-navy-900 mb-6 group-hover:bg-cyan-500 group-hover:text-white transition-colors shadow-sm">
                            {React.cloneElement(getServiceIcon(service.iconName) as React.ReactElement<any>, { size: 28 })}
                        </div>
                        <h3 className="text-2xl font-bold text-navy-900 mb-3 group-hover:text-cyan-600 transition-colors">{service.title}</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                        <div className="flex items-center text-sm font-bold text-navy-900 group-hover:text-cyan-500 transition-colors">
                            Learn More <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                     </div>
                  </Link>
                </motion.div>
              ))}
            </div>
        </div>
      </div>
    );
  }

  // --- DETAILED SERVICE VIEW ---
  const isVisa = activeService.title.toLowerCase().includes('visa');
  const isBookingService = activeService.packages && activeService.packages.length > 0;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
        {/* Immersive Header */}
        <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-navy-900">
            <img 
                src={activeService.image} 
                alt={activeService.title} 
                className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-navy-900/50"></div>
        </div>
        
        <div className="absolute inset-0 flex flex-col justify-center container mx-auto px-4 md:px-6 pt-20">
            <Link to="/services" className="inline-flex items-center gap-2 text-white/80 hover:text-cyan-400 transition-colors mb-6 font-medium w-fit px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
                <ArrowLeft size={16} /> Back to All Services
            </Link>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">{activeService.title}</h1>
                <p className="text-xl text-gray-200 max-w-2xl leading-relaxed font-light">{activeService.description}</p>
            </motion.div>
        </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 -mt-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10">
            {/* Main Content */}
            <div className="lg:w-2/3 space-y-10">
                {/* Overview Card */}
                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
                    <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center gap-3">
                        <Info className="text-cyan-500" /> Service Overview
                    </h2>
                    <p className="text-gray-600 leading-loose text-lg">
                        {activeService.longDescription || activeService.description}
                    </p>
                </div>
                
                {/* Packages Grid */}
                {activeService.packages && (
                    <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-navy-900">Available Packages</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeService.packages.map((pkg, idx) => (
                        <div key={idx} className="group border border-gray-200 rounded-3xl p-8 bg-white hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CheckCircle size={80} className="text-cyan-500" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl text-navy-900 group-hover:text-cyan-600 transition-colors">{pkg.name}</h3>
                                    {pkg.duration && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md mt-2 inline-block">{pkg.duration}</span>}
                                </div>
                                <div className="text-cyan-600 font-bold text-2xl">{pkg.price}</div>
                                </div>
                                <div className="h-px w-full bg-gray-100 my-4 group-hover:bg-cyan-100 transition-colors"></div>
                                <ul className="space-y-3 mb-6">
                                    {pkg.features.map((feature, fIdx) => (
                                        <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-600">
                                            <Check size={16} className="text-cyan-500 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="mt-auto w-full py-3 rounded-xl border-2 border-navy-900 text-navy-900 font-bold hover:bg-navy-900 hover:text-white transition-all">
                                    Select Package
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* Process Steps */}
                {activeService.processSteps && (
                    <div className="bg-navy-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full mix-blend-overlay filter blur-3xl"></div>
                        <h2 className="text-2xl font-bold mb-8 relative z-10">How It Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            {activeService.processSteps.map((step, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500 text-navy-900 font-bold flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                                        <p className="text-navy-100 text-sm opacity-80 leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Benefits */}
                {activeService.benefits && (
                    <div>
                        <h2 className="text-2xl font-bold text-navy-900 mb-6">Why Choose Us?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeService.benefits.map((benefit, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <CheckCircle size={20} />
                                    </div>
                                    <span className="font-medium text-gray-700">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="lg:w-1/3">
                <div className="sticky top-28 space-y-8">
                    {/* Booking / Inquiry Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <h3 className="text-xl font-bold text-navy-900 mb-2">
                            {isBookingService ? 'Plan Your Trip' : (isVisa ? 'Start Visa Application' : 'Get A Quote')}
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Fill out the details below and our agents will contact you instantly.
                        </p>
                        
                        {isVisa ? (
                            <VisaForm />
                        ) : isBookingService ? (
                            <BookingForm packages={activeService.packages} />
                        ) : (
                            <form className="space-y-4" onSubmit={(e) => {e.preventDefault(); alert('Inquiry Sent!')}}>
                                <input type="text" placeholder="Your Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                                <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                                <textarea rows={4} placeholder="Describe your requirements..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"></textarea>
                                <button className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-cyan-500 hover:text-navy-900 transition-colors shadow-lg">
                                    Send Inquiry
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Help Card */}
                    <div className="bg-cyan-500 p-8 rounded-3xl shadow-lg text-navy-900 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 opacity-20">
                            <Info size={150} />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                        <p className="text-sm opacity-80 mb-6 leading-relaxed">
                            Not sure which package is right for you? Speak to our travel consultants directly.
                        </p>
                        <a href="tel:0516137232" className="inline-block bg-white text-navy-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-navy-900 hover:text-white transition-colors shadow-md">
                            Call 051-6137232
                        </a>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </div>
  );
};

export default ServicesPage;