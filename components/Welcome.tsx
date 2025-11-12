import React from 'react';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface WelcomeProps {
  onNavigateToLogin: () => void;
  onNavigateToPatronLogin: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToPatronLogin }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Hero Section */}
      <header className="h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 z-0 opacity-50 dark:opacity-30">
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

        <div className="text-center z-10 p-4">
          <style>
            {`
              @keyframes fade-in-down {
                  0% { opacity: 0; transform: translateY(-20px); }
                  100% { opacity: 1; transform: translateY(0); }
              }
              @keyframes fade-in-up {
                  0% { opacity: 0; transform: translateY(20px); }
                  100% { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-down { animation: fade-in-down 1s ease-out forwards; opacity: 0; }
              .animate-fade-in-up { animation: fade-in-up 1s ease-out forwards; opacity: 0; }
            `}
          </style>
          <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 animate-fade-in-down">
            Welcome to Club Hub
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            Your central place for activities, attendance, and collaboration. Streamline your club's operations and boost engagement.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="mt-10 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500/50 dark:focus:ring-purple-500/50 animate-fade-in-up"
            style={{ animationDelay: '1s' }}
          >
            Enter the Hub
          </button>
          <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
              <button
                onClick={onNavigateToPatronLogin}
                className="font-medium text-gray-600 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
              >
                Are you a Patron? Login here
              </button>
          </div>
        </div>
      </header>
      
      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Why Club Hub?</h2>
            <p className="mb-12 text-lg text-gray-600 dark:text-gray-400">Everything your ICT club needs, all in one place.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="p-8 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 text-pink-500 dark:text-pink-400">
                        <CalendarIcon />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Track Activities</h3>
                    <p className="text-gray-600 dark:text-gray-400">Stay up-to-date with all club events, workshops, and meetings. Never miss an opportunity to learn and connect.</p>
                </div>
                {/* Feature 2 */}
                <div className="p-8 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 text-purple-500 dark:text-purple-400">
                        <ClipboardListIcon />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Collaborate on Projects</h3>
                    <p className="text-gray-600 dark:text-gray-400">Organize and manage club projects with our interactive Kanban board. Assign tasks and track progress together.</p>
                </div>
                {/* Feature 3 */}
                <div className="p-8 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 text-pink-500 dark:text-pink-400">
                        <ChatBubbleIcon />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Stay Connected</h3>
                    <p className="text-gray-600 dark:text-gray-400">Engage with fellow members through the activity feed and get instant answers from our club AI assistant.</p>
                </div>
            </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Ready to Join?</h2>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">Become a part of our growing community of tech enthusiasts.</p>
            <button
                onClick={onNavigateToLogin}
                className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500/50 dark:focus:ring-purple-500/50"
            >
                Get Started Now
            </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ICT Club Naggalama. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Welcome;
