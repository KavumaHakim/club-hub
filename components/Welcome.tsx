// FIX: Import useState from React to resolve usage error in HackerText component.
import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import ThreeBackground from './ThreeBackground';

interface WelcomeProps {
  onNavigateToLogin: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToPatronLogin: () => void;
  onNavigateToFreeRunner: () => void;
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

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToSignUp, onNavigateToPatronLogin, onNavigateToFreeRunner }) => {
  
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col font-sans selection:bg-sky-500 selection:text-white overflow-x-hidden">
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
                  STAHIZA
              </span>
          </div>

          {/* Main Heading with Hacker Effect and Constant Motion Gradient */}
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter drop-shadow-2xl pb-4 leading-[1.1]">
            <div className="flex flex-col items-center">
                <div className="bg-gradient-to-r from-sky-500 via-purple-500 to-indigo-900 bg-clip-text text-transparent animate-gradient-fast">
                    <HackerText text="ICT CLUB" />
                </div>
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 bg-clip-text text-transparent animate-gradient-fast mt-[-10px] sm:mt-[-20px]">
                    <HackerText text="HUB" />
                </div>
            </div>
          </h1>
          
          {/* Hero CTA - Login & Sign Up Buttons (Directly below heading) */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-40 px-8 py-4 text-lg font-bold text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-200 dark:text-white dark:bg-gray-800/90 dark:border-gray-700 rounded-xl shadow-lg hover:scale-105 transition-all hover:shadow-xl hover:border-sky-500/50"
              >
                Login
              </button>
              
              <button
                onClick={onNavigateToSignUp}
                className="group w-full sm:w-auto px-12 py-4 text-xl font-black text-white rounded-xl shadow-xl shadow-sky-500/30 overflow-hidden transition-all hover:scale-105 hover:shadow-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/50 shine-effect border-2 border-transparent bg-gradient-to-r from-sky-600 to-indigo-900"
              >
                 <span className="relative flex items-center justify-center gap-2 z-10">
                    Sign Up <span className="group-hover:translate-x-1 transition-transform">🚀</span>
                </span>
              </button>

              <button
                onClick={onNavigateToFreeRunner}
                className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-gray-700 bg-white/40 backdrop-blur-sm border border-gray-200 dark:text-white dark:bg-gray-800/40 dark:border-gray-700 rounded-xl shadow-lg hover:scale-105 transition-all hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Code Runner
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
            <span className="text-sm font-mono text-sky-500 mt-2 block">System.Status: ONLINE</span>
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
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-900 hover:bg-white dark:hover:bg-gray-800/80 transition-all duration-300 transform hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-purple-100 dark:from-sky-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center text-sky-500 dark:text-sky-400 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                          <CalendarIcon className="w-8 h-8"/>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Activities & Events</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                          Stay in the loop with all upcoming workshops, competitions, and social gatherings. RSVP with a single click.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                {/* Feature 2 */}
                <AnimatedFeatureCard delay={100}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-900 hover:bg-white dark:hover:bg-gray-800/80 transition-all duration-300 transform hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-purple-100 dark:from-sky-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center text-sky-500 dark:text-sky-400 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                          <ClipboardListIcon />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Project Boards</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                          Collaborate on club projects using Kanban-style boards. Track tasks, assign members, and monitor progress.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                {/* Feature 3 */}
                <AnimatedFeatureCard delay={200}>
                  <div className="group p-8 h-full rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-sky-900 hover:bg-white dark:hover:bg-gray-800/80 transition-all duration-300 transform hover:-translate-y-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-purple-100 dark:from-sky-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center text-sky-500 dark:text-sky-400 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                          <ChatBubbleIcon />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Real-time Chat</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                          Communicate with members, create group chats for projects, and get help from the AI Tutor.
                      </p>
                  </div>
                </AnimatedFeatureCard>
            </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 py-6 text-center border-t border-gray-200 dark:border-gray-700 relative z-10">
        <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} ICT Club Hub. Designed & Developed by JOEL.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-1.5">
            Made with 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500 animate-pulse-heart" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg> 
            and code.
        </p>
      </footer>
    </div>
  );
};

export default Welcome;
