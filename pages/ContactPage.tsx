import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, ArrowRight } from 'lucide-react';
import { CONTACT_INFO } from '../constants';

const ContactPage: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for contacting us! We will get back to you shortly.');
    setFormState({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
       {/* Header */}
       <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-2 block">Get In Touch</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">Contact Us</h1>
          <p className="text-navy-100 text-lg font-light max-w-2xl mx-auto">We are here to help you plan your next journey. Reach out for quotes, support, or just to say hello.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
             <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <h2 className="text-2xl font-bold text-navy-900 mb-6">Contact Information</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Have questions about our Umrah packages, visa services, or tour destinations? 
                  Reach out to our team directly.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-5 group cursor-pointer">
                    <div className="bg-cyan-50 p-4 rounded-2xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-lg">Phone</h3>
                      <p className="text-gray-600 font-medium">{CONTACT_INFO.phone}</p>
                      <p className="text-xs text-gray-400 mt-1">Mon-Sat 9am to 6pm</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-5 group cursor-pointer">
                    <div className="bg-cyan-50 p-4 rounded-2xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-lg">Email</h3>
                      <p className="text-gray-600 font-medium">{CONTACT_INFO.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5 group cursor-pointer">
                    <div className="bg-cyan-50 p-4 rounded-2xl text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-lg">Office Address</h3>
                      <p className="text-gray-600 font-medium max-w-xs">{CONTACT_INFO.address}</p>
                    </div>
                  </div>
                </div>
             </div>

             {/* Map Placeholder */}
             <div className="h-64 bg-gray-200 rounded-3xl overflow-hidden relative shadow-lg border border-gray-300">
                <img 
                    src="https://picsum.photos/600/400?grayscale&blur=2" 
                    alt="Map Location" 
                    className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <a 
                      href="https://maps.google.com" 
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 hover:bg-navy-900 hover:text-white transition-colors"
                    >
                        <MapPin className="text-red-500" />
                        <span className="font-bold text-sm">View on Google Maps</span>
                    </a>
                </div>
             </div>
          </div>

          {/* Form */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formState.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formState.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all"
                    placeholder="0300 1234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formState.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Service Interest</label>
                <div className="relative">
                    <select 
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all appearance-none"
                    >
                        <option value="">Select a service...</option>
                        <option value="Umrah">Umrah Package</option>
                        <option value="Visa">Visit Visa</option>
                        <option value="Tour">Tour Booking</option>
                        <option value="Other">Other Inquiry</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-gray-500">▼</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message</label>
                <textarea 
                  name="message"
                  required
                  rows={4}
                  value={formState.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all resize-none"
                  placeholder="Tell us about your travel plans..."
                ></textarea>
              </div>

              <button 
                type="submit"
                className="w-full bg-navy-900 text-white font-bold py-4 rounded-xl hover:bg-cyan-500 hover:text-navy-900 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={20} /> Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;