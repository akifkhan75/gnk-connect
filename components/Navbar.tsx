import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, ChevronDown } from 'lucide-react';
import { NAV_LINKS, CONTACT_INFO, SERVICES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
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
  }, [location]);

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled ? 'glass-dark py-3 shadow-2xl' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="https://storage.googleapis.com/aistudio-cms-uploads/media/generation/part/image/media_8c20347e-01f7-4881-b531-0d65965e7438.jpeg" 
              alt="Experience Travel" 
              className="h-14 w-auto rounded-lg shadow-lg border-2 border-white/10 hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
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
                        className={`text-sm font-semibold tracking-wide transition-colors flex items-center gap-1 ${
                        isScrolled ? 'text-gray-200 hover:text-cyan-400' : 'text-gray-100 hover:text-cyan-300'
                        } ${location.pathname.includes('/services') ? 'text-cyan-400' : ''}`}
                    >
                        {link.name}
                        <ChevronDown size={14} className="mt-0.5" />
                    </Link>
                    
                    {/* Dropdown */}
                    <AnimatePresence>
                      {activeDropdown === 'Services' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 w-72 bg-navy-900/95 backdrop-blur-xl border border-navy-700 shadow-2xl rounded-2xl mt-4 py-3 overflow-hidden"
                        >
                          {SERVICES.map((service) => (
                             <Link 
                                key={service.id} 
                                to={service.link}
                                className="block px-6 py-3 text-sm text-gray-300 hover:bg-navy-800 hover:text-cyan-400 transition-colors"
                             >
                                 {service.title}
                             </Link>
                           ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-semibold tracking-wide transition-colors ${
                    isScrolled ? 'text-gray-200 hover:text-cyan-400' : 'text-gray-100 hover:text-cyan-300'
                  } ${location.pathname === link.path ? 'text-cyan-400' : ''}`}
                >
                  {link.name}
                </Link>
              )
            })}
            <a
              href={`tel:${CONTACT_INFO.phone}`}
              className="hidden lg:flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-900 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-cyan-500/50"
            >
              <Phone className="h-4 w-4" />
              <span>{CONTACT_INFO.phone}</span>
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-white focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 w-full bg-navy-900/95 backdrop-blur-xl border-t border-navy-800 shadow-xl"
          >
            <div className="flex flex-col p-6 space-y-4">
              {NAV_LINKS.map((link) => (
                <div key={link.name}>
                    <Link
                      to={link.path}
                      className="text-lg font-medium text-white hover:text-cyan-400 block"
                    >
                      {link.name}
                    </Link>
                    {link.name === 'Services' && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-navy-700">
                           {SERVICES.map((service) => (
                             <Link 
                                key={service.id} 
                                to={service.link}
                                className="block text-sm text-gray-400 py-1 hover:text-cyan-400"
                             >
                                 {service.title}
                             </Link>
                         ))}
                      </div>
                    )}
                </div>
              ))}
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="flex items-center justify-center gap-2 bg-cyan-500 text-navy-900 py-3 rounded-xl font-bold mt-4"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;