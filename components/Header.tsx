import React, { useState } from 'react';
import { User } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, theme, onToggleTheme }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
              ICT Club Hub
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 dark:text-gray-300">
              Welcome, <span className="font-medium">{user.name}</span>
            </span>
             <button
              onClick={onToggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-500 transition-colors focus:outline-none"
              aria-label="Logout"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;