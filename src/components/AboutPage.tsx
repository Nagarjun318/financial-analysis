import React from 'react';
import { Users, Heart, Lightbulb, Shield } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="gradient-text">About</span> <span className="rainbow-text">FinanceHub</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          We're on a mission to democratize financial management and make powerful financial tools accessible to everyone.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-xl">
          <h2 className="text-2xl font-bold gradient-text mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            To empower individuals and businesses with intelligent financial tools that simplify money management, 
            provide actionable insights, and help achieve financial goals through data-driven decision making.
          </p>
        </div>
        <div className="glass-panel p-8 rounded-xl">
          <h2 className="text-2xl font-bold gradient-text mb-4">Our Vision</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            A world where everyone has access to sophisticated financial management tools, regardless of their 
            background or expertise, enabling better financial outcomes and long-term prosperity.
          </p>
        </div>
      </section>

      {/* Values */}
      <section>
        <h2 className="text-3xl font-bold text-center rainbow-text mb-12">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold gradient-text mb-2">Security First</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Your financial data is protected with bank-level security and encryption.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold gradient-text mb-2">User-Centric</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Every feature is designed with our users' needs and feedback at the center.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
              <Lightbulb className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold gradient-text mb-2">Innovation</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">We continuously innovate to bring you the latest in fintech solutions.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold gradient-text mb-2">Transparency</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">We believe in clear communication and honest, transparent practices.</p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="glass-panel p-8 rounded-xl">
        <h2 className="text-3xl font-bold text-center gradient-text mb-8">Our Story</h2>
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Founded in 2023, FinanceHub started as a simple expense tracking tool but quickly evolved into a 
            comprehensive financial platform. Our team of financial experts, data scientists, and engineers 
            recognized the need for accessible, powerful financial management tools.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Today, we serve thousands of users worldwide, helping them make informed financial decisions through 
            advanced analytics, intuitive interfaces, and personalized insights. Our platform continues to grow, 
            adding new features and capabilities based on user feedback and emerging financial technologies.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We're committed to building the future of personal and business finance management, one feature at a time.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold rainbow-text mb-4">Get in Touch</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Have questions about our platform or want to learn more about how we can help with your financial goals?
        </p>
        <button className="glass-panel animated-border px-8 py-4 rounded-lg font-semibold text-white hover:bg-white/10 transition-all">
          Contact Us
        </button>
      </section>
    </div>
  );
};

export default AboutPage;