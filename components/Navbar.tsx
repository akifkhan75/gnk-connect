import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, ChevronDown, Compass, Globe, Bookmark } from 'lucide-react';
import { NAV_LINKS, CONTACT_INFO, SERVICES, BRAND_NAME } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency, CurrencyCode, CURRENCIES } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currencyDropdown, setCurrencyDropdown] = useState<boolean>(false);
  const { currency, setCurrency } = useCurrency();
  const { savedItems, setIsDrawerOpen } = useWishlist();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
    setCurrencyDropdown(false);
  }, [location]);

  return (
    <nav 
      role="navigation"
      aria-label="Main Navigation"
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'glass-dark py-3 shadow-2xl' : 'bg-navy-900/70 backdrop-blur-md py-4'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Brand Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-xl px-2 py-1"
            aria-label={`${BRAND_NAME} Home`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                GNK <span className="text-cyan-400">CONNECT</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-300/80 -mt-1">
                Travel & Tourism
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {NAV_LINKS.map((link) => {
              if (link.name === 'Services') {
                return (
                  <div 
                    key={link.name}
                    className="relative group"
                    onMouseEnter={() => setActiveDropdown('Services')}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      to={link.path}
                      className={`text-sm font-semibold tracking-wide transition-colors flex items-center gap-1 py-2 ${
                        location.pathname.includes('/services') ? 'text-cyan-400' : 'text-gray-200 hover:text-cyan-300'
                      }`}
                      aria-haspopup="true"
                      aria-expanded={activeDropdown === 'Services'}
                    >
                      {link.name}
                      <ChevronDown size={14} className="mt-0.5" />
                    </Link>
                    
                    {/* Dropdown */}
                    <AnimatePresence>
                      {activeDropdown === 'Services' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 w-72 bg-navy-900/95 backdrop-blur-2xl border border-navy-700/80 shadow-2xl rounded-2xl mt-1 py-3 overflow-hidden z-50"
                        >
                          {SERVICES.map((service) => (
                            <Link 
                              key={service.id} 
                              to={service.link}
                              className="block px-5 py-2.5 text-sm text-gray-300 hover:bg-navy-800/80 hover:text-cyan-400 transition-colors"
                            >
                              {service.title}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-semibold tracking-wide transition-colors py-2 ${
                    location.pathname === link.path ? 'text-cyan-400' : 'text-gray-200 hover:text-cyan-300'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Currency Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdown(!currencyDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs font-bold text-gray-200 hover:text-white hover:border-cyan-400 transition-all"
                aria-label="Select display currency"
              >
                <Globe size={12} className="text-cyan-400" />
                <span>{currency}</span>
                <ChevronDown size={12} />
              </button>

              <AnimatePresence>
                {currencyDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute top-full right-0 mt-2 w-32 bg-navy-900 border border-navy-700 rounded-xl shadow-xl overflow-hidden py-1 z-50"
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
                          className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between ${
                            currency === code
                              ? 'bg-cyan-500 text-navy-900'
                              : 'text-gray-300 hover:bg-navy-800 hover:text-white'
                          }`}
                        >
                          <span>{code}</span>
                          <span className="opacity-75 text-[10px]">{CURRENCIES[code].symbol}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Agent / B2B Portal Button */}
            <Link
              to="/agent/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-xs font-black text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-md shadow-cyan-500/10"
              aria-label="Access B2B Partner Portal"
            >
              <Compass size={13} />
              <span>Agent Portal</span>
            </Link>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 rounded-full bg-navy-800 border border-navy-700 text-gray-200 hover:text-white hover:border-cyan-400 transition-all"
              aria-label="View saved travel wishlist"
            >
              <Bookmark size={16} className="text-cyan-400" />
              {savedItems.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-cyan-400 text-navy-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {savedItems.length}
                </span>
              )}
            </button>

            {/* Direct Telephone Helpline */}
            <a
              href={`tel:${CONTACT_INFO.phone}`}
              aria-label={`Call GNK Connect at ${CONTACT_INFO.displayPhone}`}
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-navy-900 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95"
            >
              <Phone className="h-4 w-4" />
              <span>{CONTACT_INFO.displayPhone}</span>
            </a>
          </div>

          {/* Mobile Right Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 rounded-xl bg-navy-800 border border-navy-700 text-gray-200"
              aria-label="View saved wishlist"
            >
              <Bookmark size={18} className="text-cyan-400" />
              {savedItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-400 text-navy-900 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {savedItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className="p-2 text-white hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden w-full bg-navy-900/98 backdrop-blur-2xl border-t border-navy-800 shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-4">
              {/* Currency Selector Mobile */}
              <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                <span className="text-xs font-bold text-gray-400 uppercase">Currency</span>
                <div className="flex gap-1.5">
                  {Object.keys(CURRENCIES).map((key) => {
                    const code = key as CurrencyCode;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          currency === code ? 'bg-cyan-500 text-navy-900' : 'bg-navy-800 text-gray-300'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {NAV_LINKS.map((link) => (
                <div key={link.name}>
                  <Link
                    to={link.path}
                    className="text-lg font-medium text-white hover:text-cyan-400 block py-1"
                  >
                    {link.name}
                  </Link>
                  {link.name === 'Services' && (
                    <div className="pl-4 mt-2 space-y-2 border-l-2 border-navy-700">
                      {SERVICES.map((service) => (
                        <Link 
                          key={service.id} 
                          to={service.link}
                          className="block text-sm text-gray-300 py-1 hover:text-cyan-400"
                        >
                          {service.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link
                to="/agent/dashboard"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 py-3 rounded-xl font-black text-sm shadow-lg shadow-cyan-500/20"
              >
                <Compass className="h-4 w-4" />
                Access B2B Agent Portal
              </Link>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="flex items-center justify-center gap-2 bg-navy-800 border border-navy-700 hover:bg-navy-700 text-white py-3 rounded-xl font-bold text-sm"
              >
                <Phone className="h-4 w-4 text-cyan-400" />
                Call {CONTACT_INFO.displayPhone}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;