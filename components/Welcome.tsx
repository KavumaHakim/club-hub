
import React, { useRef, useEffect, useState } from 'react';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import ThreeBackground from './ThreeBackground';

interface WelcomeProps {
  onNavigateToLogin: () => void;
  onNavigateToSignUp: () => void;
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
  const [displayText, setDisplayText] = useState("");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
  
  useEffect(() => {
    let iterations = 0;
    const interval = setInterval(() => {
        setDisplayText(text.split("")
            .map((char, index) => {
                if(index < iterations) return text[index];
                return letters[Math.floor(Math.random() * letters.length)];
            })
            .join("")
        );
        
        if(iterations >= text.length) clearInterval(interval);
        iterations += 1/3; // Speed of decoding
    }, 30);

    return () => clearInterval(interval);
  }, [text]); 

  return (
    <span className={className}>
        {displayText}
    </span>
  );
};

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToSignUp, onNavigateToPatronLogin }) => {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col font-sans selection:bg-pink-500 selection:text-white overflow-x-hidden">
      <style>{`
        @keyframes gradient-fast {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-gradient-fast {
            background-size: 300% 300%;
            animation: gradient-fast 2s linear infinite;
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
        }
        .shine-effect {
            position: relative;
            overflow: hidden;
        }
        .shine-effect::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
            animation: shine 3s infinite;
        }
        @keyframes shine {
            0% { left: -100%; }
            20% { left: 100%; }
            100% { left: 100%; }
        }
      `}</style>
      
      {/* Hero Section */}
      <header className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden p-6 bg-gray-50 dark:bg-gray-950">
        
        {/* 3D Background */}
        <ThreeBackground />
        
        {/* Constant Moving Grid (Optional, keep for retro feel overlaying the 3D) */}
        <div className="absolute inset-0 z-0 opacity-5 dark:opacity-10 pointer-events-none">
             <div className="absolute inset-0" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.2) 1px, transparent 1px)', 
                    backgroundSize: '40px 40px',
                    height: '100%'
                }}>
            </div>
        </div>

        <div className="text-center z-10 p-4 max-w-5xl mx-auto flex flex-col items-center animate-float">
          
          {/* Top Tagline */}
          <div className="mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 uppercase tracking-widest backdrop-blur-md">
                  Naggalama
              </span>
          </div>

          {/* Main Heading with Hacker Effect and Constant Motion Gradient */}
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter drop-shadow-2xl pb-4 leading-[1.1]">
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-gradient-fast">
                    <HackerText text="ICT CLUB" />
                </div>
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-fast mt-[-10px] sm:mt-[-20px]">
                    <HackerText text="HUB" />
                </div>
            </div>
          </h1>
          
          {/* Hero CTA - Login & Sign Up Buttons (Directly below heading) */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-40 px-8 py-4 text-lg font-bold text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-200 dark:text-white dark:bg-gray-800/90 dark:border-gray-700 rounded-xl shadow-lg hover:scale-105 transition-all hover:shadow-xl hover:border-pink-500/50"
              >
                Login
              </button>
              
              <button
                onClick={onNavigateToSignUp}
                className="group w-full sm:w-auto px-12 py-4 text-xl font-black text-white rounded-xl shadow-xl shadow-pink-500/30 overflow-hidden transition-all hover:scale-105 hover:shadow-pink-500/50 focus:outline-none focus:ring-4 focus:ring-pink-500/50 shine-effect border-2 border-transparent bg-gradient-to-r from-pink-600 to-purple-600"
              >
                 <span className="relative flex items-center justify-center gap-2 z-10">
                    Sign Up <span className="group-hover:translate-x-1 transition-transform">🚀</span>
                </span>
              </button>
          </div>

          <div className="mt-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
             <button
                onClick={onNavigateToPatronLogin}
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors underline decoration-dotted underline-offset-4 bg-white/50 dark:bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm"
              >
                Are you a Patron? Access here
              </button>
          </div>
          
          <p className="mt-8 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-fade-in-up opacity-0 leading-relaxed font-light bg-white/30 dark:bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/20 dark:border-gray-800/50" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
            Connect. Code. Create. <br/>
            <span className="text-sm font-mono text-pink-500 mt-2 block">System.Status: ONLINE</span>
          </p>
          
        </div>
      </header>
      
      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900 relative z-10">
        <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                    Everything you need.
                </h2>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    A comprehensive suite of tools to streamline your club experience.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <AnimatedFeatureCard delay={0}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-pink-200 dark:hover:border-pink-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-pink-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                          <CalendarIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Activities</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Track workshops, hackathons, and meetings. RSVP instantly and keep your schedule synced.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 2 */}
                <AnimatedFeatureCard delay={100}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-purple-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                          <ClipboardListIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Projects</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Collaborate on a Kanban board. Manage tasks, assign roles, and ship projects faster.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 3 */}
                <AnimatedFeatureCard delay={200}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-indigo-500/10">
                      <div className="w-16 h-16 mb-8 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                          <ChatBubbleIcon />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Community</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Engage in real-time discussions, share resources, and ask for help from peers.
                      </p>
                  </div>
                </AnimatedFeatureCard>
            </div>
        </div>
      </section>
      
      {/* CTA Section at bottom */}
      <section className="py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
        {/* Moving grid background again for consistency */}
        <div className="absolute inset-0 z-0 opacity-10 overflow-hidden">
             <div className="absolute inset-0 animate-move-grid" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.2) 1px, transparent 1px)', 
                    backgroundSize: '40px 40px',
                    height: '200%'
                }}>
            </div>
        </div>

        <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
            <div className="p-12 md:p-16 rounded-[2.5rem] bg-gradient-to-b from-gray-900 to-black dark:from-gray-800 dark:to-gray-900 text-white shadow-2xl overflow-hidden relative border border-gray-800">
                
                {/* Glowing orbs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-600/30 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
                
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">Ready to join the club?</h2>
                    <p className="mb-12 text-xl text-gray-300 max-w-2xl mx-auto font-light">
                        Start your journey today. Become a part of the most innovative student community in Naggalama.
                    </p>
                    <button
                        onClick={onNavigateToSignUp}
                        className="px-12 py-5 text-xl font-bold text-gray-900 bg-white rounded-2xl shadow-lg hover:bg-gray-50 hover:scale-105 transition-all duration-300 shine-effect"
                    >
                        Get Started Now
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-center relative z-10">
        <div className="container mx-auto px-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">&copy; {new Date().getFullYear()} ICT Club Naggalama.</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1">
                Made with <span className="text-pink-500 animate-pulse">♥</span> and Code
            </p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
