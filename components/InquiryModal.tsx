import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Calendar, Users, Phone, Mail, User, CheckCircle, Compass } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BRAND_NAME } from '../constants';

export interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName?: string;
  initialNotes?: string;
}

const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  packageName = 'General Custom Travel Inquiry',
  initialNotes = ''
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [notes, setNotes] = useState(initialNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      showToast(
        'Inquiry Successfully Sent!',
        `Thank you ${name}. Our senior travel consultant will call you at ${phone} to confirm details for ${packageName}.`,
        'success'
      );
      onClose();
      setName('');
      setPhone('');
      setEmail('');
      setTravelDate('');
      setNotes('');
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-modal-title"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-900/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 z-10 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-navy-900 text-white p-6 relative overflow-hidden shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30 text-cyan-400 shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 block">
                      {BRAND_NAME} Executive Booking
                    </span>
                    <h3 id="inquiry-modal-title" className="text-lg sm:text-xl font-bold text-white">
                      {packageName}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form onSubmit={handleSubmit} id="inquiry-form" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-name" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 text-gray-400" size={16} />
                      <input
                        id="modal-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-phone" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Phone / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 text-gray-400" size={16} />
                      <input
                        id="modal-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0300 1234567"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-email" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-gray-400" size={16} />
                    <input
                      id="modal-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label htmlFor="modal-date" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Travel Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                      <input
                        id="modal-date"
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-adults" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Adults (12+)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 text-gray-400" size={16} />
                      <input
                        id="modal-adults"
                        type="number"
                        min="1"
                        value={adults}
                        onChange={(e) => setAdults(e.target.value)}
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-children" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Children (0-11)
                    </label>
                    <input
                      id="modal-children"
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none text-center"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-notes" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Special Requests & Preferences
                  </label>
                  <textarea
                    id="modal-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Haram view preferred, private vehicle, specific airline..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 text-sm outline-none resize-none"
                  ></textarea>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                <CheckCircle size={14} className="text-green-500" />
                <span>Zero Obligation Free Quote</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="inquiry-form"
                  disabled={isSubmitting}
                  className="bg-navy-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-navy-900 transition-colors flex items-center gap-1.5 shadow-md shadow-navy-900/10"
                >
                  {isSubmitting ? 'Sending...' : 'Confirm Inquiry'} <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InquiryModal;
