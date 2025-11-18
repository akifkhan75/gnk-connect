import React from 'react';
import { Shield, Heart, Globe, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
       {/* Hero */}
       <div className="bg-navy-900 pt-32 pb-32 relative overflow-hidden">
        <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-l from-navy-800 to-transparent opacity-50 transform skew-x-12"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-4 block">Our Story</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">Crafting Journeys,<br />Creating Memories.</h1>
          <p className="text-navy-100 text-xl max-w-3xl mx-auto font-light leading-relaxed">
            ExperienceTravel has been a pioneer in premium travel management since 2012, bridging the gap between luxury and affordability.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-20 relative z-20">
        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 relative min-h-[400px]">
                    <img 
                        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" 
                        alt="Team Meeting" 
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-cyan-500/10 mix-blend-multiply"></div>
                </div>
                <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                    <h2 className="text-3xl font-bold mb-6 text-navy-900">Who We Are</h2>
                    <p className="text-gray-600 leading-loose mb-6 text-lg">
                        ExperienceTravel is a premier travel management company based in Islamabad. 
                        We specialize in providing comprehensive travel solutions including Executive Umrah packages, 
                        worldwide visa assistance, and customized holiday tours.
                    </p>
                    <p className="text-gray-600 leading-loose mb-8 text-lg">
                        Our mission is simple: to provide stress-free, luxurious, and memorable travel experiences. 
                        Whether you are traveling for spiritual reasons or seeking adventure in the mountains of Pakistan, 
                        we are with you every step of the way.
                    </p>
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-cyan-500">12+</span>
                            <span className="text-sm text-gray-500 font-bold uppercase">Years</span>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-cyan-500">5k+</span>
                            <span className="text-sm text-gray-500 font-bold uppercase">Clients</span>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-cyan-500">99%</span>
                            <span className="text-sm text-gray-500 font-bold uppercase">Satisfaction</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-navy-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600">
                    <Shield size={40} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-navy-900">Trust & Safety</h3>
                <p className="text-gray-600 leading-relaxed">Your safety and security are our top priorities. We partner with verified hotels and transport services to ensure a seamless experience.</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-navy-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600">
                    <Heart size={40} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-navy-900">Customer First</h3>
                <p className="text-gray-600 leading-relaxed">We believe in building relationships. Our 24/7 support ensures you are never alone on your journey, no matter where you are.</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-navy-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600">
                    <Globe size={40} />
                </div>
                <h3 className="text-xl font-bold mb-4 text-navy-900">Global Expertise</h3>
                <p className="text-gray-600 leading-relaxed">From sticker visas to complex itineraries, our team has the knowledge and network to handle requests for any destination worldwide.</p>
            </div>
        </div>

        {/* CTA */}
        <div className="mt-20 bg-cyan-500 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-cyan-500/20">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to start your journey?</h2>
                <p className="text-navy-900 text-lg mb-8 max-w-2xl mx-auto font-medium">Let us handle the logistics while you focus on making memories.</p>
                <Link to="/contact" className="inline-block bg-navy-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-white hover:text-navy-900 transition-all shadow-lg">
                    Contact Us Today
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;