import React, { useRef, useEffect, useState } from 'react';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface WelcomeProps {
  onNavigateToLogin: () => void;
  onNavigateToPatronLogin: () => void;
}

const AnimatedFeatureCard: React.FC<{ children: React.ReactNode, delay?: number }> = ({ children, delay = 0 }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.transitionDelay = `${delay}ms`;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-visible');
                observer.unobserve(element);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [delay]);
    
    return <div ref={ref} className="scroll-animate">{children}</div>
}

// Hacker Text Effect Component
const HackerText: React.FC<{ text: string, className?: string }> = ({ text, className }) => {
  const [displayText, setDisplayText] = useState(text);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let iterations = 0;

    const animate = () => {
        clearInterval(interval);
        interval = setInterval(() => {
            setDisplayText(prev => 
                text.split("")
                .map((char, index) => {
                    if(index < iterations) return text[index];
                    return letters[Math.floor(Math.random() * letters.length)];
                })
                .join("")
            );
            
            if(iterations >= text.length) clearInterval(interval);
            iterations += 1/2; // Speed of decoding
        }, 40);
    };

    animate();

    return () => clearInterval(interval);
  }, [text, isHovered]); // Re-run on hover

  return (
    <span 
        className={className} 
        onMouseEnter={() => setIsHovered(!isHovered)} // Trigger re-animation
    >
        {displayText}
    </span>
  );
};

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToPatronLogin }) => {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Hero Section */}
      <header className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden p-6 bg-gray-50 dark:bg-gray-950">
        
        {/* Dynamic Background Grid & Glow */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-pink-500 opacity-20 blur-[100px]"></div>
            <div className="absolute right-0 bottom-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-purple-500 opacity-20 blur-[100px]"></div>
        </div>

        <div className="text-center z-10 p-4 max-w-5xl mx-auto flex flex-col items-center">
          
          {/* Top Tagline */}
          <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                  Naggalama
              </span>
          </div>

          {/* Main Heading with Hacker Effect */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-gray-400 drop-shadow-sm pb-4 leading-[1.1] sm:leading-tight">
            <div className="flex flex-col items-center">
                <HackerText text="ICT CLUB" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-gradient-x" />
                <span className="text-gray-800 dark:text-white mt-[-10px] sm:mt-[-20px]">HUB</span>
            </div>
          </h1>
          
          <p className="mt-8 text-lg md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto animate-fade-in-up opacity-0 leading-relaxed font-light" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            The ultimate platform for students to <span className="font-semibold text-pink-600 dark:text-pink-400">connect</span>, <span className="font-semibold text-purple-600 dark:text-purple-400">code</span>, and <span className="font-semibold text-indigo-600 dark:text-indigo-400">create</span> the future.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-5 w-full justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}>
              <button
                onClick={onNavigateToLogin}
                className="group relative w-full sm:w-auto px-10 py-4 text-lg font-bold text-white rounded-xl shadow-xl shadow-pink-500/20 overflow-hidden transition-all hover:scale-105 hover:shadow-pink-500/40 focus:outline-none focus:ring-4 focus:ring-pink-500/50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 group-hover:from-pink-500 group-hover:to-purple-500 transition-all"></div>
                <span className="relative flex items-center justify-center gap-2">
                    Enter the Hub <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>
              
              <button
                onClick={onNavigateToPatronLogin}
                className="w-full sm:w-auto px-10 py-4 text-lg font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105"
              >
                Patron Login
              </button>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-gray-400 dark:text-gray-600 hidden md:block">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </header>
      
      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                    Everything you need.
                </h2>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    We've built a comprehensive suite of tools to streamline your club experience and foster collaboration.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <AnimatedFeatureCard delay={0}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-pink-200 dark:hover:border-pink-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <CalendarIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Activities</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Never miss a beat. Track workshops, hackathons, and meetings. RSVP instantly and keep your schedule synced.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 2 */}
                <AnimatedFeatureCard delay={100}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-purple-200 dark:hover:border-purple-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                          <ClipboardListIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Projects</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Collaborate like pros. Use our Kanban board to manage tasks, assign roles, review code, and ship projects faster.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 3 */}
                <AnimatedFeatureCard delay={200}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <ChatBubbleIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Community</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Stay connected. Engage in real-time discussions, share resources, ask for help, and celebrate wins together.
                      </p>
                  </div>
                </AnimatedFeatureCard>
            </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
            <div className="p-12 md:p-16 rounded-[2.5rem] bg-gradient-to-b from-gray-900 to-black dark:from-gray-800 dark:to-gray-900 text-white shadow-2xl overflow-hidden relative border border-gray-800">
                
                {/* Glowing orbs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-600/30 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">Ready to join the club?</h2>
                    <p className="mb-12 text-xl text-gray-300 max-w-2xl mx-auto font-light">
                        Start your journey today. Become a part of the most innovative student community in Naggalama.
                    </p>
                    <button
                        onClick={onNavigateToLogin}
                        className="px-12 py-5 text-xl font-bold text-gray-900 bg-white rounded-2xl shadow-lg hover:bg-gray-50 hover:scale-105 transition-all duration-300"
                    >
                        Get Started Now
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-center">
        <div className="container mx-auto px-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">&copy; {new Date().getFullYear()} ICT Club Naggalama. All rights reserved.</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1">
                Made with <span className="text-pink-500 animate-pulse">♥</span> and Code
            </p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;