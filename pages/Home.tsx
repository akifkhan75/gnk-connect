import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Star, Map, Moon, FileCheck, Hotel, Plane, ShieldCheck, Globe, Send, ChevronRight } from 'lucide-react';
import { FEATURED_DESTINATIONS, INTERNATIONAL_DESTINATIONS, SERVICES, TESTIMONIALS, LATEST_NEWS } from '../constants';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const Home: React.FC = () => {
  
  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Moon': return <Moon />;
      case 'FileCheck': return <FileCheck />;
      case 'Hotel': return <Hotel />;
      case 'Plane': return <Plane />;
      case 'Map': return <Map />;
      case 'ShieldCheck': return <ShieldCheck />;
      case 'Globe': return <Globe />;
      default: return <CheckCircle />;
    }
  };

  return (
    <div className="w-full overflow-hidden bg-gray-50">
      {/* 1. Futuristic Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
           {/* Deep Navy Gradient Overlay */}
           <div className="absolute inset-0 bg-navy-900/40 mix-blend-multiply z-10"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-navy-900/60 z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
            alt="Futuristic Travel"
            className="w-full h-full object-cover scale-105 animate-pulse-slow" // Use a slow zoom animation if possible, simplified here
          />
        </div>
        
        {/* Floating Blobs for Futuristic Feel */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob z-0"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000 z-0"></div>

        <div className="relative z-20 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 text-sm font-bold tracking-widest uppercase mb-6 shadow-lg">
              Explore The Unseen
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
              Journey Beyond <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Expectations</span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-200 mb-12 max-w-2xl mx-auto font-light">
              Premium Umrah Packages, Global Visas, and Curated Adventures designed for the modern traveler.
            </p>

            <div className="glass p-2 rounded-full max-w-xl mx-auto flex items-center gap-2 shadow-2xl border border-white/20">
                <input 
                   type="text" 
                   placeholder="Where do you want to go?"
                   className="flex-1 bg-transparent px-6 py-3 text-white placeholder-gray-300 outline-none text-lg"
                />
                <button className="bg-cyan-500 hover:bg-cyan-400 text-navy-900 px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-cyan-500/50">
                    Search
                </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Down Indicator */}
        <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-10 z-20 text-white/50"
        >
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
                <div className="w-1 h-2 bg-white/50 rounded-full"></div>
            </div>
        </motion.div>
      </section>

      {/* 2. Key Service Highlights (Floating Glass Cards) */}
      <section className="relative z-30 -mt-20 pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {SERVICES.map((service, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={service.id}
              >
                  <Link to={service.link} className="flex flex-col items-center justify-center w-28 h-28 md:w-36 md:h-36 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white hover:bg-navy-700 hover:border-navy-600 group transition-all duration-300 hover:-translate-y-2">
                    <div className="mb-3 text-cyan-600 group-hover:text-cyan-400 transition-colors">
                        {React.cloneElement(getServiceIcon(service.iconName) as React.ReactElement<any>, { size: 32 })}
                    </div>
                    <span className="text-xs font-bold text-navy-900 group-hover:text-white text-center px-2 leading-tight">
                        {service.title.replace('Executive ', '').replace(' (Sticker Visas)', '')}
                    </span>
                  </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Destinations (Modern Cards) */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div {...fadeInUp} className="flex justify-between items-end mb-12">
            <div>
                <h2 className="text-4xl font-bold text-navy-900 mb-2 tracking-tight">Trending Domestic</h2>
                <div className="h-1 w-20 bg-cyan-500 rounded-full"></div>
            </div>
            <Link to="/destinations" className="hidden md:flex items-center gap-2 text-navy-600 font-semibold hover:text-cyan-500 transition-colors">
                View All Locations <ArrowRight size={18} />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURED_DESTINATIONS.map((dest, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                viewport={{ once: true }}
                key={dest.id} 
                className="group relative h-[450px] rounded-3xl overflow-hidden cursor-pointer shadow-2xl"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent opacity-90"></div>
                
                <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/20">
                   From {dest.price}
                </div>

                <div className="absolute bottom-0 left-0 p-8 w-full transform transition-transform duration-500 group-hover:translate-y-[-10px]">
                  <div className="flex items-center gap-2 mb-2">
                      <Star className="fill-gold-500 text-gold-500 w-4 h-4" />
                      <span className="text-gold-500 font-bold text-sm">{dest.rating} Rating</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">{dest.name}</h3>
                  <div className="flex items-center gap-4 text-gray-300 text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <span>{dest.duration}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>{dest.activities} Activities</span>
                  </div>
                  <Link to="/destinations" className="inline-flex items-center justify-center w-full bg-cyan-500 text-navy-900 py-3 rounded-xl font-bold hover:bg-cyan-400 transition-colors">
                     View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Services Summary (Bento Grid) */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
           <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-navy-900 mb-4">Comprehensive Travel Solutions</h2>
              <p className="text-gray-600 text-lg">Everything you need for a seamless journey, under one roof.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SERVICES.slice(0, 6).map((service, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={service.id}
                    className={`group relative overflow-hidden rounded-3xl p-8 bg-white border border-gray-100 shadow-lg hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 ${i === 0 || i === 5 ? 'md:col-span-2' : ''}`}
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-navy-50 rounded-2xl text-navy-700 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                            {React.cloneElement(getServiceIcon(service.iconName) as React.ReactElement<any>, { size: 28 })}
                        </div>
                        <Link to={service.link} className="p-2 bg-gray-50 rounded-full hover:bg-navy-900 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </Link>
                     </div>
                     <h3 className="text-2xl font-bold text-navy-900 mb-3">{service.title}</h3>
                     <p className="text-gray-600 leading-relaxed mb-4">{service.description}</p>
                  </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* 5. Mission / About (Split Layout) */}
      <section className="py-24 bg-navy-900 text-white overflow-hidden relative">
         {/* Background Elements */}
         <div className="absolute top-0 right-0 w-1/2 h-full bg-navy-800 transform skew-x-12 translate-x-20 opacity-50"></div>
         
         <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
               <div className="lg:w-1/2">
                  <motion.div {...fadeInUp}>
                      <span className="text-cyan-400 font-bold tracking-wider uppercase text-sm mb-4 block">Our Mission</span>
                      <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                          Crafting Journeys, <br/> Creating <span className="text-cyan-400">Memories</span>
                      </h2>
                      <p className="text-navy-100 text-lg leading-relaxed mb-8 opacity-90">
                          Since 2012, ExperienceTravel has redefined premium travel services. We don't just book tickets; we design experiences that linger in your memory forever.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                         {[
                            '24/7 Global Support', 'Customized Itineraries', 
                            'Verified Premium Hotels', 'Exclusive Visa Assistance'
                         ].map((item, idx) => (
                             <div key={idx} className="flex items-center gap-3">
                                <div className="p-1 bg-cyan-500/20 rounded-full">
                                    <CheckCircle size={16} className="text-cyan-400" />
                                </div>
                                <span className="font-medium text-white">{item}</span>
                             </div>
                         ))}
                      </div>

                      <Link to="/about" className="inline-block bg-white text-navy-900 px-8 py-4 rounded-xl font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-white/10">
                          Read Our Story
                      </Link>
                  </motion.div>
               </div>
               <div className="lg:w-1/2 relative">
                   <motion.div 
                     initial={{ opacity: 0, x: 50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true }}
                     className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-navy-700/50"
                   >
                      <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop" alt="Relaxing Beach" className="w-full" />
                   </motion.div>
                   {/* Decorative floating card */}
                   <motion.div 
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-xl z-20 max-w-xs hidden md:block"
                   >
                      <div className="flex items-center gap-4 mb-2">
                          <div className="bg-green-100 p-2 rounded-full text-green-600">
                             <ShieldCheck size={24} />
                          </div>
                          <div>
                             <p className="font-bold text-navy-900 text-lg">100% Secure</p>
                             <p className="text-xs text-gray-500">Licensed & Bonded</p>
                          </div>
                      </div>
                   </motion.div>
               </div>
            </div>
         </div>
      </section>

      {/* 6. Statistics (Animated) */}
      <section className="py-16 bg-cyan-500 relative">
         <div className="container mx-auto px-4 md:px-6 text-center">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-cyan-600/30">
                 {[
                    { label: 'Years Experience', val: '12+' },
                    { label: 'Happy Travelers', val: '5k+' },
                    { label: 'Global Destinations', val: '30+' },
                    { label: 'Visa Success', val: '99%' },
                 ].map((stat, i) => (
                    <div key={i} className="p-4">
                       <div className="text-5xl font-bold text-white mb-2">{stat.val}</div>
                       <div className="text-navy-900 font-bold text-sm uppercase tracking-wider opacity-80">{stat.label}</div>
                    </div>
                 ))}
             </div>
         </div>
      </section>

      {/* 7. Top International Destinations (Carousel/Grid) */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
             <h2 className="text-4xl font-bold text-navy-900 mb-4">International Getaways</h2>
             <p className="text-gray-600">Hand-picked packages for the world's most exciting cities.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {INTERNATIONAL_DESTINATIONS.map((country, idx) => (
               <Link to="/destinations" key={country.id} className="group relative rounded-2xl overflow-hidden aspect-[3/4] shadow-lg">
                 <img 
                   src={country.image} 
                   alt={country.name} 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-90 group-hover:brightness-100"
                 />
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900 opacity-90"></div>
                 <div className="absolute bottom-0 left-0 p-6 w-full">
                   <h3 className="font-bold text-xl text-white mb-1">{country.name}</h3>
                   <div className="h-0.5 w-10 bg-cyan-500 mb-2 transition-all duration-300 group-hover:w-full"></div>
                   <p className="text-xs text-gray-300 flex justify-between items-center">
                      <span>From {country.price}</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                   </p>
                 </div>
               </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Form Section */}
      <section className="py-20 bg-navy-900 relative overflow-hidden">
        {/* Abstract Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl"></div>
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-overlay filter blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               viewport={{ once: true }}
               className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 max-w-4xl mx-auto"
            >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Not sure where to go?</h2>
                <p className="text-gray-300 mb-8">Tell us a bit about your dream trip, and our AI or human agents will send you a custom quote instantly.</p>
                
                <form className="flex flex-col md:flex-row gap-4" onSubmit={(e) => { e.preventDefault(); alert('Quote request sent!'); }}>
                    <input 
                      type="text" 
                      placeholder="E.g., '10 days in Turkey for a couple in December'..." 
                      className="flex-1 px-6 py-4 rounded-xl bg-navy-800 border border-navy-700 text-white placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors"
                    />
                    <button className="bg-cyan-500 text-navy-900 px-8 py-4 rounded-xl font-bold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                        Get Free Quote <Send size={18} />
                    </button>
                </form>
            </motion.div>
        </div>
      </section>

      {/* 8. Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
             <div>
                 <h2 className="text-4xl font-bold text-navy-900 mb-2">Traveler Stories</h2>
                 <p className="text-gray-600">Real experiences from our valued clients.</p>
             </div>
             <div className="flex gap-2">
                 {/* Arrows could go here for carousel control */}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={item.id} 
                className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 relative"
              >
                <div className="absolute -top-5 right-8 bg-cyan-500 text-white p-3 rounded-xl shadow-lg">
                   <span className="text-2xl font-serif">"</span>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <img src={item.avatar} alt={item.name} className="w-14 h-14 rounded-full object-cover border-2 border-cyan-100" />
                  <div>
                    <h4 className="font-bold text-navy-900 text-lg">{item.name}</h4>
                    <p className="text-sm text-cyan-600 font-medium">{item.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed italic">{item.comment}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. News & Articles */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-12">
             <h2 className="text-4xl font-bold text-navy-900">Latest Insights</h2>
             <button className="text-cyan-600 font-bold hover:text-cyan-500 transition-colors">Read Blog</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {LATEST_NEWS.map((news) => (
               <article key={news.id} className="group cursor-pointer flex flex-col">
                  <div className="rounded-2xl overflow-hidden h-60 mb-6 relative">
                     <img 
                       src={news.image} 
                       alt={news.title} 
                       className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                     />
                     <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1 rounded-lg text-xs font-bold text-navy-900 uppercase tracking-wider">
                        {news.date}
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-navy-900 mb-3 group-hover:text-cyan-500 transition-colors">
                    {news.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed flex-grow">{news.excerpt}</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-navy-600">
                      <span>Read More</span> <ArrowRight size={14} />
                  </div>
               </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;