import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, User, ArrowRight, Search, X, Tag, Send, Compass } from 'lucide-react';
import { LATEST_NEWS, BRAND_NAME } from '../constants';
import { NewsItem } from '../types';
import InquiryModal from '../components/InquiryModal';
import { useToast } from '../context/ToastContext';

const NewsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryPackage, setInquiryPackage] = useState('');
  const { showToast } = useToast();

  const filteredNews = LATEST_NEWS.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleOpenArticle = (item: NewsItem) => {
    setActiveArticle(item);
  };

  const handleArticleInquiry = (article: NewsItem) => {
    setInquiryPackage(`Inquiry regarding guide: ${article.title}`);
    setInquiryModalOpen(true);
    showToast('Advisory Request Initiated', 'Please complete the form to speak with our author.', 'info');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero Section */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-2 block animate-pulse">
            {BRAND_NAME} Editorial & Advisory
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white tracking-tight">
            Travel Guides & Insights
          </h1>
          <p className="text-gray-300 text-base max-w-2xl mx-auto font-light mb-8">
            Expert pilgrimage advice, visa policy briefings, packing checklists, and insider guides to Northern Pakistan and worldwide destinations.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <div className="flex gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/20">
              <div className="flex-1 flex items-center px-4">
                <Search className="text-gray-300 mr-2.5 shrink-0" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles, Umrah tips, visa rules, Skardu guides..." 
                  aria-label="Search travel articles"
                  className="w-full bg-transparent outline-none text-white placeholder-gray-300 text-sm"
                />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-300 hover:text-white px-3"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: 'all', label: 'All Articles' },
                { id: 'umrah', label: 'Umrah Pilgrimage' },
                { id: 'visas', label: 'Visas & Embassy Rules' },
                { id: 'tours', label: 'Tours & Adventures' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-navy-900 shadow-md'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 md:px-6 py-14">
        {filteredNews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-lg mx-auto p-8">
            <BookOpen className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-navy-900 mb-1">No guides found</h3>
            <p className="text-xs text-gray-500 mb-6">No articles matched "{searchTerm}". Try a different keyword.</p>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="bg-navy-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-navy-900 transition-colors"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNews.map((article, idx) => (
              <motion.article 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                key={article.id} 
                className="group bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-cyan-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors"></div>
                    <div className="absolute top-4 left-4 bg-navy-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                      {article.category}
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Clock size={12} className="text-cyan-400" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {article.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User size={12} /> {article.author}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-navy-900 group-hover:text-cyan-600 transition-colors mb-2.5 leading-snug">
                      {article.title}
                    </h3>
                    
                    <p className="text-gray-600 text-xs line-clamp-3 leading-relaxed mb-4">
                      {article.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {article.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button 
                    type="button"
                    onClick={() => handleOpenArticle(article)}
                    className="w-full bg-navy-50 text-navy-900 py-3 rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-navy-900 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Read Full Guide</span> <ArrowRight size={14} />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {/* Article Reader Modal */}
      <AnimatePresence>
        {activeArticle && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-modal-title"
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveArticle(null)}
              className="absolute inset-0 bg-navy-900/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header Banner */}
              <div className="relative h-60 sm:h-72 w-full shrink-0 bg-navy-900">
                <img 
                  src={activeArticle.image} 
                  alt={activeArticle.title} 
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent"></div>
                
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  aria-label="Close article"
                  className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="inline-block bg-cyan-500 text-navy-900 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2">
                    {activeArticle.category}
                  </div>
                  <h2 id="article-modal-title" className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                    {activeArticle.title}
                  </h2>
                </div>
              </div>

              {/* Article Meta Bar */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-medium text-navy-900">
                    <User size={14} className="text-cyan-600" /> {activeArticle.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {activeArticle.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {activeArticle.readTime}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag size={12} />
                  <span>{activeArticle.tags.join(', ')}</span>
                </div>
              </div>

              {/* Article Content Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                {activeArticle.content.map((para, pIdx) => (
                  <p key={pIdx} className="leading-loose">
                    {para}
                  </p>
                ))}
              </div>

              {/* Article Modal Footer */}
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Compass size={16} className="text-cyan-500" />
                  <span>Have questions about this travel guide?</span>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const art = activeArticle;
                      setActiveArticle(null);
                      handleArticleInquiry(art);
                    }}
                    className="flex-1 sm:flex-none bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Inquire About This Trip</span> <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        packageName={inquiryPackage}
      />
    </div>
  );
};

export default NewsPage;
