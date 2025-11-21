import React from 'react';
import { Brain, Code, Sparkles, Shield, Zap, Heart } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center py-12 animate-fadeIn">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">About</span>{' '}
          <span className="text-gray-900 dark:text-white">SmartLife Hub</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          An AI-powered platform that brings together financial management and kitchen organization to simplify your daily life.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slideUp">
        <div className="glass-panel p-8 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-primary/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            To democratize access to intelligent financial and household management tools by leveraging cutting-edge AI technology.
            We believe everyone deserves powerful, easy-to-use tools that help them make better decisions about their money and daily life.
          </p>
        </div>
        <div className="glass-panel p-8 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-4">Our Vision</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            A world where AI assistants handle the complexity of financial analysis and household management,
            freeing people to focus on what matters most—achieving their goals and living their best lives.
          </p>
        </div>
      </section>

      {/* What We Built */}
      <section className="glass-panel p-10 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">What We've Built</span>
        </h2>
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
            SmartLife Hub is a comprehensive platform that combines two essential aspects of modern life:
            <span className="font-semibold text-gray-900 dark:text-white"> financial management</span> and
            <span className="font-semibold text-gray-900 dark:text-white"> kitchen organization</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                Financial Intelligence
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                <li>• AI-powered transaction categorization using Google Gemini</li>
                <li>• Natural language search for finding transactions</li>
                <li>• Predictive forecasting for future expenses</li>
                <li>• Interactive dashboards with real-time analytics</li>
                <li>• Personal AI financial advisor chatbot</li>
                <li>• Automated bank statement parsing (PDF & Excel)</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                Kitchen Management
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                <li>• Smart inventory tracking with stock levels</li>
                <li>• Automatic low-stock alerts</li>
                <li>• AI Chef for recipe suggestions</li>
                <li>• Meal planning based on available ingredients</li>
                <li>• Intelligent shopping list generation</li>
                <li>• Price tracking and purchase history</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Built With Modern Technology</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Google Gemini AI</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              State-of-the-art language models for intelligent categorization, forecasting, and conversational AI.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">Supabase</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Secure, scalable database with real-time capabilities and row-level security for your data.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Code className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">React + TypeScript</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Modern, type-safe frontend framework for building robust, maintainable applications.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Tailwind CSS</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Utility-first CSS framework for creating beautiful, responsive designs with dark mode support.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">Vite</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Lightning-fast build tool for instant hot module replacement and optimized production builds.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">Open Source</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Built with love using open-source technologies and best practices from the community.
            </p>
          </div>
        </div>
      </section>

      {/* Our Principles */}
      <section className="glass-panel p-10 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Our Principles</span>
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
              Privacy First
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Your financial data is yours alone. We use row-level security and encryption to ensure your information stays private and secure.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              AI-Powered Intelligence
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We leverage the latest AI models to provide smart insights, accurate predictions, and helpful assistance that learns from your patterns.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              User-Centric Design
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Every feature is designed with simplicity and usability in mind. Complex tasks are made simple through intuitive interfaces.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-600"></div>
              Continuous Innovation
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We're constantly improving and adding new features based on the latest technology and user feedback to serve you better.
            </p>
          </div>
        </div>
      </section>

      {/* The Journey */}
      <section className="glass-panel p-10 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">The Journey</span>
        </h2>
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
            SmartLife Hub started as a personal project to solve a common problem: managing finances and household tasks
            is time-consuming and complex. We wanted to build something that leverages AI to make these tasks effortless.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
            What began as a simple expense tracker evolved into a comprehensive platform that combines financial intelligence
            with kitchen management. By integrating Google's Gemini AI, we've created a system that not only tracks your
            data but understands it, predicts trends, and provides actionable insights.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
            Today, SmartLife Hub features natural language search, AI-powered categorization, predictive forecasting,
            an intelligent financial advisor chatbot, and an AI kitchen assistant that helps with meal planning and
            grocery management. And we're just getting started.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center py-12 glass-panel rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
        <h2 className="text-3xl font-bold mb-4">
          <span className="bg-gradient-to-r from-brand-primary to-purple-600 bg-clip-text text-transparent">Questions or Feedback?</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
          We'd love to hear from you! Whether you have questions, suggestions, or just want to say hi.
        </p>
        <button className="glass-panel animated-border px-10 py-4 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          Get in Touch
        </button>
      </section>
    </div>
  );
};

export default AboutPage;