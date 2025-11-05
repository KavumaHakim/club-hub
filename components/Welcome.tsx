import React from 'react';

interface WelcomeProps {
  onNavigateToLogin: () => void;
  onNavigateToPatronLogin: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigateToLogin, onNavigateToPatronLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
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
    </div>
  );
};

export default Welcome;
