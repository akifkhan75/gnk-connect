import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minimize2, Sparkles, Compass } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatMessage } from '@gnk/types';
import { publicApi } from '../lib/api';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am GNK Connect AI ✈️. I can assist you with Executive Umrah packages, sticker visas, flight tickets, or luxury tours. How can I help plan your trip today?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isThinking) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      // Send recent history (skip the canned welcome) so the assistant keeps context.
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg]
        .slice(-12)
        .map((m) => ({ role: m.role, text: m.text }));
      const { text: responseText } = await publicApi.chat(history);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Please contact our executive travel desk directly at +92 51 6137232 or email info@gnkconnect.com.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end font-sans sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-surface w-[min(390px,calc(100vw-2rem))] h-[min(560px,calc(100svh-7rem))] rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] flex flex-col overflow-hidden border border-line mb-3"
          >
            {/* Header */}
            <div className="bg-navy-900 p-5 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30 text-cyan-400">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                    GNK Travel Assistant <Sparkles size={14} className="text-cyan-400" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-[11px] text-gray-300">Live AI Advisor</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize Chat Window"
                className="relative z-10 text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <Minimize2 size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas/80">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-br-none'
                        : 'bg-surface text-ink rounded-bl-none border border-line/80'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-surface p-3.5 rounded-2xl rounded-bl-none border border-line shadow-sm flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-brand rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-surface border-t border-line">
              <div className="flex items-center gap-2 bg-canvas rounded-2xl px-3 py-2 border border-line focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Umrah, Visas, Tours..."
                  aria-label="Ask GNK Connect AI"
                  className="flex-1 bg-transparent outline-none text-sm text-ink placeholder-gray-400 px-1"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  aria-label="Send message"
                  className="p-2 rounded-xl bg-brand text-white hover:bg-brand disabled:opacity-40 disabled:hover:bg-cyan-500 transition-all active:scale-95 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI Travel Assistant' : 'Open GNK Connect AI Travel Assistant'}
        aria-expanded={isOpen}
        className="flex items-center justify-center rounded-full bg-brand-gradient p-3 text-white shadow-[0_10px_30px_-10px_rgb(10_92_230/0.8)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 active:scale-95 sm:p-3.5"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
