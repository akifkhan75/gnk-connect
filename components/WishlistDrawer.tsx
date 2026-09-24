import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, ArrowRight, Send, Compass } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import InquiryModal from './InquiryModal';

const WishlistDrawer: React.FC = () => {
  const { savedItems, removeItem, clearWishlist, isDrawerOpen, setIsDrawerOpen } = useWishlist();
  const { showToast } = useToast();
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryPackage, setInquiryPackage] = useState('');

  const handleSingleInquiry = (title: string) => {
    setInquiryPackage(title);
    setInquiryModalOpen(true);
  };

  const handleBulkInquiry = () => {
    if (savedItems.length === 0) return;
    const itemsList = savedItems.map(i => `${i.title} (${i.category})`).join(', ');
    setInquiryPackage(`Combined Inquiry: ${itemsList}`);
    setInquiryModalOpen(true);
  };

  const handleRemove = (id: string, title: string) => {
    removeItem(id);
    showToast('Removed from Saved', `"${title}" has been removed.`, 'info');
  };

  return (
    <>
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[990] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Off-canvas Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden"
              role="dialog"
              aria-label="Saved Travel Wishlist"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 bg-navy-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Bookmark size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Saved Trips & Packages</h2>
                    <p className="text-[11px] text-gray-300">
                      {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} in your wishlist
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close saved items drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {savedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                      <Compass size={28} />
                    </div>
                    <h3 className="font-bold text-navy-900 text-base mb-1">Your wishlist is empty</h3>
                    <p className="text-xs text-gray-500 max-w-xs mb-6">
                      Click the bookmark icon on any destination, Umrah package, or tour to save and compare them here.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="px-5 py-2.5 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-navy-900 transition-colors"
                    >
                      Browse Packages
                    </button>
                  </div>
                ) : (
                  savedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 group hover:border-cyan-200 transition-all"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] uppercase font-bold text-cyan-600 tracking-wider">
                              {item.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id, item.title)}
                              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                              aria-label={`Remove ${item.title}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <h4 className="font-bold text-navy-900 text-xs truncate group-hover:text-cyan-600 transition-colors">
                            {item.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {item.price && (
                            <span className="text-xs font-extrabold text-navy-900">
                              {item.price}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSingleInquiry(item.title)}
                            className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-0.5 ml-auto"
                          >
                            <span>Book Now</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Actions */}
              {savedItems.length > 0 && (
                <div className="p-5 sm:p-6 bg-gray-50 border-t border-gray-100 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleBulkInquiry}
                    className="w-full bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Inquire About All ({savedItems.length}) Trips</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearWishlist();
                      showToast('Wishlist Cleared', 'All saved items have been removed.', 'info');
                    }}
                    className="w-full py-2 text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear All Saved Items
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        packageName={inquiryPackage}
      />
    </>
  );
};

export default WishlistDrawer;
