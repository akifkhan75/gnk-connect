import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, MapPin, Phone, Compass, ArrowUpRight } from 'lucide-react';
import { CONTACT_INFO, NAV_LINKS, BRAND_NAME, BRAND_TAGLINE, SERVICES } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-900 text-white pt-20 pb-10 border-t border-navy-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-6 group inline-flex">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                <Compass className="w-6 h-6" />
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
            
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">
              {BRAND_TAGLINE}. Your premier partner for Executive Umrah packages, worldwide sticker visas, and bespoke international holidays.
            </p>
            
            <div className="flex space-x-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="GNK Connect Facebook" 
                className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700/60 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 hover:border-cyan-500 transition-all duration-300"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="GNK Connect Twitter" 
                className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700/60 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 hover:border-cyan-500 transition-all duration-300"
              >
                <Twitter size={18} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="GNK Connect Instagram" 
                className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700/60 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 hover:border-cyan-500 transition-all duration-300"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-bold mb-6 text-white uppercase tracking-wider text-xs">Navigation</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm flex items-center gap-1 group">
                    <span>{link.name}</span>
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-base font-bold mb-6 text-white uppercase tracking-wider text-xs">Featured Services</h4>
            <ul className="space-y-3">
              {SERVICES.slice(0, 5).map(service => (
                <li key={service.id}>
                  <Link to={service.link} className="text-gray-300 hover:text-cyan-400 text-sm transition-colors block">
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-bold mb-6 text-white uppercase tracking-wider text-xs">Contact Desk</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3.5">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <span className="text-gray-300 text-sm leading-relaxed">{CONTACT_INFO.address}</span>
              </li>
              <li className="flex items-center gap-3.5">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 shrink-0">
                  <Phone size={16} />
                </div>
                <a href={`tel:${CONTACT_INFO.phone}`} className="text-gray-300 hover:text-cyan-400 text-sm transition-colors">
                  {CONTACT_INFO.displayPhone}
                </a>
              </li>
              <li className="flex items-center gap-3.5">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 shrink-0">
                  <Mail size={16} />
                </div>
                <a href={`mailto:${CONTACT_INFO.email}`} className="text-gray-300 hover:text-cyan-400 text-sm transition-colors">
                  {CONTACT_INFO.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. Licensed Travel & Tourism Agency.
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 md:mt-0">
            <Link to="/about" className="hover:text-cyan-400 transition-colors">About Us</Link>
            <Link to="/reviews" className="hover:text-cyan-400 transition-colors">Reviews</Link>
            <Link to="/planner" className="hover:text-cyan-400 transition-colors">Trip Planner</Link>
            <Link to="/tracking" className="hover:text-cyan-400 transition-colors">Visa Tracker</Link>
            <Link to="/contact" className="hover:text-cyan-400 transition-colors">Support</Link>
            <Link to="/services" className="hover:text-cyan-400 transition-colors">All Packages</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;