import React from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, Sparkles, X, Settings, Loader2, Bot, User, Target, Plus } from 'lucide-react';
import { Transaction } from '../types';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { getFinancialAdvice } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FinancialAdvisorChatProps {
  transactions: Transaction[];
  onOpenChange?: (width: number) => void;
}

export function FinancialAdvisorChat({ transactions, onOpenChange }: FinancialAdvisorChatProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [width, setWidth] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return Math.min(450, window.innerWidth);
    }
    return 450;
  });
  const [isResizing, setIsResizing] = React.useState(false);

  const [messages, setMessages] = React.useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: "Hello! 👋 I'm your AI Financial Advisor. I can help you with:\n\n💰 Increasing your savings\n📉 Reducing expenses\n📊 Analyzing spending patterns\n💡 Providing personalized financial advice\n🎯 Setting financial goals\n⚠️ Identifying spending issues\n\nAsk me anything about your finances!\n\nFollow-up questions:\n- What's my biggest expense category?\n- How can I increase my savings?\n- Am I spending too much on anything?\n- What's my savings rate?",
    timestamp: new Date()
  }]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<GeminiModel>(GEMINI_MODELS.FLASH_LITE);
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const modelSelectorRef = React.useRef<HTMLDivElement>(null);

  // --- Resize Logic ---
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setWidth(newWidth);
        if (isOpen) {
          const isMobile = window.innerWidth < 768;
          onOpenChange?.(isMobile ? 0 : newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isOpen, onOpenChange]);

  const toggleChat = (open: boolean) => {
    setIsOpen(open);
    const isMobile = window.innerWidth < 768;
    onOpenChange?.(open && !isMobile ? width : 0);
  };

  // Generate context-aware suggestions based on transaction data
  const getSuggestions = React.useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Get top expense categories
    const categoryExpenses = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const cat = t.category || 'Other';
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryExpenses)
      .sort(([, a], [, b]) => b - a)[0];

    const suggestions: string[] = [];

    // Base suggestions
    if (messages.length <= 2) {
      suggestions.push(
        "How can I increase my savings?",
        "Analyze my spending patterns",
        "What am I spending too much on?",
        "Give me a financial health summary"
      );
    } else {
      // Context-aware suggestions based on data
      if (savingsRate < 20) {
        suggestions.push("How can I save more money?");
      }
      if (topCategory) {
        suggestions.push(`Why is my ${topCategory[0]} spending high?`);
      }
      suggestions.push(
        "What should I do to improve my finances?",
        "Give me tips to reduce expenses",
        "Am I making any financial mistakes?",
        "What are my biggest spending categories?"
      );
    }

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }, [transactions, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Click outside to close model selector
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelSelector]);

  // Show suggestions when chat is opened and empty
  React.useEffect(() => {
    if (isOpen && messages.length <= 1 && !input.trim()) {
      setShowSuggestions(true);
    }
  }, [isOpen, messages.length, input]);

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const response = await getFinancialAdvice(
        userMessage.content,
        transactions,
        messages,
        selectedModel
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages((prev: Message[]) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getModelDisplayName = (model: GeminiModel): string => {
    switch (model) {
      case GEMINI_MODELS.PRO_LATEST: return 'Pro';
      case GEMINI_MODELS.FLASH_LATEST: return 'Flash';
      case GEMINI_MODELS.FLASH_2_0: return 'Flash 2.0';
      case GEMINI_MODELS.FLASH_LITE: return 'Flash Lite';
      default: return 'Flash Lite';
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => toggleChat(true)}
          className="fixed top-1/2 right-0 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-l-xl shadow-lg hover:bg-indigo-700 transition-all z-50 group"
          title="Open Financial Advisor"
        >
          <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Sidebar Panel - Rendered via Portal */}
      {createPortal(
        <div
          className={`fixed top-0 right-0 h-screen bg-white dark:bg-gray-900 shadow-2xl z-[9999] flex flex-col border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          style={{ width: `${width}px` }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500 transition-colors z-50 bg-transparent"
            title="Drag to resize"
          />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Financial Advisor</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([{
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: "Hello! 👋 I'm your AI Financial Advisor. I can help you with:\n\n💰 Increasing your savings\n📉 Reducing expenses\n📊 Analyzing spending patterns\n💡 Providing personalized financial advice\n🎯 Setting financial goals\n⚠️ Identifying spending issues\n\nAsk me anything about your finances!\n\nFollow-up questions:\n- What's my biggest expense category?\n- How can I increase my savings?\n- Am I spending too much on anything?\n- What's my savings rate?",
                  timestamp: new Date()
                }])}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Model Selector */}
              <div className="relative" ref={modelSelectorRef}>
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Select Model"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>

                {showModelSelector && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {Object.values(GEMINI_MODELS).map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelSelector(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedModel === model ? 'text-indigo-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {getModelDisplayName(model)}
                      </button>
                    ))}
                  </div>
                )}
              </div>



              <button
                onClick={() => toggleChat(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Close Sidebar"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg: Message) => {
              // Parse follow-up questions from message
              const parts = msg.content.split(/Follow-up questions?:/i);
              const mainContent = parts[0].trim();
              const followUpSection = parts[1];
              const followUpQuestions = followUpSection ? followUpSection.split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.replace(/^-\s*/, '').trim()) : [];

              return (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl px-4 py-3'
                    : 'space-y-2'
                    }`}>
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent}</ReactMarkdown>
                          </div>
                        </div>
                        {followUpQuestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {followUpQuestions.map((question: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => handleSend(question)}
                                className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                disabled={isLoading}
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your finances..."
                className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
