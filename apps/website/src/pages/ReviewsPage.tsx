import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  ThumbsUp, 
  CheckCircle2, 
  MessageSquarePlus, 
  X, 
  Send, 
  ShieldCheck, 
  Compass 
} from 'lucide-react';
import { BRAND_NAME } from '../constants';
import { useToast } from '../context/ToastContext';

export interface ReviewItem {
  id: string;
  name: string;
  location: string;
  tripType: string;
  rating: number;
  date: string;
  comment: string;
  avatar: string;
  verified: boolean;
  helpfulCount: number;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Tariq Mehmood',
    location: 'Islamabad, Pakistan',
    tripType: 'Executive Umrah VIP Package',
    rating: 5,
    date: 'February 2025',
    comment: 'Alhamdulillah, our 10-day VIP Umrah journey with GNK Connect was beyond exceptional. The Clock Tower hotel suite had an unobstructed view of the Kaaba, and the private GMC transfer made travel with elderly parents effortless. The Ziarat tour guide was extremely knowledgeable.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    verified: true,
    helpfulCount: 42,
  },
  {
    id: 'rev-2',
    name: 'Dr. Ayesha Siddiqui',
    location: 'Lahore, Pakistan',
    tripType: 'Skardu & Deosai Expedition (7 Days)',
    rating: 5,
    date: 'January 2025',
    comment: 'The scenic beauty of Skardu and Shangrila resort was mesmerizing. The 4x4 Prado drivers arranged by GNK Connect were professional, safe on rugged mountain roads, and the customized itinerary gave us plenty of time to relax at Attabad Lake.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    verified: true,
    helpfulCount: 29,
  },
  {
    id: 'rev-3',
    name: 'Shahid Khan',
    location: 'Peshawar, Pakistan',
    tripType: 'Schengen Sticker Visa & European Tour',
    rating: 5,
    date: 'December 2024',
    comment: 'Their visa team in Islamabad prepared our entire Schengen file, cover letters, and hotel vouchers with zero flaws. My wife and I got our multi-entry visa in just 14 business days. Highly recommend their visa advisory services!',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    verified: true,
    helpfulCount: 18,
  },
  {
    id: 'rev-4',
    name: 'Fatima & Bilal Zahid',
    location: 'Rawalpindi, Pakistan',
    tripType: 'Baku Azerbaijan Explorer (5 Days)',
    rating: 5,
    date: 'November 2024',
    comment: 'From airport pickup at Heydar Aliyev International to our day trip to Gabala, everything went like clockwork. The hotel near Fountain Square was spotless and located in the center of the city. Will book all our family trips with GNK Connect.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    verified: true,
    helpfulCount: 24,
  },
  {
    id: 'rev-5',
    name: 'Mohammad Usman',
    location: 'Karachi, Pakistan',
    tripType: 'Ramadan 15-Day Umrah Group',
    rating: 5,
    date: 'October 2024',
    comment: 'Our spiritual pilgrimage during the last 10 days of Ramadan was organized flawlessly. The ground team in Makkah met us right at the arrival terminal with our room keys and transportation ready. Outstanding service throughout.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    verified: true,
    helpfulCount: 35,
  },
];

