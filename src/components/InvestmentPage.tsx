import React from 'react';
import { TrendingUp, DollarSign, Target, BookOpen, AlertTriangle, Lightbulb } from 'lucide-react';

const InvestmentPage: React.FC = () => {
  const investmentOptions = [
    {
      icon: TrendingUp,
      title: 'Growth Portfolios',
      description: 'High-growth potential investments for long-term wealth building.',
      riskLevel: 'High',
      expectedReturn: '8-12%',
      timeHorizon: '5+ years',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: DollarSign,
      title: 'Income Portfolios',
      description: 'Steady income-generating investments with dividend focus.',
      riskLevel: 'Medium',
      expectedReturn: '4-7%',
      timeHorizon: '3-5 years',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Target,
      title: 'Balanced Portfolios',
      description: 'Balanced mix of growth and income investments.',
      riskLevel: 'Medium',
      expectedReturn: '5-8%',
      timeHorizon: '3-7 years',
      gradient: 'from-purple-500 to-violet-500',
    },
    {
      icon: BookOpen,
      title: 'Conservative Portfolios',
      description: 'Low-risk investments focused on capital preservation.',
      riskLevel: 'Low',
      expectedReturn: '2-5%',
      timeHorizon: '1-3 years',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const investmentTools = [
    {
      title: 'Portfolio Analyzer',
      description: 'Analyze your current portfolio performance and risk metrics.',
      features: ['Risk Assessment', 'Performance Tracking', 'Asset Allocation', 'Benchmark Comparison'],
    },
    {
      title: 'Investment Calculator',
      description: 'Calculate potential returns and plan your investment strategy.',
      features: ['Return Projections', 'Compound Interest', 'Goal Planning', 'Tax Implications'],
    },
    {
      title: 'Market Research',
      description: 'Access comprehensive market data and research reports.',
      features: ['Stock Analysis', 'Market Trends', 'Economic Indicators', 'Expert Insights'],
    },
    {
      title: 'Risk Management',
      description: 'Tools to assess and manage investment risks effectively.',
      features: ['Risk Profiling', 'Diversification Analysis', 'Stress Testing', 'Risk Alerts'],
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="gradient-text">Investment</span> <span className="rainbow-text">Solutions</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Build wealth through intelligent investment strategies tailored to your risk tolerance, timeline, and financial goals.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="glass-panel animated-border px-8 py-3 rounded-lg font-semibold text-white hover:bg-white/10 transition-all">
            Start Investing
          </button>
          <button className="px-8 py-3 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:text-white border border-white/20 hover:border-white/40 transition-all">
            Free Portfolio Review
          </button>
        </div>
      </section>

      {/* Investment Options */}
      <section>
        <h2 className="text-3xl font-bold text-center rainbow-text mb-12">Investment Portfolios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {investmentOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div key={index} className="glass-panel animated-border p-6 rounded-xl hover:bg-white/5 transition-all duration-300">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${option.gradient} flex items-center justify-center mb-4`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-lg font-bold gradient-text mb-2">{option.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">{option.description}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Risk Level:</span>
                    <span className={`font-semibold ${
                      option.riskLevel === 'High' ? 'text-red-400' :
                      option.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                    }`}>{option.riskLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Expected Return:</span>
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">{option.expectedReturn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Time Horizon:</span>
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">{option.timeHorizon}</span>
                  </div>
                </div>
                
                <button className="mt-4 w-full py-2 px-4 rounded-lg border border-white/20 text-gray-600 dark:text-gray-300 hover:border-white/40 hover:text-white transition-all text-sm">
                  Learn More
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Investment Tools */}
      <section>
        <h2 className="text-3xl font-bold text-center gradient-text mb-12">Investment Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {investmentTools.map((tool, index) => (
            <div key={index} className="glass-panel p-6 rounded-xl">
              <h3 className="text-xl font-bold rainbow-text mb-3">{tool.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{tool.description}</p>
              
              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Features:</h4>
                <ul className="grid grid-cols-2 gap-1">
                  {tool.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border border-blue-500/30 hover:border-blue-400/50 transition-all">
                Try Tool
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Market Insights */}
      <section className="glass-panel p-8 rounded-xl">
        <h2 className="text-3xl font-bold text-center gradient-text mb-8">Market Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold rainbow-text mb-2">+12.5%</div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">Average Annual Return</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">S&P 500 (10-year avg)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold rainbow-text mb-2">$10K</div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">Minimum Investment</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">To start building wealth</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold rainbow-text mb-2">15%</div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">Portfolio Diversification</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">Across asset classes</div>
          </div>
        </div>
      </section>

      {/* Risk Warning */}
      <section className="glass-panel p-6 rounded-xl border-l-4 border-yellow-500">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-500 mb-2">Investment Risk Disclosure</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              All investments carry risk and may lose value. Past performance does not guarantee future results. 
              Please consider your investment objectives, risk tolerance, and time horizon before investing. 
              Consult with a financial advisor if you need personalized investment advice.
            </p>
          </div>
        </div>
      </section>

      {/* Investment Tips */}
      <section>
        <h2 className="text-3xl font-bold text-center rainbow-text mb-8">Investment Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl">
            <Lightbulb className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="font-semibold gradient-text mb-2">Start Early</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">The power of compound interest works best when you start investing early, even with small amounts.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl">
            <Lightbulb className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="font-semibold gradient-text mb-2">Diversify</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Spread your investments across different asset classes to reduce risk and improve potential returns.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl">
            <Lightbulb className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="font-semibold gradient-text mb-2">Stay Consistent</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Regular, consistent investing through dollar-cost averaging can help reduce the impact of market volatility.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold gradient-text mb-4">Ready to Start Investing?</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Take the first step towards building long-term wealth with our expert-designed investment portfolios and tools.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="glass-panel animated-border px-8 py-4 rounded-lg font-semibold text-white hover:bg-white/10 transition-all">
            Open Investment Account
          </button>
          <button className="px-8 py-4 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:text-white border border-white/20 hover:border-white/40 transition-all">
            Schedule Consultation
          </button>
        </div>
      </section>
    </div>
  );
};

export default InvestmentPage;