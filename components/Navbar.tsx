import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Phone, 
  ChevronDown, 
  Compass, 
  Globe, 
  Bookmark, 
  ShieldCheck, 
  MessageCircle, 
  Sparkles,
  FileSearch,
  CheckSquare,
  Newspaper,
  Star,
  ExternalLink,
  Lock
} from 'lucide-react';
import { CONTACT_INFO, SERVICES, BRAND_NAME } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency, CurrencyCode, CURRENCIES } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currencyDropdown, setCurrencyDropdown] = useState<boolean>(false);
  const { currency, setCurrency } = useCurrency();
  const { savedItems, setIsDrawerOpen } = useWishlist();
  const location = useLocation();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu & dropdowns on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
    setCurrencyDropdown(false);
  }, [location]);

  const handleMouseEnter = (name: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const travelTools = [
    {
      title: 'AI Trip Planner',
      desc: 'Build personalized itineraries with smart budget estimates',
      path: '/planner',
      icon: Sparkles,
      badge: 'AI Powered'
    },
    {
      title: 'Visa Status Tracker',
      desc: 'Live tracking for Umrah, Dubai & sticker visas',
      path: '/tracking',
      icon: FileSearch,
      badge: 'Live'
    },
    {
      title: 'Packing Checklist',
      desc: 'Interactive baggage builder tailored for your destination',
      path: '/checklist',
      icon: CheckSquare,
      badge: null
    },
    {
      title: 'Travel Guides & Insights',
      desc: 'Visa policies, pilgrimage tips, and destination guides',
      path: '/news',
      icon: Newspaper,
      badge: null
    },
    {
      title: 'Traveler Reviews',
      desc: 'Real verified feedback from individual and group travelers',
      path: '/reviews',
      icon: Star,
      badge: '4.9 ★'
    }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* 1. TOP UTILITY BAR (Desktop & Tablet) */}
      <div className="hidden md:block bg-slate-950/90 border-b border-slate-800/80 text-xs text-slate-300 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          {/* Left: Contact, WhatsApp & Accreditation */}
          <div className="flex items-center gap-5">
            <a 
              href={`tel:${CONTACT_INFO.phone}`}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <Phone size={12} className="text-cyan-400" />
              <span className="font-semibold">{CONTACT_INFO.displayPhone}</span>
              <span className="text-slate-500 text-[10px]">(24/7 Helpline)</span>
            </a>

            <a 
              href={`https://wa.me/${CONTACT_INFO.whatsapp}?text=Hello%20GNK%20Connect,%20I%20would%20like%20to%20inquire%20about%20travel%20packages`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <MessageCircle size={12} />
              <span>WhatsApp Direct</span>
            </a>

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 pl-3 border-l border-slate-800">
              <ShieldCheck size={13} className="text-cyan-400" />
              <span>DTS Lic. # 4920 • IATA Accredited Partner</span>
            </div>
          </div>

          {/* Right: Currency, Wishlist & B2B Entry Points */}
          <div className="flex items-center gap-3.5">
            {/* Currency Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdown(!currencyDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all"
                aria-label="Select display currency"
              >
                <Globe size={11} className="text-cyan-400" />
                <span>{currency}</span>
                <ChevronDown size={10} />
              </button>

              <AnimatePresence>
                {currencyDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full right-0 mt-1.5 w-32 bg-slate-900/98 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-xl"
                  >
                    {Object.keys(CURRENCIES).map((key) => {
                      const code = key as CurrencyCode;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setCurrency(code);
                            setCurrencyDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between ${
                            currency === code
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span>{code}</span>
                          <span className="opacity-70 text-[10px]">{CURRENCIES[code].symbol}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
              aria-label="View saved travel wishlist"
            >
              <Bookmark size={11} className="text-cyan-400" />
              <span>Saved</span>
              {savedItems.length > 0 && (
                <span className="bg-cyan-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {savedItems.length}
                </span>
              )}
            </button>

            {/* Agent / B2B Portal Button */}
            <Link
              to="/agent/dashboard"
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 transition-all shadow-sm"
              aria-label="Access B2B Partner Portal"
            >
              <Compass size={12} />
              <span>Agent Portal</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded uppercase tracking-wider font-extrabold">B2B</span>
            </Link>

            {/* Admin Quick Gateway */}
            <Link
              to="/admin"
              className="text-[11px] font-medium text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <Lock size={10} />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION BAR (Sticky & Glassmorphic) */}
      <nav 
        role="navigation"
        aria-label="Main Navigation"
        className={`w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl py-2.5' 
            : 'bg-slate-950/80 backdrop-blur-md border-b border-slate-800/40 py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-xl px-1 py-0.5"
              aria-label={`${BRAND_NAME} Home`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  GNK <span className="text-cyan-400">CONNECT</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-300/80 -mt-1">
                  Travel & Tourism • B2B & Luxury
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {/* Home */}
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                  location.pathname === '/' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                Home
              </Link>

              {/* Group Departures (Wholesale & Consumer) */}
              <Link
                to="/groups"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/groups' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <span>Group Departures</span>
                <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                  Hot
                </span>
              </Link>

              {/* Services Mega Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('services')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/services"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors flex items-center gap-1 ${
                    location.pathname.startsWith('/services') ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === 'services'}
                >
                  <span>Services</span>
                  <ChevronDown size={14} className={`mt-0.5 transition-transform duration-200 ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
                </Link>

                <AnimatePresence>
                  {activeDropdown === 'services' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 w-[460px] bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl rounded-2xl mt-1.5 p-4 z-50"
                    >
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                        Premium Travel Solutions
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {SERVICES.map((service) => (
                          <Link 
                            key={service.id} 
                            to={service.link}
                            className="flex flex-col p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group/item"
                          >
                            <span className="text-sm font-bold text-slate-100 group-hover/item:text-cyan-400 transition-colors">
                              {service.title}
                            </span>
                            <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {service.description}
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between px-2">
                        <span className="text-xs text-slate-400">Looking for corporate packages?</span>
                        <Link to="/corporate" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                          Corporate Portal <ExternalLink size={11} />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Destinations */}
              <Link
                to="/destinations"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                  location.pathname === '/destinations' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                Destinations
              </Link>

              {/* Travel Tools Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('tools')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors flex items-center gap-1 ${
                    ['/planner', '/tracking', '/checklist', '/news', '/reviews'].some(p => location.pathname.startsWith(p))
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === 'tools'}
                >
                  <span>Travel Tools</span>
                  <ChevronDown size={14} className={`mt-0.5 transition-transform duration-200 ${activeDropdown === 'tools' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'tools' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 w-80 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl rounded-2xl mt-1.5 p-3 z-50"
                    >
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                        Interactive Travel Utilities
                      </div>
                      <div className="space-y-1">
                        {travelTools.map((tool) => {
                          const Icon = tool.icon;
                          return (
                            <Link 
                              key={tool.title} 
                              to={tool.path}
                              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group/tool"
                            >
                              <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 group-hover/tool:bg-cyan-500 group-hover/tool:text-slate-950 transition-colors">
                                <Icon size={16} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-100 group-hover/tool:text-cyan-400 transition-colors">
                                    {tool.title}
                                  </span>
                                  {tool.badge && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                                      {tool.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {tool.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* About Us */}
              <Link
                to="/about"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                  location.pathname === '/about' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                About Us
              </Link>

              {/* Contact */}
              <Link
                to="/contact"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                  location.pathname === '/contact' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-200 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                Contact
              </Link>
            </div>

            {/* Right Action CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/planner"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-5 py-2.5 rounded-full text-sm font-black transition-all shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95"
              >
                <Sparkles className="h-4 w-4 text-slate-950" />
                <span>Plan Your Journey</span>
              </Link>
            </div>

            {/* Mobile Actions (Wishlist & Hamburger Menu) */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200"
                aria-label="View saved wishlist"
              >
                <Bookmark size={18} className="text-cyan-400" />
                {savedItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-cyan-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {savedItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="p-2 text-white hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg bg-slate-900 border border-slate-800"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close menu" : "Open navigation menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden w-full bg-slate-950/98 backdrop-blur-2xl border-t border-slate-800/80 shadow-2xl overflow-y-auto max-h-[85vh]"
            >
              <div className="flex flex-col p-5 space-y-5">
                {/* B2B Agent Portal Mobile Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Compass size={14} /> B2B Partner Network
                    </span>
                    <span className="text-[10px] bg-cyan-500 text-slate-950 px-1.5 py-0.5 rounded font-black">AirDesk GDS</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Wholesale group inventory, instant seat allocations, and credit lines for travel agencies.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to="/agent/dashboard"
                      className="flex-1 text-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2 rounded-xl font-bold text-xs shadow-md transition-colors"
                    >
                      Agent Portal
                    </Link>
                    <Link
                      to="/agent/login"
                      className="px-4 text-center bg-slate-900 border border-slate-700 text-slate-200 hover:text-white py-2 rounded-xl font-bold text-xs"
                    >
                      Login
                    </Link>
                  </div>
                </div>

                {/* Currency Selector Mobile */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Currency</span>
                  <div className="flex gap-1.5">
                    {Object.keys(CURRENCIES).map((key) => {
                      const code = key as CurrencyCode;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setCurrency(code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            currency === code ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Nav Links */}
                <div className="space-y-1">
                  <Link
                    to="/"
                    className="text-base font-bold text-white hover:text-cyan-400 block py-2 px-3 rounded-lg hover:bg-slate-900"
                  >
                    Home
                  </Link>

                  <Link
                    to="/groups"
                    className="flex items-center justify-between text-base font-bold text-white hover:text-cyan-400 py-2 px-3 rounded-lg hover:bg-slate-900"
                  >
                    <span>Group Departures</span>
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Wholesale</span>
                  </Link>

                  <Link
                    to="/destinations"
                    className="text-base font-bold text-white hover:text-cyan-400 block py-2 px-3 rounded-lg hover:bg-slate-900"
                  >
                    Destinations
                  </Link>

                  {/* Services Accordion */}
                  <div className="py-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                      Services
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-2">
                      {SERVICES.map((service) => (
                        <Link 
                          key={service.id} 
                          to={service.link}
                          className="text-sm font-semibold text-slate-300 py-1.5 px-3 rounded-lg hover:bg-slate-900 hover:text-cyan-400 flex items-center justify-between"
                        >
                          <span>{service.title}</span>
                          <span className="text-[10px] text-slate-500">{service.packages?.length || 0} Packages</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Travel Tools */}
                  <div className="py-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                      Travel Tools & Insights
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-2">
                      {travelTools.map((tool) => (
                        <Link 
                          key={tool.title} 
                          to={tool.path}
                          className="text-sm font-semibold text-slate-300 py-1.5 px-3 rounded-lg hover:bg-slate-900 hover:text-cyan-400 flex items-center justify-between"
                        >
                          <span>{tool.title}</span>
                          {tool.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                              {tool.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link
                    to="/about"
                    className="text-base font-bold text-white hover:text-cyan-400 block py-2 px-3 rounded-lg hover:bg-slate-900"
                  >
                    About Us
                  </Link>

                  <Link
                    to="/contact"
                    className="text-base font-bold text-white hover:text-cyan-400 block py-2 px-3 rounded-lg hover:bg-slate-900"
                  >
                    Contact Us
                  </Link>
                </div>

                {/* Helpline CTA Mobile */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <a
                    href={`tel:${CONTACT_INFO.phone}`}
                    className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white py-3 rounded-xl font-bold text-sm"
                  >
                    <Phone className="h-4 w-4 text-cyan-400" />
                    Call Helpline: {CONTACT_INFO.displayPhone}
                  </a>

                  <Link
                    to="/admin"
                    className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 py-1.5"
                  >
                    <Lock size={12} />
                    <span>GNK Operations Admin Gateway</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Navbar;