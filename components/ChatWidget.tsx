import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minimize2, Loader2, Bot, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Hello! I am Explorer AI 🤖. I can help you plan trips, check visa requirements, or book packages. How can I assist you today?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const responseText = await sendMessageToGemini(input);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
       // Error handling
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white w-[360px] h-[550px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 mb-6"
          >
            {/* Header */}
            <div className="bg-navy-700 p-5 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-navy-700 to-navy-900"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded-xl backdrop-blur-sm border border-cyan-500/30">
                  <Sparkles size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-wide">Explorer AI</h3>
                  <div className="flex items-center gap-1.5">
                     <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                     <p className="text-xs text-navy-100">Online Now</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="relative z-10 hover:bg-white/10 p-2 rounded-lg transition-colors">
                <Minimize2 size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-cyan-500 text-white rounded-br-none'
                        : 'bg-white text-gray-700 rounded-bl-none border border-gray-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex gap-2 items-center">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="text-cyan-500 disabled:text-gray-300 hover:text-cyan-600 transition-transform transform active:scale-90"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-navy-700 to-navy-600 hover:from-navy-600 hover:to-navy-500 text-white p-4 rounded-full shadow-2xl shadow-cyan-500/30 flex items-center justify-center group border-2 border-navy-500"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} className="text-cyan-400" />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;