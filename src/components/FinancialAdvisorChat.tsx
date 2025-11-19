import React from 'react';
import { MessageCircle, Send, Sparkles, X, Settings, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { Transaction } from '../types';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { getFinancialAdvice } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FinancialAdvisorChatProps {
  transactions: Transaction[];
}

export function FinancialAdvisorChat({ transactions }: FinancialAdvisorChatProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([{
    id: '1',
    role: 'assistant' as const,
    content: "Hello! 👋 I'm your AI Financial Advisor. I can help you with:\n\n💰 Increasing your savings\n📉 Reducing expenses\n📊 Analyzing spending patterns\n💡 Providing personalized financial advice\n🎯 Setting financial goals\n⚠️ Identifying spending issues\n\nAsk me anything about your finances!",
    timestamp: new Date()
  }]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LITE as GeminiModel);
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const messagesEndRef = React.useRef(null as HTMLDivElement | null);
  const modelSelectorRef = React.useRef(null as HTMLDivElement | null);

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

  const getModelDisplayName = (model: GeminiModel): string => {
    switch (model) {
      case GEMINI_MODELS.PRO_LATEST:
        return 'Gemini Pro';
      case GEMINI_MODELS.FLASH_LATEST:
        return 'Flash Latest';
      case GEMINI_MODELS.FLASH_2_0:
        return 'Flash 2.0';
      case GEMINI_MODELS.FLASH_LITE:
        return 'Flash Lite';
      case GEMINI_MODELS.FLASH_2_5:
        return 'Flash 2.5';
      default:
        return 'Flash Lite';
    }
  };

  const handleSend = async (content?: string | React.MouseEvent) => {
    const messageText = (typeof content === 'string' ? content : input).trim();
    if (!messageText || isLoading) return;

    setShowSuggestions(false); // Hide suggestions when sending

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getFinancialAdvice(
        messageText,
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different question or try another model.`,
        timestamp: new Date()
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleInputFocus = () => {
    if (!input.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      setShowSuggestions(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hello! 👋 I'm your AI Financial Advisor. Ask me anything about your finances!",
      timestamp: new Date()
    }]);
    setShowSuggestions(true); // Show suggestions after clearing
  };

  // Show suggestions when chat opens
  React.useEffect(() => {
    if (isOpen && messages.length <= 2 && !input.trim()) {
      setShowSuggestions(true);
    }
  }, [isOpen, messages.length, input]);

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        />
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-1/2 right-0 -translate-y-1/2 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50 group rounded-l-xl"
          aria-label="Open Financial Advisor"
          title="Chat with AI Financial Advisor"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Side Pane */}
      <div 
        className={`fixed top-0 right-0 h-screen bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-50 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-full sm:w-[420px] md:w-[480px] lg:w-[520px] translate-x-0' : 'w-0 translate-x-full'
        }`}
      >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Financial Advisor</h3>
            <p className="text-xs text-white/80">AI-powered insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="relative" ref={modelSelectorRef}>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
              title="Select AI Model"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {showModelSelector && (
              <div className="absolute top-12 right-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-10">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  Select AI Model
                </div>
                {Object.values(GEMINI_MODELS).map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedModel === model
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {getModelDisplayName(model)}
                    {selectedModel === model && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Chat */}
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            title="Clear conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            title="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
        {messages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                : 'bg-gradient-to-br from-purple-500 to-pink-500'
            }`}>
              {message.role === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        {/* Suggestion Chips */}
        {showSuggestions && !isLoading && (
          <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {getSuggestions.map((suggestion: string, index: number) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40 transition-all hover:scale-105 border border-purple-200 dark:border-purple-700"
              >
                💡 {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your finances..."
            className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none max-h-24"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-3 h-3" />
          <span>Powered by {getModelDisplayName(selectedModel)}</span>
        </div>
      </div>
      </div>
    </>
  );
}

export default FinancialAdvisorChat;
