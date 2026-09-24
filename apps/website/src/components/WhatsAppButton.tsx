import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { BRAND_NAME } from '../constants';

export const WhatsAppButton: React.FC = () => {
  const whatsappNumber = '92516137232';
  const defaultMessage = encodeURIComponent(
    `Hello ${BRAND_NAME}, I would like to inquire about executive Umrah packages, visa services, and travel bookings.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${defaultMessage}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with GNK Connect on WhatsApp"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 left-6 z-[100] bg-emerald-500 hover:bg-emerald-400 text-white p-3.5 sm:p-4 rounded-full shadow-2xl shadow-emerald-500/30 flex items-center justify-center border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 group transition-all"
    >
      <MessageCircle size={26} className="fill-white text-emerald-500 group-hover:rotate-12 transition-transform duration-300" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
        WhatsApp Desk
      </span>
    </motion.a>
  );
};

export default WhatsAppButton;
