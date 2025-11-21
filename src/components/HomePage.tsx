import React from 'react';
import { ArrowRight, TrendingUp, Brain, ShoppingCart, BarChart3, Sparkles, Wallet } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center py-12 animate-fadeIn">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full text-brand-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Financial & Kitchen Management
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Your Smart Life</span>
          <br />
          <span className="text-gray-900 dark:text-white">Management Hub</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Master your finances, track transactions with AI, plan your budget, and manage your kitchen inventory—all powered by cutting-edge AI technology.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="glass-panel animated-border px-8 py-3 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group">
            Get Started
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-primary transition-all">
            View Demo
          </button>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">AI Financial Advisor</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Get personalized financial advice powered by Gemini AI. Ask questions about your spending, get budget recommendations, and receive smart insights.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">Smart Analytics</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Visualize your financial data with interactive charts. Track income, expenses, and savings with AI-powered categorization and trend analysis.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">AI Forecasting</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Predict future expenses and income with machine learning. Get accurate forecasts to plan your budget and achieve your financial goals.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <Wallet className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Transaction Management</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Upload bank statements, search with natural language, and let AI automatically categorize your transactions for effortless tracking.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/20">
            <ShoppingCart className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-3">AI Kitchen Assistant</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Manage your grocery inventory, get recipe suggestions based on what you have, and let AI help you plan meals and shopping lists.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-3">Natural Language Search</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Find transactions instantly by asking in plain English. "Show me all groceries over ₹5000 last month" - it just works!
          </p>
        </div>
      </section>

      {/* Key Features Highlight */}
      <section className="glass-panel p-10 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Everything You Need</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
              Financial Management
            </h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2"></div>
                <span>Upload and parse bank statements (PDF/Excel)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2"></div>
                <span>AI-powered transaction categorization</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2"></div>
                <span>Interactive dashboards and visualizations</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2"></div>
                <span>Monthly forecasts and budget planning</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2"></div>
                <span>Personalized financial advice chatbot</span>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              Kitchen Management
            </h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2"></div>
                <span>Track grocery inventory with stock levels</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2"></div>
                <span>Automatic low-stock alerts and shopping lists</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2"></div>
                <span>AI Chef for recipe suggestions and meal planning</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2"></div>
                <span>Price tracking and purchase history</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2"></div>
                <span>Smart shopping recommendations</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Powered By</h2>
        <div className="flex flex-wrap justify-center gap-6 items-center">
          <div className="glass-panel px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Google Gemini AI</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Supabase</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-700 dark:text-gray-300">React + TypeScript</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Tailwind CSS</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12 glass-panel rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Ready to Transform Your Life?</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
          Start managing your finances and kitchen with the power of AI. It's free to get started!
        </p>
        <button className="glass-panel animated-border px-10 py-4 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto group">
          Start Your Journey
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>
    </div>
  );
};

export default HomePage;