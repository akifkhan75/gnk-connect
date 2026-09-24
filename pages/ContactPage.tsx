import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle, Clock } from 'lucide-react';
import { CONTACT_INFO, BRAND_NAME } from '../constants';
import { ContactFormData } from '../types';

const ContactPage: React.FC = () => {
  const [formState, setFormState] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormState({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-2 block">
            Executive Advisory Desk
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 text-white">
            Contact {BRAND_NAME}
          </h1>
          <p className="text-gray-300 text-base font-light max-w-2xl mx-auto">
            Have questions about Umrah packages, sticker visas, flight bookings, or customized tours? We are ready to assist.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info & Office Details */}
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100">
              <h2 className="text-xl font-bold text-navy-900 mb-2">Office Headquarters</h2>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Visit our executive office in Islamabad or connect directly with our travel advisory team.
              </p>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-cyan-50 p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Direct Phone & WhatsApp</h3>
                    <a href={`tel:${CONTACT_INFO.phone}`} className="text-cyan-600 font-semibold text-sm hover:underline">
                      {CONTACT_INFO.displayPhone}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> {CONTACT_INFO.officeHours}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-cyan-50 p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Official Email</h3>
                    <a href={`mailto:${CONTACT_INFO.email}`} className="text-cyan-600 font-semibold text-sm hover:underline">
                      {CONTACT_INFO.email}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">Rapid response within 2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-cyan-50 p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Islamabad Office</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{CONTACT_INFO.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Location Card */}
            <div className="bg-navy-900 text-white rounded-3xl p-6 shadow-xl border border-navy-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base mb-1">Looking for in-person consultation?</h3>
                <p className="text-xs text-gray-300">Office #2, Mezzanine Floor, Junaid Plaza, Islamabad</p>
              </div>
              <a 
                href="https://maps.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 ml-3"
              >
                Directions
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold text-navy-900 mb-1">Send a Message</h2>
            <p className="text-xs text-gray-500 mb-6">Our travel desk will prepare and send a customized quote.</p>

            {isSubmitted ? (
              <div className="p-8 bg-green-50 border border-green-200 rounded-2xl text-center text-green-800">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Message Successfully Dispatched!</h3>
                <p className="text-xs text-green-700">Thank you for contacting {BRAND_NAME}. A senior consultant will contact you on {formState.phone || formState.email} shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input 
                      id="contact-name"
                      type="text" 
                      name="name"
                      required
                      value={formState.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input 
                      id="contact-phone"
                      type="tel" 
                      name="phone"
                      required
                      value={formState.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      placeholder="0300 1234567"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input 
                    id="contact-email"
                    type="email" 
                    name="email"
                    required
                    value={formState.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Service of Interest
                  </label>
                  <select 
                    id="contact-subject"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                  >
                    <option value="">-- Select a Service --</option>
                    <option value="Executive Umrah">Executive Umrah Package</option>
                    <option value="Visit Visa">Visit Visa / Sticker Visa</option>
                    <option value="Domestic Tour">Domestic Tour (Naran, Skardu, Hunza)</option>
                    <option value="International Tour">International Holiday Tour</option>
                    <option value="Flight Tickets">Airline Tickets & Rescheduling</option>
                    <option value="Hotel Booking">Luxury Hotel Booking</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Your Requirements / Message
                  </label>
                  <textarea 
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    value={formState.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none resize-none"
                    placeholder="Describe dates, number of travelers, preferred hotel tier, or specific inquiries..."
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-navy-900 text-white font-bold py-3.5 rounded-xl hover:bg-cyan-500 hover:text-navy-900 transition-all flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  <Send size={16} /> Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;