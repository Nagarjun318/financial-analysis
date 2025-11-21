import React from 'react';
import { MessageCircle, Send, Sparkles, X, Settings, Loader2, Bot, User, Trash2, Wrench } from 'lucide-react';
import { HomeService } from '../types';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { getServiceAdvice } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ServiceAdvisorChatProps {
  services: HomeService[];
}

export function ServiceAdvisorChat({ services }: ServiceAdvisorChatProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([{
    id: '1',
    role: 'assistant' as const,
    content: "Hello! 👋 I'm your AI Service Advisor. I can help you with:\n\n🔧 Service maintenance schedules\n💰 Cost optimization strategies\n⚠️ Overdue service alerts\n📅 Planning upcoming services\n💡 Maintenance recommendations\n\nAsk me anything about your home services!",
    timestamp: new Date()
  }]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState(GEMINI_MODELS.FLASH_LITE as GeminiModel);
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const messagesEndRef = React.useRef(null as HTMLDivElement | null);
  const modelSelectorRef = React.useRef(null as HTMLDivElement | null);

  const getSuggestions = React.useMemo(() => {
    const overdueServices = services.filter(s => new Date(s.next_service_due) < new Date());
    const upcomingServices = services.filter(s => {
      const dueDate = new Date(s.next_service_due);
      const today = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    });

    const suggestions: string[] = [];

    if (messages.length <= 2) {
      if (overdueServices.length > 0) {
        suggestions.push("What services are overdue?");
      }
      if (upcomingServices.length > 0) {
        suggestions.push("What services are due soon?");
      }
      suggestions.push(
        "How can I reduce service costs?",
        "Give me maintenance recommendations"
      );
    } else {
      suggestions.push(
        "What's my service health status?",
        "How much will I spend next month?",
        "Which services need priority?",
        "Give me cost-saving tips"
      );
    }

    return suggestions.slice(0, 4);
  }, [services, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  React.useEffect(() => {
    if (isOpen && messages.length <= 2 && !input.trim()) {
      setShowSuggestions(true);
    }
  }, [isOpen, messages.length, input]);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getServiceAdvice(
        input.trim(),
        services,
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
    setInput(suggestion);
    setShowSuggestions(false);
    setTimeout(() => {
      handleSend();
    }, 100);
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
      content: "Hello! 👋 I'm your AI Service Advisor. Ask me anything about your home services!",
      timestamp: new Date()
    }]);
    setShowSuggestions(true);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        />
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-1/2 right-0 -translate-y-1/2 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50 group rounded-l-xl"
          aria-label="Open Service Advisor"
          title="Chat with AI Service Advisor"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      <div
        className={`fixed top-0 right-0 h-screen bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-50 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isOpen ? 'w-full sm:w-[420px] md:w-[480px] lg:w-[520px] translate-x-0' : 'w-0 translate-x-full'
          } `}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Service Advisor</h3>
              <p className="text-xs text-white/80">AI-powered maintenance help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${selectedModel === model
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
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

            <button
              onClick={clearChat}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
              title="Clear conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Wrench className="w-5 h-5 text-white" />
                )}
              </div>

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                  }`}
              >
                <div className="text-sm prose dark:prose-invert max-w-none prose-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                      ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-2" {...props} />,
                      li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                      strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                  {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {showSuggestions && !isLoading && (
            <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {getSuggestions.map((suggestion: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 hover:from-indigo-200 hover:to-purple-200 dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40 transition-all hover:scale-105 border border-indigo-200 dark:border-indigo-700"
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
              placeholder="Ask about your services..."
              className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none max-h-24"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0"
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

export default ServiceAdvisorChat;
