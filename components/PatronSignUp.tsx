
import React, { useState } from 'react';
import { User } from '../types';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { UserIcon } from './icons/UserIcon';
import { MailIcon } from './icons/MailIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import PendingApprovalModal from './PendingApprovalModal';

interface PatronSignUpProps {
  onSignUp: (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & { password: string }) => Promise<void>;
  onNavigateToLogin: () => void;
}

const PatronSignUp: React.FC<PatronSignUpProps> = ({ onSignUp, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!name || !username || !email || !password) {
        setError("All fields are required.");
        return;
    }
    
    setIsLoading(true);
    try {
        await onSignUp({ name, username, email, password, phoneNumber });
        setMessage('Registration successful! Your account is pending approval.');
        setIsSignedUp(true);
        setShowPendingModal(true);
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setPhoneNumber('');
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
      setShowPendingModal(false);
      onNavigateToLogin();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated Background Blobs (Purple Theme) */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob dark:opacity-20 dark:mix-blend-normal dark:bg-purple-900"></div>
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 dark:opacity-20 dark:mix-blend-normal dark:bg-indigo-900"></div>

      <div className="relative w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-purple-100 dark:border-purple-900/30 p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 tracking-tight">
            Patron Registration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Create an account to manage the club.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-1">
            <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon />
                </div>
                <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Dr. Jane Smith"
                disabled={isLoading || isSignedUp}
                />
            </div>
          </div>
          
          <div className="space-y-1">
            <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <span className="text-lg font-bold">@</span>
                </div>
                <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="jane.smith"
                disabled={isLoading || isSignedUp}
                />
            </div>
          </div>
          
           <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <MailIcon />
                </div>
                <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="jane@school.edu"
                disabled={isLoading || isSignedUp}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="phone-number" className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone (Optional)</label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <PhoneIcon />
                </div>
                <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="+1 234 567 890"
                disabled={isLoading || isSignedUp}
                autoComplete="tel"
                />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <LockClosedIcon />
                </div>
              <input
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading || isSignedUp}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {message && <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-sm text-center font-medium">{message}</div>}
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center font-medium">{error}</div>}

          {!isSignedUp && (
             <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all active:scale-[0.98] dark:focus:ring-offset-gray-800 mt-2"
                >
                {isLoading ? 'Registering...' : 'Sign Up as Patron'}
            </button>
          )}
        </form>
        <div className="text-center pt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
            Already a patron?{' '}
            <button onClick={onNavigateToLogin} className="font-bold text-purple-600 hover:text-purple-500 transition-colors">
                Log in
            </button>
            </p>
        </div>
      </div>
      <PendingApprovalModal isOpen={showPendingModal} onClose={handleCloseModal} />
    </div>
  );
};

export default PatronSignUp;
