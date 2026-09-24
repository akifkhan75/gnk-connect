import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Star, Map, Moon, FileCheck, Hotel, Plane, ShieldCheck, Globe, ChevronRight, Compass, Bookmark } from 'lucide-react';
import { FEATURED_DESTINATIONS, INTERNATIONAL_DESTINATIONS, SERVICES, TESTIMONIALS, LATEST_NEWS, BRAND_NAME } from '../constants';
import { ServiceIconType } from '../types';
import FlightHotelSearch from '../components/FlightHotelSearch';
import TravelCalculator from '../components/TravelCalculator';
import PackageComparison from '../components/PackageComparison';
import VisaChecker from '../components/VisaChecker';
import NewsletterSubscription from '../components/NewsletterSubscription';
import InquiryModal from '../components/InquiryModal';
import FAQSection from '../components/FAQSection';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

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

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackageName, setSelectedPackageName] = useState('Custom Travel Inquiry');
  const [customNotes, setCustomNotes] = useState('');
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const { isSaved, toggleSave } = useWishlist();
  const navigate = useNavigate();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/destinations?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/destinations');
    }
  };

  const openInquiryForPackage = (pkgTitle: string, defaultNote = '') => {
    setSelectedPackageName(pkgTitle);
    setCustomNotes(defaultNote);
    setModalOpen(true);
  };

  const handleCalculatorEstimate = (summary: string) => {
    openInquiryForPackage('Custom Calculator Estimate', summary);
    showToast('Estimate Selected', 'Please enter your contact details to lock this custom quotation.', 'info');
  };

  return (
    <div className="w-full overflow-hidden bg-gray-50">
      {/* 1. Hero Section */}
      <section className="relative min-h-[750px] lg:h-screen flex items-center justify-center overflow-hidden bg-navy-900 pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-navy-900/60 mix-blend-multiply z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-navy-900/70 z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
            alt="Scenic mountain valley and luxury travel"
            className="w-full h-full object-cover scale-105"
          />
        </div>
        
        {/* Ambient Glows */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-cyan-500/25 rounded-full mix-blend-screen filter blur-3xl opacity-60 animate-blob z-0 pointer-events-none"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-600/25 rounded-full mix-blend-screen filter blur-3xl opacity-60 animate-blob z-0 pointer-events-none"></div>

        <div className="relative z-20 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 text-xs md:text-sm font-bold tracking-widest uppercase mb-6 shadow-xl">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{BRAND_NAME} Executive Travel</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Journey Beyond <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400">
                Expectations
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Premium Executive Umrah packages, worldwide sticker visas, corporate flight bookings, and handcrafted tour experiences.
            </p>

            {/* Live Search Form */}
            <form onSubmit={handleHeroSearch} className="glass p-2 rounded-full max-w-xl mx-auto flex items-center gap-2 shadow-2xl border border-white/25">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where do you want to travel? (e.g. Skardu, Dubai, Umrah)..." 
                aria-label="Search travel destinations"
                className="flex-1 bg-transparent px-5 py-3 text-white placeholder-gray-300 outline-none text-sm md:text-base"
              />
              <button 
                type="submit"
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-navy-900 px-7 py-3 rounded-full font-bold text-sm md:text-base transition-all shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 shrink-0"
              >
                Search
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* 2. Key Services Floating Strip */}
      <section className="relative z-30 -mt-16 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap justify-center gap-3 md:gap-5">
            {SERVICES.map((service, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                key={service.id}
              >
                <Link 
                  to={service.link} 
                  className="flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white hover:bg-navy-900 hover:border-navy-700 group transition-all duration-300 hover:-translate-y-2 p-3 text-center"
                >
                  <div className="mb-2 text-cyan-600 group-hover:text-cyan-400 transition-colors">
                    <ServiceIcon name={service.iconName} size={28} />
                  </div>
                  <span className="text-xs font-bold text-navy-900 group-hover:text-white leading-tight line-clamp-2">
                    {service.title.replace('Executive ', '').replace(' (Sticker Visas)', '')}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 2.5 Multi-Service Booking & Search Engine */}
      <section className="container mx-auto px-4 md:px-6 pb-16">
        <FlightHotelSearch />
      </section>

      {/* 3. Featured Destinations */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeInUp} className="flex justify-between items-end mb-12">
            <div>
              <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Domestic Expeditions</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-900 tracking-tight">Trending Destinations in Pakistan</h2>
              <div className="h-1 w-20 bg-cyan-500 rounded-full mt-3"></div>
            </div>
            <Link 
              to="/destinations" 
              className="hidden md:flex items-center gap-2 text-navy-700 font-bold hover:text-cyan-600 transition-colors"
            >
              View All Locations <ArrowRight size={18} />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURED_DESTINATIONS.map((dest, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                viewport={{ once: true }}
                key={dest.id} 
                className="group relative h-[440px] rounded-3xl overflow-hidden shadow-xl"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/30 to-transparent opacity-90"></div>
                
                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSave({
                    id: dest.id,
                    type: 'destination',
                    title: dest.name,
                    category: 'Domestic Tour',
                    image: dest.image,
                    price: formatPrice(dest.price),
                  })}
                  className={`absolute top-5 left-5 p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                    isSaved(dest.id)
                      ? 'bg-cyan-500 text-navy-900'
                      : 'bg-navy-900/60 text-white hover:bg-navy-900'
                  }`}
                  aria-label={isSaved(dest.id) ? `Remove ${dest.name} from saved` : `Save ${dest.name}`}
                >
                  <Bookmark size={15} className={isSaved(dest.id) ? 'fill-navy-900' : ''} />
                </button>

                <div className="absolute top-5 right-5 bg-white/20 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/30">
                  From {formatPrice(dest.price)}
                </div>

                <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="fill-gold-500 text-gold-500 w-4 h-4" />
                    <span className="text-gold-400 font-bold text-xs">{dest.rating} (Top Rated)</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{dest.name}</h3>
                  <div className="flex items-center gap-3 text-gray-300 text-xs mb-5">
                    <span>{dest.duration}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>{dest.activities} Activities Included</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => openInquiryForPackage(`${dest.name} Tour Package`, `I am interested in booking the ${dest.name} tour package (${dest.duration}, starting at ${formatPrice(dest.price)}).`)}
                    className="inline-flex items-center justify-center w-full bg-cyan-500 text-navy-900 py-3 rounded-xl font-bold hover:bg-cyan-400 transition-colors shadow-lg"
                  >
                    Request Itinerary & Book
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Interactive Travel Cost Estimator */}
      <section className="py-20 bg-gray-50 border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <TravelCalculator onBookEstimate={handleCalculatorEstimate} />
        </div>
      </section>

      {/* 5. Comprehensive Services Bento Grid */}
      <section className="py-20 bg-white border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Tailored Solutions</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-3">Complete Travel Portfolio</h2>
            <p className="text-gray-600 text-base">Everything you need for a seamless journey, orchestrated under one roof.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICES.slice(0, 6).map((service, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                key={service.id}
                className={`group relative overflow-hidden rounded-3xl p-8 bg-white border border-gray-100 shadow-lg hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 ${
                  i === 0 || i === 5 ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3.5 bg-navy-50 rounded-2xl text-navy-700 group-hover:bg-cyan-500 group-hover:text-navy-900 transition-colors">
                    <ServiceIcon name={service.iconName} size={26} />
                  </div>
                  <Link 
                    to={service.link} 
                    aria-label={`View details for ${service.title}`}
                    className="p-2.5 bg-gray-50 rounded-full hover:bg-navy-900 hover:text-white transition-colors"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-2.5 group-hover:text-cyan-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm mb-4">
                  {service.description}
                </p>
                <div className="flex items-center justify-between">
                  <Link to={service.link} className="inline-flex items-center text-xs font-bold text-cyan-600 hover:text-cyan-500 transition-colors">
                    View Packages <ArrowRight size={14} className="ml-1" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openInquiryForPackage(service.title, `Inquiry for ${service.title}`)}
                    className="text-xs font-bold bg-navy-50 hover:bg-navy-900 hover:text-white text-navy-900 px-3.5 py-1.5 rounded-lg transition-colors"
                  >
                    Quick Inquiry
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trust & Mission Section */}
      <section className="py-20 bg-navy-900 text-white overflow-hidden relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            <div className="lg:w-1/2">
              <motion.div {...fadeInUp}>
                <span className="text-cyan-400 font-bold tracking-wider uppercase text-xs mb-3 block">About {BRAND_NAME}</span>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  Crafting Journeys, <br />
                  Creating <span className="text-cyan-400">Memories</span>
                </h2>
                <p className="text-gray-300 text-base leading-relaxed mb-8">
                  {BRAND_NAME} is your premier travel management partner based in Islamabad. We combine personalized concierge service, direct GDS airline ticketing, verified 5-star hotel partnerships, and complete visa documentation to guarantee stress-free travel.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    '24/7 Dedicated Concierge Desk',
                    '5-Star Haram Proximity Umrah',
                    'High Success Visa Processing',
                    'Verified Northern Luxury Stays'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="p-1 bg-cyan-500/20 rounded-full text-cyan-400">
                        <CheckCircle size={16} />
                      </div>
                      <span className="text-sm font-medium text-white">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link 
                    to="/about" 
                    className="inline-block bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-navy-900 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Learn More About Us
                  </Link>
                  <button
                    type="button"
                    onClick={() => openInquiryForPackage('VIP Consultation', 'Requesting a dedicated consultation with a senior GNK Connect travel advisor.')}
                    className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all border border-white/20"
                  >
                    Schedule Consultation
                  </button>
                </div>
              </motion.div>
            </div>
            
            <div className="lg:w-1/2 relative w-full">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop" 
                  alt="Tropical luxury beach vacation" 
                  className="w-full h-80 sm:h-96 object-cover" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. International Getaways */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Global Tours</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-2">Curated International Holidays</h2>
            <p className="text-gray-600 text-sm">Hand-picked packages for the world's most captivating destinations.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {INTERNATIONAL_DESTINATIONS.map((country) => (
              <div 
                key={country.id} 
                onClick={() => openInquiryForPackage(`${country.name} Holiday Package`, `Inquiring for ${country.name} package from ${formatPrice(country.price)}.`)}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4] shadow-md hover:shadow-2xl transition-all cursor-pointer"
              >
                <img 
                  src={country.image} 
                  alt={country.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-900/20 to-navy-900 opacity-90"></div>
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <h3 className="font-bold text-base md:text-lg text-white mb-1">{country.name}</h3>
                  <div className="h-0.5 w-8 bg-cyan-500 mb-1.5 transition-all duration-300 group-hover:w-full"></div>
                  <p className="text-xs text-gray-200 flex justify-between items-center">
                    <span>From {formatPrice(country.price)}</span>
                    <span className="text-[10px] font-bold text-cyan-300 bg-white/10 px-2 py-0.5 rounded">Book</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Testimonials */}
      <section className="py-20 bg-gray-50 border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Client Reviews</span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-900">What Travelers Say</h2>
              <div className="h-1 w-20 bg-cyan-500 rounded-full mt-3"></div>
            </div>
            <Link
              to="/reviews"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 hover:text-cyan-600 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
            >
              <span>View All 1,200+ Reviews</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={item.id} 
                className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-gray-100 flex flex-col justify-between"
              >
                <p className="text-gray-600 leading-relaxed italic text-sm mb-6">"{item.comment}"</p>
                <div className="flex items-center gap-3.5">
                  <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover border-2 border-cyan-200" />
                  <div>
                    <h4 className="font-bold text-navy-900 text-sm">{item.name}</h4>
                    <p className="text-xs text-cyan-600 font-semibold">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8.5 Umrah Comparison Matrix */}
      <section className="py-20 bg-white border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Package Matrix</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-3">Compare Umrah Tiers</h2>
            <p className="text-gray-600 text-sm">Transparent inclusions, hotel ratings, and transport options across all packages.</p>
          </div>
          <PackageComparison onSelectPackage={(pkg) => openInquiryForPackage(pkg, `Selected via comparison matrix: ${pkg}`)} />
        </div>
      </section>

      {/* 8.6 Visa Rules & Requirements Checker */}
      <section className="py-20 bg-gray-50 border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Visa Intelligence</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-3">Visa Requirements &amp; Turnarounds</h2>
            <p className="text-gray-600 text-sm">Select your target destination to view mandatory documents and embassy processing speeds.</p>
          </div>
          <VisaChecker onApply={(title, notes) => openInquiryForPackage(title, notes)} />
        </div>
      </section>

      {/* 8.7 Price Drops & Advisory Newsletter */}
      <NewsletterSubscription />

      {/* 9. FAQ Section */}
      <FAQSection />

      {/* 10. Latest Insights */}
      <section className="py-20 bg-gray-50 border-t border-gray-200/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <span className="text-cyan-600 font-bold uppercase tracking-wider text-xs block mb-1">Travel Advisory</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900">Latest Insights & Guides</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LATEST_NEWS.map((news) => (
              <article key={news.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={news.image} 
                    alt={news.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-navy-900/90 backdrop-blur px-3 py-1 rounded-md text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                    {news.date}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-navy-900 mb-2 group-hover:text-cyan-600 transition-colors">
                      {news.title}
                    </h3>
                    <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mb-4">{news.excerpt}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => openInquiryForPackage(`Advisory: ${news.title}`, `Inquiry regarding the guide: ${news.title}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600 hover:text-cyan-500 text-left"
                  >
                    <span>Contact Advisory Desk</span> <ArrowRight size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageName={selectedPackageName}
        initialNotes={customNotes}
      />
    </div>
  );
};

export default Home;