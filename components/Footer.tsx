import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { CONTACT_INFO, NAV_LINKS } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-900 text-white pt-20 pb-10 border-t border-navy-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
                <img 
                    src="https://storage.googleapis.com/aistudio-cms-uploads/media/generation/part/image/media_8c20347e-01f7-4881-b531-0d65965e7438.jpeg" 
                    alt="Experience Travel" 
                    className="h-16 w-auto rounded-lg"
                />
            </div>
            <p className="text-navy-100 mb-8 leading-relaxed opacity-80">
              Crafting Journeys, Creating Memories. Your premium partner for Umrah, Visa services, and Luxury Tours since 2012.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 transition-all duration-300">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 transition-all duration-300">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-navy-900 transition-all duration-300">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Quick Links</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-navy-100 hover:text-cyan-400 transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Featured Services</h4>
            <ul className="space-y-3">
              <li><Link to="/services/umrah" className="text-navy-100 hover:text-cyan-400 text-sm transition-colors">Executive Umrah</Link></li>
              <li><Link to="/services/visas" className="text-navy-100 hover:text-cyan-400 text-sm transition-colors">Sticker Visas</Link></li>
              <li><Link to="/services/international-tours" className="text-navy-100 hover:text-cyan-400 text-sm transition-colors">International Tours</Link></li>
              <li><Link to="/services/domestic-tours" className="text-navy-100 hover:text-cyan-400 text-sm transition-colors">Domestic Trips</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 group">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-navy-900 transition-colors">
                    <MapPin size={18} />
                </div>
                <span className="text-navy-100 text-sm opacity-80 pt-1">{CONTACT_INFO.address}</span>
              </li>
              <li className="flex items-center gap-4 group">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-navy-900 transition-colors">
                    <Phone size={18} />
                </div>
                <span className="text-navy-100 text-sm opacity-80">{CONTACT_INFO.phone}</span>
              </li>
              <li className="flex items-center gap-4 group">
                <div className="p-2 bg-navy-800 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-navy-900 transition-colors">
                    <Mail size={18} />
                </div>
                <span className="text-navy-100 text-sm opacity-80">{CONTACT_INFO.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-navy-200 text-sm opacity-60">
            &copy; {new Date().getFullYear()} ExperienceTravel. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-navy-200 text-sm hover:text-cyan-400 opacity-60 hover:opacity-100">Privacy Policy</a>
              <a href="#" className="text-navy-200 text-sm hover:text-cyan-400 opacity-60 hover:opacity-100">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;