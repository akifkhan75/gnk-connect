import React, { useState } from 'react';
import { Mail, Bell, CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BRAND_NAME } from '../constants';

const NewsletterSubscription: React.FC = () => {
  const [email, setEmail] = useState('');
  const [preference, setPreference] = useState<'all' | 'umrah' | 'visas' | 'tours'>('all');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubscribed(true);
      showToast(
        'Subscription Activated!',
        `You will receive exclusive ${preference === 'all' ? 'travel' : preference} fare drops & updates at ${email}.`,
        'success'
      );
    }, 600);
  };

  return (
    <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 py-16 text-white relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Text & Icon */}
            <div className="md:w-1/2 space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                <Bell size={12} className="animate-bounce" />
                <span>Price Drops &amp; Advisory Alerts</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Never Miss an Umrah Seat or Tour Deal
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-light leading-relaxed">
                Join 10,000+ travelers subscribed to {BRAND_NAME} weekly fare drops, flash Umrah group announcements, and visa policy updates.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3 text-[11px] text-gray-400 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-cyan-400" /> Zero spam
                </span>
                <span>•</span>
                <span>1-Click unsubscribe anytime</span>
              </div>
            </div>

            {/* Form */}
            <div className="md:w-1/2 w-full">
              {isSubscribed ? (
                <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-2xl p-6 text-center space-y-2">
                  <CheckCircle2 size={36} className="text-cyan-400 mx-auto" />
                  <h3 className="font-bold text-base text-white">You're on the VIP List!</h3>
                  <p className="text-xs text-gray-300">
                    We've sent a welcome verification to <strong className="text-white">{email}</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                    {[
                      { id: 'all', label: 'All Alerts' },
                      { id: 'umrah', label: 'Umrah Only' },
                      { id: 'visas', label: 'Visa Briefs' },
                      { id: 'tours', label: 'Northern Tours' },
                    ].map((pref) => (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => setPreference(pref.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          preference === pref.id
                            ? 'bg-cyan-500 text-navy-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {pref.label}
                      </button>
                    ))}
                  </div>

                  {/* Input & Button */}
                  <div className="flex flex-col sm:flex-row gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20">
                    <div className="flex items-center flex-1 px-3">
                      <Mail size={16} className="text-gray-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address..."
                        aria-label="Email for price alerts"
                        className="w-full bg-transparent text-xs text-white placeholder-gray-400 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                    >
                      <span>{isLoading ? 'Joining...' : 'Subscribe'}</span>
                      <Send size={13} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSubscription;