const REVIEWS_STORAGE_KEY = 'gnk_community_reviews_v1';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  // Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formTripType, setFormTripType] = useState('Executive Umrah VIP Package');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    } catch (e) {
      console.warn('Failed to save reviews', e);
    }
  }, [reviews]);

  const handleHelpfulClick = (id: string) => {
    if (helpfulVoted[id]) {
      setHelpfulVoted(prev => ({ ...prev, [id]: false }));
      setReviews(prev => prev.map(r => r.id === id ? { ...r, helpfulCount: r.helpfulCount - 1 } : r));
    } else {
      setHelpfulVoted(prev => ({ ...prev, [id]: true }));
      setReviews(prev => prev.map(r => r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r));
      showToast('Feedback Recorded', 'Thank you for marking this review as helpful.', 'info');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) {
      showToast('Missing Fields', 'Please complete all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newReview: ReviewItem = {
        id: `rev-${Date.now()}`,
        name: formName.trim(),
        location: formLocation.trim() || 'Pakistan',
        tripType: formTripType,
        rating: formRating,
        date: 'Just now',
        comment: formComment.trim(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formName.trim())}&backgroundColor=0f172a&textColor=38bdf8`,
        verified: true,
        helpfulCount: 1,
      };

      setReviews(prev => [newReview, ...prev]);
      setIsSubmitting(false);
      setIsModalOpen(false);
      setFormName('');
      setFormLocation('');
      setFormComment('');
      setFormRating(5);
      showToast('Review Published!', 'Thank you for sharing your experience with GNK Connect.', 'success');
    }, 600);
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'umrah') return r.tripType.toLowerCase().includes('umrah');
    if (filterCategory === 'northern') return r.tripType.toLowerCase().includes('skardu') || r.tripType.toLowerCase().includes('hunza') || r.tripType.toLowerCase().includes('swat') || r.tripType.toLowerCase().includes('northern');
    if (filterCategory === 'visas') return r.tripType.toLowerCase().includes('visa');
    if (filterCategory === 'international') return r.tripType.toLowerCase().includes('baku') || r.tripType.toLowerCase().includes('dubai') || r.tripType.toLowerCase().includes('international') || r.tripType.toLowerCase().includes('tour');
    return true;
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3 border border-cyan-400/30">
            <ShieldCheck size={14} /> Verified Traveler Reviews
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-white tracking-tight">
            Client Experiences & Trust
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Real feedback from pilgrims, holiday travelers, and corporate clients who journeyed with {BRAND_NAME}.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20 max-w-5xl">
        {/* Rating Scorecard Overview */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-24 h-24 rounded-3xl bg-cyan-50 border border-cyan-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-4xl font-extrabold text-navy-900">4.9</span>
              <div className="flex text-amber-400 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-navy-900">Exceptional Overall Rating</h2>
              <p className="text-xs text-gray-500 mt-0.5">Based on 1,240+ verified pilgrim & tour reviews</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> 99.4% Recommendation Rate
                </span>
                <span className="text-[11px] bg-cyan-50 text-cyan-700 font-bold px-2.5 py-1 rounded-full">
                  Verified IATA Agency
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 shrink-0"
          >
            <MessageSquarePlus size={16} />
            <span>Write a Review</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center sm:justify-start">
          {[
            { id: 'all', label: 'All Reviews' },
            { id: 'umrah', label: 'Executive Umrah' },
            { id: 'northern', label: 'Northern Pakistan' },
            { id: 'visas', label: 'Sticker Visas' },
            { id: 'international', label: 'International Tours' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterCategory === cat.id
                  ? 'bg-cyan-500 text-navy-900 shadow-md scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <Compass size={36} className="text-cyan-500 mx-auto mb-3" />
              <h3 className="font-bold text-navy-900 text-base">No reviews in this category</h3>
              <p className="text-xs text-gray-500 mt-1">Be the first to leave a review for this travel category!</p>
            </div>
          ) : (
            filteredReviews.map((rev, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={rev.id}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-gray-100 hover:shadow-xl hover:border-cyan-100 transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-gray-100 gap-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-cyan-300"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy-900 text-sm">{rev.name}</h3>
                        {rev.verified && (
                          <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Verified Traveler
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{rev.location} • {rev.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          size={14}
                          className={starIdx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-extrabold text-navy-900 ml-1">{rev.rating}.0</span>
                  </div>
                </div>

                <div className="py-4">
                  <span className="inline-block bg-navy-50 text-navy-900 text-[11px] font-bold px-3 py-1 rounded-lg mb-2.5">
                    {rev.tripType}
                  </span>
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50">
                  <span>Travelled with {BRAND_NAME}</span>
                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(rev.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors font-semibold text-xs ${
                      helpfulVoted[rev.id]
                        ? 'bg-cyan-50 text-cyan-700 font-bold'
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ThumbsUp size={13} className={helpfulVoted[rev.id] ? 'fill-cyan-600 text-cyan-600' : ''} />
                    <span>Helpful ({rev.helpfulCount})</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Review Submission Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-navy-900/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 z-10 border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-navy-900">Share Your Experience</h3>
                  <p className="text-xs text-gray-500">Your feedback helps future travelers choose with confidence.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Islamabad"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Trip / Service Taken
                    </label>
                    <select
                      value={formTripType}
                      onChange={(e) => setFormTripType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="Executive Umrah VIP Package">Executive Umrah Package</option>
                      <option value="Skardu & Deosai Tour">Skardu & Northern Tour</option>
                      <option value="Hunza Valley Expedition">Hunza Valley Expedition</option>
                      <option value="Dubai Holiday Package">Dubai Holiday Tour</option>
                      <option value="Baku Azerbaijan Explorer">Baku Azerbaijan Explorer</option>
                      <option value="Sticker Visa Processing">Sticker Visa Processing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Overall Experience Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        className={`p-2 rounded-xl border flex items-center gap-1 transition-all ${
                          formRating >= star
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'bg-gray-50 border-gray-200 text-gray-300'
                        }`}
                      >
                        <Star size={18} className={formRating >= star ? 'fill-amber-400' : ''} />
                        <span className="text-xs font-bold">{star}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Your Review / Comments *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder="Tell us about the hotels, transport, on-ground guidance, and overall service..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? 'Publishing Review...' : 'Publish Verified Review'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewsPage;
