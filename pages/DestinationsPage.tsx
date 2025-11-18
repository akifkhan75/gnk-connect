import React from 'react';
import { MapPin, Calendar, Camera, Search, ArrowRight } from 'lucide-react';
import { FEATURED_DESTINATIONS, INTERNATIONAL_DESTINATIONS } from '../constants';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const DestinationsPage: React.FC = () => {
  // Combine both lists for the main listing page
  const allDestinations = [
    ...FEATURED_DESTINATIONS,
    ...INTERNATIONAL_DESTINATIONS
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
       {/* Hero Section */}
       <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
         {/* Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-cyan-900/40 to-transparent"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl"></div>
         </div>

         <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-4 block animate-pulse">Explore The World</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">Find Your Next Adventure</h1>
          <p className="text-navy-100 text-lg max-w-2xl mx-auto font-light mb-10">
            From the peaks of Skardu to the skyline of Dubai, discover curated destinations designed for memories.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex gap-2 bg-white/10 backdrop-blur-lg p-2 rounded-full shadow-2xl border border-white/20">
            <div className="flex-1 flex items-center px-4">
               <Search className="text-gray-300 mr-3" size={20} />
               <input 
                   type="text" 
                   placeholder="Search destinations (e.g. Skardu, Dubai)..." 
                   className="w-full bg-transparent outline-none text-white placeholder-gray-300"
               />
            </div>
            <button className="bg-cyan-500 text-navy-900 px-8 py-3 rounded-full font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
                Search
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allDestinations.map((dest, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={dest.id} 
                  className="group bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 flex flex-col"
                >
                    <div className="relative h-64 overflow-hidden">
                        <img 
                            src={dest.image} 
                            alt={dest.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors"></div>
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-navy-900 uppercase tracking-wider">
                            {dest.type === 'international' ? 'International' : 'Domestic'}
                        </div>
                        <div className="absolute bottom-4 left-4">
                             <span className="bg-cyan-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-lg">
                                {dest.rating} ★ Top Rated
                             </span>
                        </div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-navy-900 group-hover:text-cyan-600 transition-colors">{dest.name}</h3>
                            <div className="text-right">
                                <span className="block text-lg font-bold text-cyan-600">{dest.price}</span>
                                <span className="text-xs text-gray-400">per person</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 py-4 border-t border-gray-100 border-b mb-6">
                            <div className="text-center">
                                <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <span className="text-xs text-gray-600 font-medium">{dest.duration}</span>
                            </div>
                            <div className="text-center border-l border-r border-gray-100">
                                <Camera className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <span className="text-xs text-gray-600 font-medium">{dest.activities} Activities</span>
                            </div>
                            <div className="text-center">
                                <MapPin className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <span className="text-xs text-gray-600 font-medium">{dest.places} Places</span>
                            </div>
                        </div>

                        <button className="mt-auto w-full bg-navy-50 text-navy-900 py-3 rounded-xl font-bold hover:bg-navy-900 hover:text-white transition-all flex items-center justify-center gap-2 group-hover/btn">
                            View Availability <ArrowRight size={16} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;