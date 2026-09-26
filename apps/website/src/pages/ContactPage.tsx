import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle, Clock } from 'lucide-react';
import { CONTACT_INFO, BRAND_NAME } from '../constants';
import { ContactFormData } from '@gnk/types';
import { useToast } from '../context/ToastContext';
import { PageHero } from '../components/PageHero';

const ContactPage: React.FC = () => {
  const { showToast } = useToast();
  const [formState, setFormState] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      showToast(
        'Inquiry Dispatched!',
        `Thank you ${formState.name}. An executive travel advisor will contact you at ${formState.phone || formState.email} shortly.`,
        'success',
      );
      setTimeout(() => {
        setIsSubmitted(false);
        setFormState({ name: '', email: '', phone: '', subject: '', message: '' });
      }, 5000);
    }, 500);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-canvas min-h-screen pb-20">
      {/* Header */}
      <PageHero
        eyebrow="Executive advisory desk"
        title={`Contact ${BRAND_NAME}`}
        subtitle="Questions about Umrah packages, sticker visas, flights or a tailored tour? We're ready to help."
      />

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info & Office Details */}
          <div className="space-y-6">
            <div className="bg-surface p-6 sm:p-8 rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] border border-line">
              <h2 className="text-xl font-bold text-ink mb-2">Office Headquarters</h2>
              <p className="text-ink-2 mb-6 text-sm leading-relaxed">
                Visit our executive office in Islamabad or connect directly with our travel advisory
                team.
              </p>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-brand-soft p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Phone and WhatsApp</h3>
                    <a
                      href={`tel:${CONTACT_INFO.phone}`}
                      className="block text-cyan-600 font-semibold text-sm hover:underline"
                    >
                      Office: {CONTACT_INFO.displayPhone}
                    </a>
                    <a
                      href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-cyan-600 font-semibold text-sm hover:underline"
                    >
                      WhatsApp: {CONTACT_INFO.displayWhatsapp}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> {CONTACT_INFO.officeHours}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-brand-soft p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Official Email</h3>
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="text-cyan-600 font-semibold text-sm hover:underline"
                    >
                      {CONTACT_INFO.email}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">Rapid response within 2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-brand-soft p-3.5 rounded-2xl text-cyan-600 shrink-0 mt-0.5">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Islamabad Office</h3>
                    <p className="text-ink-2 text-sm leading-relaxed">{CONTACT_INFO.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Location Card */}
            <div className="bg-navy-900 text-white rounded-3xl p-6 shadow-xl border border-navy-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base mb-1">Looking for in-person consultation?</h3>
                <p className="text-xs text-gray-300">
                  Office #2, Mezzanine Floor, Junaid Plaza, Islamabad
                </p>
              </div>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand hover:bg-brand text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-md shrink-0 ml-3"
              >
                Directions
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="bg-surface p-6 sm:p-10 rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] border border-line">
            <h2 className="text-xl font-bold text-ink mb-1">Send a Message</h2>
            <p className="text-xs text-ink-3 mb-6">
              Our travel desk will prepare and send a customized quote.
            </p>

            {isSubmitted ? (
              <div className="p-8 bg-green-50 border border-green-200 rounded-2xl text-center text-green-800">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Message Successfully Dispatched!</h3>
                <p className="text-xs text-green-700">
                  Thank you for contacting {BRAND_NAME}. A senior consultant will contact you on{' '}
                  {formState.phone || formState.email} shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-bold text-ink-3 mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      required
                      value={formState.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-line focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-xs font-bold text-ink-3 mb-1"
                    >
                      Phone Number *
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      required
                      value={formState.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-line focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      placeholder="0300 1234567"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-bold text-ink-3 mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    required
                    value={formState.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-line focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-bold text-ink-3 mb-1"
                  >
                    Service of Interest
                  </label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-line focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
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
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-bold text-ink-3 mb-1"
                  >
                    Your Requirements / Message *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    value={formState.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-canvas rounded-xl border border-line focus:ring-2 focus:ring-cyan-500 text-sm outline-none resize-none"
                    placeholder="Describe dates, number of travelers, preferred hotel tier, or specific inquiries..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-navy-900 text-white font-bold py-3.5 rounded-full hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg text-sm dark:bg-white dark:text-navy-900"
                >
                  {isSubmitting ? 'Dispatching...' : 'Send Inquiry'} <Send size={16} />
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
