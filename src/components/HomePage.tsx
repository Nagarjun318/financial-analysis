import React from 'react';
import { ArrowRight, Star, Award, Target } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="rainbow-text">Your Complete</span>
          <br />
          <span className="gradient-text">Financial Platform</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Manage your finances, track investments, analyze spending patterns, and plan your financial future—all in one powerful platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="glass-panel animated-border px-8 py-3 rounded-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            Get Started
            <ArrowRight className="inline h-5 w-5 ml-2" />
          </button>
          <button className="px-8 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all">
            Learn More
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-panel p-8 rounded-xl">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold gradient-text mb-3">Smart Analytics</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Advanced financial analytics with AI-powered insights to help you understand your spending patterns and optimize your budget.
            </p>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-xl">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center mb-4">
              <Award className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold gradient-text mb-3">Investment Tracking</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor your investment portfolio with real-time data, performance metrics, and personalized recommendations.
            </p>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-xl">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold gradient-text mb-3">Goal Planning</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Set and track financial goals with smart recommendations and progress monitoring to achieve your dreams.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="glass-panel p-8 rounded-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold rainbow-text mb-2">10K+</div>
            <div className="text-gray-600 dark:text-gray-300">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold rainbow-text mb-2">$50M+</div>
            <div className="text-gray-600 dark:text-gray-300">Assets Tracked</div>
          </div>
          <div>
            <div className="text-3xl font-bold rainbow-text mb-2">99.9%</div>
            <div className="text-gray-600 dark:text-gray-300">Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-bold rainbow-text mb-2">24/7</div>
            <div className="text-gray-600 dark:text-gray-300">Support</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold gradient-text mb-4">Ready to Take Control?</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Join thousands of users who have transformed their financial lives with our comprehensive platform.
        </p>
        <button className="glass-panel animated-border px-8 py-4 rounded-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          Start Your Journey
          <ArrowRight className="inline h-5 w-5 ml-2" />
        </button>
      </section>
    </div>
  );
};

export default HomePage;