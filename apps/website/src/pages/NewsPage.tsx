import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, User, ArrowRight, X, Tag, Send, Compass } from 'lucide-react';
import { LATEST_NEWS } from '../constants';
import { NewsItem } from '@gnk/types';
import InquiryModal from '../components/InquiryModal';
import { useToast } from '../context/ToastContext';
import { Chips, HeroSearch, PageHero } from '../components/PageHero';

const NewsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryPackage, setInquiryPackage] = useState('');
  const { showToast } = useToast();

  const filteredNews = LATEST_NEWS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleOpenArticle = (item: NewsItem) => {
    setActiveArticle(item);
  };

  const handleArticleInquiry = (article: NewsItem) => {
    setInquiryPackage(`Inquiry regarding guide: ${article.title}`);
    setInquiryModalOpen(true);
    showToast(
      'Advisory Request Initiated',
      'Please complete the form to speak with our author.',
      'info',
    );
  };

  return (
    <div className="bg-canvas min-h-screen pb-20">
      {/* Hero Section */}
      <PageHero
        eyebrow="Editorial and advisory"
        title="Travel guides and insights"
        subtitle="Pilgrimage advice, visa policy briefings and insider guides to Northern Pakistan and beyond."
      >
        <HeroSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Umrah tips, visa rules, Skardu guides…"
          label="Search articles"
        />
        <Chips
          className="mt-4"
          value={selectedCategory}
          onChange={setSelectedCategory}
          items={[
            { value: 'all', label: 'All articles' },
            { value: 'umrah', label: 'Umrah' },
            { value: 'visas', label: 'Visas and embassies' },
            { value: 'tours', label: 'Tours and adventures' },
          ]}
        />
      </PageHero>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 md:px-6 py-14">
        {filteredNews.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-3xl border border-line shadow-sm max-w-lg mx-auto p-8">
            <BookOpen className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-ink mb-1">No guides found</h3>
            <p className="text-xs text-ink-3 mb-6">
              No articles matched "{searchTerm}". Try a different keyword.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="bg-navy-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand hover:text-white transition-colors dark:bg-white dark:text-navy-900"
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
                className="group bg-surface rounded-3xl shadow-lg overflow-hidden border border-line hover:shadow-2xl hover:border-cyan-200 dark:hover:border-cyan-800 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors"></div>
                    <div className="absolute top-4 left-4 bg-navy-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-cyan-300">
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

                    <h3 className="text-xl font-bold text-ink group-hover:text-cyan-600 transition-colors mb-2.5 leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-ink-2 text-xs line-clamp-3 leading-relaxed mb-4">
                      {article.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {article.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] bg-surface-2 text-ink-2 px-2 py-0.5 rounded-md"
                        >
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
                    className="w-full bg-brand-soft text-ink py-3 rounded-full font-bold text-sm hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-1.5"
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
              className="relative bg-surface w-full max-w-3xl rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] overflow-hidden border border-line z-10 flex flex-col max-h-[90vh]"
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
                  <div className="inline-block bg-brand text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2">
                    {activeArticle.category}
                  </div>
                  <h2
                    id="article-modal-title"
                    className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                  >
                    {activeArticle.title}
                  </h2>
                </div>
              </div>

              {/* Article Meta Bar */}
              <div className="px-6 py-3 bg-canvas border-b border-line flex flex-wrap items-center justify-between text-xs text-ink-3 gap-2 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-medium text-ink">
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
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4 text-ink-2 text-sm sm:text-base leading-relaxed">
                {activeArticle.content.map((para, pIdx) => (
                  <p key={pIdx} className="leading-loose">
                    {para}
                  </p>
                ))}
              </div>

              {/* Article Modal Footer */}
              <div className="p-4 sm:p-6 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-ink-2">
                  <Compass size={16} className="text-cyan-500" />
                  <span>Have questions about this travel guide?</span>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-line text-ink-2 text-xs font-bold hover:bg-surface-2 transition-colors"
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
                    className="flex-1 sm:flex-none bg-navy-900 hover:bg-brand hover:text-white text-white px-5 py-2.5 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md dark:bg-white dark:text-navy-900"
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
