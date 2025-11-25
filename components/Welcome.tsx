

import React, { useRef, useEffect } from 'react';
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

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToPatronLogin }) => {
  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden p-6">
        {/* Animated background shapes */}
        <div className="absolute inset-0 z-0 opacity-50 dark:opacity-20 pointer-events-none">
          <style>
            {`
              @keyframes float {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; border-radius: 20%; }
                50% { opacity: 0.5; border-radius: 50%; }
                100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; border-radius: 20%; }
              }
              .shape {
                position: absolute;
                display: block;
                list-style: none;
                background: linear-gradient(to right, #EC4899, #8B5CF6);
                animation: float 25s linear infinite;
                bottom: -150px;
              }
              .shape:nth-child(1) { left: 25%; width: 80px; height: 80px; animation-delay: 0s; }
              .shape:nth-child(2) { left: 10%; width: 20px; height: 20px; animation-delay: 2s; animation-duration: 12s; }
              .shape:nth-child(3) { left: 70%; width: 20px; height: 20px; animation-delay: 4s; }
              .shape:nth-child(4) { left: 40%; width: 60px; height: 60px; animation-delay: 0s; animation-duration: 18s; }
              .shape:nth-child(5) { left: 65%; width: 20px; height: 20px; animation-delay: 0s; }
              .shape:nth-child(6) { left: 75%; width: 110px; height: 110px; animation-delay: 3s; }
              .shape:nth-child(7) { left: 35%; width: 150px; height: 150px; animation-delay: 7s; }
              .shape:nth-child(8) { left: 50%; width: 25px; height: 25px; animation-delay: 15s; animation-duration: 45s; }
              .shape:nth-child(9) { left: 20%; width: 15px; height: 15px; animation-delay: 2s; animation-duration: 35s; }
              .shape:nth-child(10) { left: 85%; width: 150px; height: 150px; animation-delay: 0s; animation-duration: 11s; }
            `}
          </style>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
          <span className="shape"></span>
        </div>

        <div className="text-center z-10 p-4 max-w-4xl mx-auto flex flex-col items-center">
          <style>
            {`
              @keyframes fade-in-up {
                  0% { opacity: 0; transform: translateY(20px); }
                  100% { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up { animation: fade-in-up 1s ease-out forwards; opacity: 0; }

              @keyframes letter-reveal {
                0% {
                  opacity: 0;
                  transform: translateY(20px) scale(0.8) rotateX(-40deg);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1) rotateX(0);
                }
              }
              .animate-letter-reveal {
                display: inline-block;
                transform-origin: bottom;
                opacity: 0;
                animation: letter-reveal 0.6s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
              }
            `}
          </style>
          
          {/* Logo or Icon could go here */}
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 drop-shadow-sm pb-2">
            {'ICT Club Hub'.split('').map((char, index) => (
              <span key={index} className="animate-letter-reveal" style={{ animationDelay: `${index * 50}ms` }}>
                  {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>
          
          <p className="mt-6 text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.6s' }}>
            Empowering students to connect, code, and create. <br className="hidden md:block"/> Your central hub for all club activities.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 w-full justify-center animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto px-10 py-4 text-lg font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500/50 dark:focus:ring-purple-500/50"
              >
                Enter the Hub
              </button>
              
              <button
                onClick={onNavigateToPatronLogin}
                className="w-full sm:w-auto px-10 py-4 text-lg font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300"
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
      <section className="py-24 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Why ICT Club Hub?</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full"></div>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">We've built a comprehensive platform to streamline your club experience and foster collaboration.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Feature 1 */}
                <AnimatedFeatureCard delay={0}>
                  <div className="group p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-14 h-14 mb-6 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform duration-300">
                          <CalendarIcon />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Track Activities</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Stay up-to-date with all club events, workshops, and meetings. View them in a list or calendar format and never miss an opportunity.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 2 */}
                <AnimatedFeatureCard delay={100}>
                  <div className="group p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-14 h-14 mb-6 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                          <ClipboardListIcon />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Project Management</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Organize and manage club projects with our interactive Kanban board. Assign tasks, track progress, and collaborate effectively.
                      </p>
                  </div>
                </AnimatedFeatureCard>
                
                {/* Feature 3 */}
                <AnimatedFeatureCard delay={200}>
                  <div className="group p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-14 h-14 mb-6 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                          <ChatBubbleIcon />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Real-time Chat</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Engage with fellow members through direct messages and group chats. Share ideas, ask questions, and build a community.
                      </p>
                  </div>
                </AnimatedFeatureCard>
            </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-6 text-center max-w-4xl">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white shadow-2xl overflow-hidden relative">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Join?</h2>
                    <p className="mb-10 text-xl text-gray-300 max-w-2xl mx-auto">
                        Become a part of our growing community of tech enthusiasts, makers, and future innovators.
                    </p>
                    <button
                        onClick={onNavigateToLogin}
                        className="px-10 py-4 text-lg font-bold text-gray-900 bg-white rounded-xl shadow-lg hover:bg-gray-50 transform hover:scale-105 transition-all duration-300"
                    >
                        Get Started Now
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-100 dark:bg-gray-950 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-6 flex flex-col items-center">
            <p className="mb-2">&copy; {new Date().getFullYear()} ICT Club Naggalama. All rights reserved.</p>
            <p className="text-xs text-gray-400">Built with <span className="text-pink-500">♥</span> for the love of tech.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;