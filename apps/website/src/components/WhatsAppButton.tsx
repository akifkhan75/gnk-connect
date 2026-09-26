import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { BRAND_NAME } from '../constants';

export const WhatsAppButton: React.FC = () => {
  const whatsappNumber = '92516137232';
  const defaultMessage = encodeURIComponent(
    `Hello ${BRAND_NAME}, I would like to inquire about executive Umrah packages, visa services, and travel bookings.`,
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
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex items-center justify-center rounded-full bg-[#25d366] p-3 text-white shadow-[0_10px_30px_-10px_rgb(37_211_102/0.7)] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/30 sm:bottom-6 sm:left-6 sm:p-3.5"
    >
      <MessageCircle
        size={22}
        className="fill-white text-[#25d366] transition-transform duration-300 group-hover:rotate-12"
      />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-semibold transition-all duration-300 ease-in-out group-hover:max-w-xs group-hover:pl-2">
        WhatsApp Desk
      </span>
    </motion.a>
  );
};

export default WhatsAppButton;
