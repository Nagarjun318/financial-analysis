import React from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, Sparkles, X, Settings, Loader2, Bot, User, Trash2, ShoppingCart, Plus, Utensils } from 'lucide-react';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';
import { getKitchenAssistance } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedItems?: Array<{ item_name: string; category: string; quantity: number; unit: string }>;
}

interface GroceryItem {
  id: number;
  item_name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

interface GroceryAdvisorChatProps {
  groceries: GroceryItem[];
  onAddToShoppingList: (items: Array<{ item_name: string; category: string; quantity: number; unit: string }>) => void;
  onOpenChange?: (width: number) => void;
}

export function GroceryAdvisorChat({ groceries, onAddToShoppingList, onOpenChange }: GroceryAdvisorChatProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [width, setWidth] = React.useState(450);
  const [isResizing, setIsResizing] = React.useState(false);

  const [messages, setMessages] = React.useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: "Hello! 👨‍🍳 I'm your AI Kitchen Assistant. I can help you with:\n\n🍳 Recipe suggestions\n📋 Meal planning\n🛒 Shopping list creation\n💡 Cooking tips\n📊 Ingredient management\n\nAsk me anything about cooking or your groceries!\n\nFollow-up questions:\n- What can I cook with my current ingredients?\n- Create a weekly meal plan for me\n- What should I buy this week?\n- Suggest quick dinner ideas",
    timestamp: new Date()
  }]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<GeminiModel>(GEMINI_MODELS.FLASH_LITE);
  const [showModelSelector, setShowModelSelector] = React.useState(false);

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
          onOpenChange?.(newWidth);
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
    onOpenChange?.(open ? width : 0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate context-aware suggestions based on grocery data
  // Update initial message with smart suggestions when groceries change
  React.useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant') {
      const lowStockItems = groceries.filter(g => g.current_stock < g.min_stock);
      const suggestions: string[] = [];

      if (lowStockItems.length > 0) {
        suggestions.push(`What can I cook with ${groceries[0]?.item_name || 'my ingredients'}?`);
        suggestions.push("Generate a shopping list for low stock items");
      } else {
        suggestions.push("Suggest a healthy dinner recipe");
        suggestions.push("How to meal prep for the week?");
      }
      suggestions.push("What are some quick breakfast ideas?");
      suggestions.push("Give me some kitchen safety tips");

      const smartQuestions = suggestions.slice(0, 4);

      setMessages((prev: Message[]) => {
        const newMessages = [...prev];
        const baseContent = "Hello! 👨‍🍳 I'm your AI Kitchen Assistant. I can help you with:\n\n🍳 Recipe suggestions\n📋 Meal planning\n🛒 Shopping list creation\n💡 Cooking tips\n📊 Ingredient management\n\nAsk me anything about cooking or your groceries!";
        const questionsSection = `\n\nFollow-up questions:\n${smartQuestions.map(q => `- ${q}`).join('\n')}`;

        newMessages[0] = {
          ...newMessages[0],
          content: baseContent + questionsSection
        };
        return newMessages;
      });
    }
  }, [groceries.length, messages.length]); // Only re-run if grocery count changes or message count is 1

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

    try {
      const result = await getKitchenAssistance(
        messageText,
        groceries,
        [], // Empty shopping list for now
        selectedModel
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        suggestedItems: result.suggestedShoppingItems
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

  const handleAddToShoppingList = (items: Array<{ item_name: string; category: string; quantity: number; unit: string }>) => {
    onAddToShoppingList(items);
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
          className="fixed top-1/2 right-0 -translate-y-1/2 p-3 bg-green-600 text-white rounded-l-xl shadow-lg hover:bg-green-700 transition-all z-50 group"
          title="Open Kitchen Assistant"
        >
          <Utensils className="w-6 h-6 group-hover:scale-110 transition-transform" />
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
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-green-500 transition-colors z-50 bg-transparent"
            title="Drag to resize"
          />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Utensils className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Kitchen Assistant</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
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
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedModel === model ? 'text-green-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {getModelDisplayName(model)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setMessages([{
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: "Hello! 👨‍🍳 I'm your AI Kitchen Assistant. I can help you with:\n\n🍳 Recipe suggestions\n📋 Meal planning\n🛒 Shopping list creation\n💡 Cooking tips\n📊 Ingredient management\n\nAsk me anything about cooking or your groceries!\n\nFollow-up questions:\n- What can I cook with my current ingredients?\n- Create a weekly meal plan for me\n- What should I buy this week?\n- Suggest quick dinner ideas",
                  timestamp: new Date()
                }])}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

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
              let followUpQuestions = followUpSection ? followUpSection.split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.replace(/^-\s*/, '').trim()) : [];

              // Ensure strictly clickable suggestions for every assistant reply
              if (msg.role === 'assistant' && followUpQuestions.length === 0) {
                followUpQuestions = [
                  "What can I cook with my ingredients?",
                  "Check my inventory status",
                  "Suggest a quick meal"
                ];
              }

              return (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === 'user'
                    ? 'bg-green-600 text-white rounded-2xl px-4 py-3'
                    : 'space-y-2'
                    }`}>
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent}</ReactMarkdown>
                          </div>
                        </div>

                        {/* Suggested Shopping Items */}
                        {msg.suggestedItems && msg.suggestedItems.length > 0 && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Suggested Shopping List
                            </h4>
                            <ul className="space-y-1.5 mb-3">
                              {msg.suggestedItems.map((item: { item_name: string; category: string; quantity: number; unit: string }, i: number) => (
                                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg">
                                  <span>{item.item_name}</span>
                                  <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    {item.quantity} {item.unit}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => handleAddToShoppingList(msg.suggestedItems!)}
                              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add All to Shopping List
                            </button>
                          </div>
                        )}

                        {/* Follow-up Questions */}
                        {followUpQuestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {followUpQuestions.map((question: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => handleSend(question)}
                                className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-600 transition-colors text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
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
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
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
                placeholder="Ask about recipes, meals, or shopping..."
                className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-green-500 max-h-32"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
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
