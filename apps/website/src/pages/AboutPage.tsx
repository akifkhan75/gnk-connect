import React from 'react';
import { Shield, Heart, Globe, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_TAGLINE, CONTACT_INFO } from '../constants';
import { PageHero } from '../components/PageHero';

const AboutPage: React.FC = () => {
  return (
    <div className="bg-canvas min-h-screen pb-20">
      {/* Hero */}
      <PageHero
        eyebrow="Our story"
        title={BRAND_NAME}
        subtitle={
          <>
            {BRAND_TAGLINE}. Executive travel, seamless pilgrimage logistics and unforgettable
            holidays since 2012.
          </>
        }
      />

      <div className="container mx-auto px-4 md:px-6 -mt-16 relative z-20">
        {/* Main Content Card */}
        <div className="bg-surface rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] overflow-hidden border border-line mb-14">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 relative min-h-[360px]">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
                alt="GNK Connect Travel Consultants"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-navy-900/20"></div>
            </div>
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-ink">Who We Are</h2>
              <p className="text-ink-2 leading-relaxed mb-4 text-sm md:text-base">
                <strong>{BRAND_NAME}</strong> is an Islamabad-based premium travel management firm
                specializing in turnkey travel solutions. From VIP Executive Umrah packages with
                Haram-view suites to complex sticker visa applications and curated domestic
                expeditions in Northern Pakistan.
              </p>
              <p className="text-ink-2 leading-relaxed mb-6 text-sm md:text-base">
                We believe travel should be enriching, inspiring, and completely devoid of logistics
                stress. Our senior travel specialists orchestrate every flight, transfer, and
                document with meticulous precision.
              </p>
              <div className="flex gap-6 pt-4 border-t border-line">
                <div>
                  <span className="text-2xl font-bold text-cyan-600">12+</span>
                  <span className="text-[11px] text-ink-3 font-bold uppercase block">
                    Years Excellence
                  </span>
                </div>
                <div className="w-px bg-line"></div>
                <div>
                  <span className="text-2xl font-bold text-cyan-600">5k+</span>
                  <span className="text-[11px] text-ink-3 font-bold uppercase block">
                    Happy Pilgrims
                  </span>
                </div>
                <div className="w-px bg-line"></div>
                <div>
                  <span className="text-2xl font-bold text-cyan-600">99%</span>
                  <span className="text-[11px] text-ink-3 font-bold uppercase block">
                    Visa Success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pillars / Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-surface p-7 rounded-3xl shadow-md border border-line text-center">
            <div className="bg-brand-soft w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-600">
              <Shield size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-ink">Licensed & Secure</h3>
            <p className="text-ink-2 text-xs leading-relaxed">
              Fully licensed travel agency partnering exclusively with verified 4-star and 5-star
              hotels, certified ground transport, and accredited airlines.
            </p>
          </div>

          <div className="bg-surface p-7 rounded-3xl shadow-md border border-line text-center">
            <div className="bg-brand-soft w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-600">
              <Heart size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-ink">Dedicated 24/7 Support</h3>
            <p className="text-ink-2 text-xs leading-relaxed">
              You are never on your own. Our on-ground representatives in Makkah, Madinah, and
              Islamabad are available round-the-clock.
            </p>
          </div>

          <div className="bg-surface p-7 rounded-3xl shadow-md border border-line text-center">
            <div className="bg-brand-soft w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-600">
              <Globe size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-ink">Global Reach</h3>
            <p className="text-ink-2 text-xs leading-relaxed">
              Specialized visa filing and itinerary planning across UAE, Schengen zone, UK, USA,
              Thailand, Malaysia, and Southeast Asia.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-navy-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl border border-navy-800">
          <div className="relative z-10 max-w-2xl mx-auto">
            <Compass className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to Plan Your Next Journey?
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Contact our travel consultants today at {CONTACT_INFO.displayPhone} or send an inquiry
              for instant assistance.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="bg-brand hover:bg-brand text-white px-8 py-3.5 rounded-full font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
              >
                Get In Touch
              </Link>
              <Link
                to="/services"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-xl font-bold text-xs transition-colors border border-white/20"
              >
                Browse Packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
