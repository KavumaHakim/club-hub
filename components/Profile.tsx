
import React, { useState, useEffect, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatus } from '../types';
import * as api from '../services/apiService';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { CameraIcon } from './icons/CameraIcon';
import { predefinedAvatars } from '../constants';
import { useData } from '../DataContext';
import { CursorVariant } from './CustomCursor';


const AvatarSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Choose Your Avatar</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 max-h-[60vh] overflow-y-auto p-2">
          {predefinedAvatars.map((url, index) => (
            <button
              key={index}
              onClick={() => onSelect(url)}
              className="rounded-full aspect-square p-1 ring-2 ring-transparent hover:ring-pink-500 focus:ring-pink-500 focus:outline-none transition-all"
              aria-label={`Select avatar ${index + 1}`}
            >
              <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full rounded-full object-cover bg-gray-200 dark:bg-gray-700" />
            </button>
          ))}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


const StatCard: React.FC<{icon: React.ReactElement<{className?: string}>, label: string, value: number, percentage: string, color: string}> = ({ icon, label, value, percentage, color }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${color}`}>
            {React.cloneElement(icon, { className: 'h-6 w-6' })}
        </div>
        <p className="text-3xl font-bold mt-2 text-gray-800 dark:text-gray-200">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">{percentage}%</p>
    </div>
);

const ChangePasswordForm: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.changePassword(newPassword);
            setSuccess('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Change Password</h3>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                 <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                    <div className="relative mt-1">
                        <input type={isNewPasswordVisible ? 'text' : 'password'} id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="block w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" required />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                            aria-label={isNewPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                            {isNewPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>
                 <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                    <div className="relative mt-1">
                        <input type={isConfirmPasswordVisible ? 'text' : 'password'} id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" required />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                            aria-label={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                            {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>
                
                {error && <p className="text-sm text-red-500 text-center md:text-left">{error}</p>}
                {success && <p className="text-sm text-green-600 text-center md:text-left">{success}</p>}

                <div className="pt-2 text-right">
                    <button type="submit" disabled={isSubmitting} className="inline-flex items-center space-x-2 px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 dark:focus:ring-offset-gray-800">
                       <LockClosedIcon />
                        <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

const AppearanceSettings: React.FC = () => {
    const [selectedCursor, setSelectedCursor] = useState<CursorVariant>('default');

    useEffect(() => {
        const saved = localStorage.getItem('app_cursor') as CursorVariant;
        if (saved) setSelectedCursor(saved);
    }, []);

    const handleCursorSelect = (variant: CursorVariant) => {
        setSelectedCursor(variant);
        localStorage.setItem('app_cursor', variant);
        // Dispatch event so CustomCursor updates immediately
        window.dispatchEvent(new CustomEvent('cursor-change', { detail: variant }));
    };

    const cursors: { id: CursorVariant, name: string, preview: React.ReactNode }[] = [
        { 
            id: 'default', 
            name: 'Modern Gradient', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-sm z-10"></div>
                    <div className="absolute w-8 h-8 border-2 border-gray-400/60 rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'bubble', 
            name: 'Soap Bubble', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full z-10"></div>
                    <div className="absolute w-10 h-10 bg-cyan-400/20 border-2 border-cyan-400/50 rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'crosshair', 
            name: 'Precision', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute w-6 h-0.5 bg-red-500"></div>
                    <div className="absolute h-6 w-0.5 bg-red-500"></div>
                    <div className="absolute w-8 h-8 border border-red-500/50"></div>
                </div>
            )
        },
        { 
            id: 'magic', 
            name: 'Magic', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full z-10 shadow-[0_0_5px_purple]"></div>
                    <div className="absolute w-8 h-8 border-2 border-yellow-400 rounded-full rotate-45"></div>
                </div>
            )
        },
        { 
            id: 'minimal', 
            name: 'Minimal', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <div className="w-3 h-3 bg-gray-900 dark:bg-white rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'pixel', 
            name: '8-Bit Pixel', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-800 dark:bg-white z-10"></div>
                    <div className="absolute w-8 h-8 border-2 border-dashed border-gray-500"></div>
                </div>
            )
        },
        { 
            id: 'eclipse', 
            name: 'Eclipse', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg">
                    <div className="w-4 h-4 bg-black rounded-full z-10 border border-white/20"></div>
                    <div className="absolute w-8 h-8 bg-white/30 blur-md rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'sonar', 
            name: 'Sonar', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center bg-black rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full z-10"></div>
                    <div className="absolute w-8 h-8 border border-green-500/50 rounded-full"></div>
                    <div className="absolute w-6 h-6 border border-green-500/30 rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'retro', 
            name: 'Retro Terminal', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-4 h-4 bg-green-500 z-10"></div>
                    <div className="absolute w-10 h-10 border-2 border-green-500/50"></div>
                </div>
            )
        },
        { 
            id: 'glow', 
            name: 'Cyber Glow', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-400 rounded-full blur-[1px] z-10"></div>
                    <div className="absolute w-10 h-10 bg-blue-500/30 blur-md rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'heart', 
            name: 'Lovely', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-pink-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <div className="absolute w-10 h-10 border border-pink-300 rounded-full"></div>
                </div>
            )
        },
        {
            id: 'star',
            name: 'Star Power',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                </div>
            )
        },
        {
            id: 'ring',
            name: 'Orbit Ring',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full z-10"></div>
                    <div className="absolute w-8 h-8 border-2 border-orange-500 rounded-full"></div>
                </div>
            )
        },
        {
            id: 'ghost',
            name: 'Spooky Ghost',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7v11l3.5-3.5L12 20l3.5-3.5L19 20V9a7 7 0 00-7-7z"/></svg>
                </div>
            )
        },
        {
            id: 'fire',
            name: 'Fire',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-orange-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                </div>
            )
        },
        {
            id: 'ice',
            name: 'Ice Shard',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-cyan-300">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
                </div>
            )
        },
        {
            id: 'music',
            name: 'Music Note',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-purple-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
            )
        },
        {
            id: 'diamond',
            name: 'Diamond',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-blue-300">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l-9.86 6L12 22l9.86-14L12 2z"/></svg>
                </div>
            )
        },
        {
            id: 'ufo',
            name: 'UFO',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-green-500">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 10c0-3.87-3.13-7-7-7S5 6.13 5 10c0 .34.03.67.08 1H3v2h18v-2h-2.08c.05-.33.08-.66.08-1z"/></svg>
                </div>
            )
        },
        {
            id: 'target',
            name: 'Target',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-1 h-1 bg-red-600 rounded-full z-10"></div>
                    <div className="absolute w-6 h-6 border border-red-600 rounded-full"></div>
                    <div className="absolute w-10 h-10 border border-red-600/50 rounded-full"></div>
                </div>
            )
        },
        {
            id: 'pencil',
            name: 'Pencil',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-600 -rotate-12">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>
                </div>
            )
        },
        {
            id: 'paw',
            name: 'Paw Print',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-amber-700">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm7 3.2c-1.23 0-2.4.2-3.5.55C14.77 10 13.92 10.2 13 10.2c-.92 0-1.77-.2-2.5-.45-1.1-.35-2.27-.55-3.5-.55C3.27 9.2 0 12.2 0 16.2 0 20.5 4.16 24 9 24s9-3.5 9-7.8c0-4-3.27-7-7-7z"/></svg>
                </div>
            )
        },
        {
            id: 'leaf',
            name: 'Leaf',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-green-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>
                </div>
            )
        },
        {
            id: 'rocket',
            name: 'Rocket',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-indigo-500 -rotate-45">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 11L12 15.5L22 5.5L7.5 11ZM2.81 14.12L5.3 15.36L2.26 18.4C1.91 18.75 1.91 19.32 2.26 19.67L4.33 21.74C4.68 22.09 5.25 22.09 5.6 21.74L8.64 18.7L9.88 21.19L7.5 22.5L6.66 20.58L3.42 17.34L1.5 16.5L2.81 14.12Z"/></svg>
                </div>
            )
        },
        {
            id: 'smile',
            name: 'Smile',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                </div>
            )
        },
        {
            id: 'binary',
            name: 'Binary',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center font-mono text-xs font-bold text-green-500">
                    101
                </div>
            )
        },
        {
            id: 'electric',
            name: 'Electric',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-300">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                </div>
            )
        },
        {
            id: 'brush',
            name: 'Paint Brush',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-pink-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/></svg>
                </div>
            )
        },
        {
            id: 'anchor',
            name: 'Anchor',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-blue-700">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17 13a5 5 0 01-10 0h2a3 3 0 006 0h2m-5-6V5h2V3h-4v2h2v2c2.76 0 5 2.24 5 5h2v2h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6H5v-2h2a5 5 0 015-5z"/></svg>
                </div>
            )
        },
        {
            id: 'flower',
            name: 'Flower',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-pink-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25a2.5 2.5 0 003.92 2.06l.02-.01a2.5 2.5 0 00-1.42-4.53c-.51 0-1.02.15-1.46.44-.44.29-.78.71-.96 1.2l-.1.84zm8.53-3.93a2.5 2.5 0 001.94-4.21 2.5 2.5 0 00-3.88 2.11c0 .78.36 1.51.99 1.98.28.21.6.32.95.12z"/></svg>
                </div>
            )
        },
        {
            id: 'puzzle',
            name: 'Puzzle',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-teal-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>
                </div>
            )
        },
        {
            id: 'pizza',
            name: 'Pizza',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.78 3.55 15.57 2 12 2zm-1 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2.5 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-4 1c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2.5 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                </div>
            )
        },
        {
            id: 'alien',
            name: 'Alien',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-green-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a9 9 0 00-9 9c0 4.17 2.84 7.67 6.69 8.69L12 22l2.31-2.31C18.16 18.67 21 15.17 21 11a9 9 0 00-9-9zm-4 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                </div>
            )
        },
        {
            id: 'basketball',
            name: 'Hoops',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-orange-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
            )
        },
        {
            id: 'sword',
            name: 'Blade',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-400 rotate-45">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3l-5 5-1-1-2 2 1 1-5 5-4 7 7-4 5-5 1 1 2-2-1-1 5-5z"/></svg>
                </div>
            )
        },
        {
            id: 'wand',
            name: 'Wand',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-indigo-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7l2.5-1.4zM14.3 10L16.8 14.2 19.3 10 23.5 12.5 19.3 15 21.8 19.2 17.6 16.7 13.4 19.2 15.9 15 11.7 12.5 15.9 10H14.3z"/></svg>
                </div>
            )
        },
        {
            id: 'spider',
            name: 'Spider',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-800 dark:text-gray-200">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a2 2 0 10-.001-4.001A2 2 0 0012 7zm0 2a3 3 0 100 6 3 3 0 000-6zm-4 2H4v-2h4v2zm8 0h4v-2h-4v2zm-8 4H4v2h4v-2zm8 0h4v2h-4v-2z"/></svg>
                </div>
            )
        },
        {
            id: 'clock',
            name: 'Time',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-blue-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
                </div>
            )
        },
        {
            id: 'compass',
            name: 'Compass',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-red-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8-8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>
                </div>
            )
        },
        {
            id: 'film',
            name: 'Cinema',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
                </div>
            )
        },
        {
            id: 'gear',
            name: 'Tech',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.68 8.87a.484.484 0 00.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.48.48 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                </div>
            )
        },
        {
            id: 'magnet',
            name: 'Magnet',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-red-600">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 3H18v6c0 3.31-2.69 6-6 6s-6-2.69-6-6V3H3.5v6c0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5V3zm-5 0h-2v6c0 .55-.45 1-1 1s-1-.45-1-1V3h-2v6c0 1.66 1.34 3 3 3s3-1.34 3-3V3z"/></svg>
                </div>
            )
        },
        {
            id: 'map',
            name: 'Explorer',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-red-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
            )
        },
        {
            id: 'medal',
            name: 'Winner',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm-4.4-8.78l3.17 5.51.34-.2a6.976 6.976 0 01-1.1-2.22l-2.41-3.09zM11 2l-4 6.93c.61.15 1.19.38 1.72.68L12 4.07l3.28 5.54c.53-.3 1.11-.53 1.72-.68L13 2h-2zM5.38 4.12L7.79 8.3c-.38.55-.69 1.15-.9 1.8L3.5 4.12h1.88zm13.24 0h1.88l-3.38 5.97c-.21-.64-.52-1.24-.9-1.8l2.4-4.17z"/></svg>
                </div>
            )
        },
        {
            id: 'mic',
            name: 'Voice',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-800 dark:text-gray-200">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
            )
        },
        {
            id: 'palette',
            name: 'Artist',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-pink-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                </div>
            )
        },
        {
            id: 'sun',
            name: 'Sunny',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-yellow-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.93l1.41 1.41c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.4 3.52c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41zm11.31 11.31l1.41 1.41c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41zm-1.41-9.9l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0zM7.4 19.07l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0z"/></svg>
                </div>
            )
        },
        {
            id: 'moon',
            name: 'Moonlight',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-indigo-300">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
                </div>
            )
        },
        {
            id: 'umbrella',
            name: 'Rain',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-blue-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.85 15.79 17 12 17s-7.17-2.15-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7.58 4 .13 7.58.13 12c0 .34.04.67.11 1H2v6c0 1.1.9 2 2 2s2-.9 2-2v-6h12v6c0 1.1.9 2 2 2s2-.9 2-2v-6h1.76c.07-.33.11-.66.11-1 0-4.42-7.45-8-11.87-8z"/></svg>
                </div>
            )
        },
        {
            id: 'bomb',
            name: 'Kaboom',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 2h1.5v2.25h-1.5zM8.88 3.94l1.06-1.06 1.59 1.59-1.06 1.06zM16.53 3.94l-1.06-1.06-1.59 1.59 1.06 1.06zM12 7a8 8 0 100 16 8 8 0 000-16zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
                </div>
            )
        },
        {
            id: 'robot',
            name: 'Droid',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M15 8c0-1.42-.5-2.73-1.33-3.76.42-.02.85.12 1.17.44l.41.41.71-.71-.41-.41C14.71 3.13 13.53 2.71 12.38 3c-1.27-.32-2.61.07-3.51.97l-.41.41.71.71.41-.41c.32-.32.75-.46 1.17-.44C9.9 5.27 9.4 6.58 9.4 8c-1.53.71-2.4 2.37-2.4 4 0 2.21 1.79 4 4 4h2c2.21 0 4-1.79 4-4 0-1.63-.87-3.29-2.4-4zM9 11c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm6 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z"/></svg>
                </div>
            )
        },
        {
            id: 'skull',
            name: 'Grim',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.04.78 3.9 2.07 5.32C6.63 16.38 7 17.62 7 19v1h10v-1c0-1.38.37-2.62.93-3.68C19.22 13.9 20 12.04 20 10c0-4.42-3.58-8-8-8zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4.29-3.29l-1.41 1.41c-.63-.63-1.66-.63-2.29 0-.63.63-1.66.63-2.29 0L8.9 11.71c1.41-1.41 3.69-1.41 5.1 0 1.41 1.41 3.69 1.41 5.1 0 1.41 1.41 3.69 1.41 5.1 0 1.41-1.41-2.29-1.41z"/></svg>
                </div>
            )
        },
        {
            id: 'potion',
            name: 'Elixir',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-purple-500">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 16v-2h-2v-1h2v-2h-2V9h2V7h-2V5h2V3H7v2h2v2H7v2h2v2H7v1h2v2H7v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3h2zM12 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-1 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                </div>
            )
        }
    ];

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Cursor Customization</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Personalize your experience by choosing a custom cursor style. 
                (Only visible on desktop devices)
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cursors.map((cursor) => (
                    <button
                        key={cursor.id}
                        onClick={() => handleCursorSelect(cursor.id)}
                        className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 group
                        ${selectedCursor === cursor.id 
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/10' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-pink-300 dark:hover:border-pink-700'}`}
                    >
                        <div className="mb-4 transform group-hover:scale-110 transition-transform duration-200">
                            {cursor.preview}
                        </div>
                        <span className={`font-medium text-sm ${selectedCursor === cursor.id ? 'text-pink-700 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {cursor.name}
                        </span>
                        {selectedCursor === cursor.id && (
                            <div className="absolute top-3 right-3 text-pink-500">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};


const Profile: React.FC<{ currentUser: User, onUpdateUserProfile: (user: User) => void }> = ({ currentUser, onUpdateUserProfile }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'appearance'>('details');
    const { fetchUsers, fetchFeedItems, fetchProjectData } = useData();

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const records = await api.getAttendance(currentUser.uid);
                setAttendance(records);
            } catch (error) {
                console.error("Failed to fetch attendance data for profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAttendance();
    }, [currentUser.uid]);

    const attendanceSummary = useMemo(() => {
        return attendance.reduce(
            (acc, record) => {
                acc[record.status] = (acc[record.status] || 0) + 1;
                return acc;
            },
            { Present: 0, Absent: 0, Excused: 0 } as { [key in AttendanceStatus]: number }
        );
    }, [attendance]);
    
    const totalActivities = attendance.length;

    const getPercentage = (count: number) => {
        if (totalActivities === 0) return '0.0';
        return ((count / totalActivities) * 100).toFixed(1);
    };

    const handleAvatarSelect = async (newAvatarUrl: string) => {
        setIsUpdatingAvatar(true);
        try {
            await api.updateUser(currentUser.uid, { avatarUrl: newAvatarUrl });
            const updatedUser = { ...currentUser, avatarUrl: newAvatarUrl };
            onUpdateUserProfile(updatedUser);
            
            // Refresh all data that depends on user info (Avatar)
            await Promise.all([
                fetchUsers(), 
                fetchFeedItems(),
                fetchProjectData()
            ]);
            
            setIsAvatarModalOpen(false);
        } catch (error: any) {
            console.error("Failed to update avatar:", error);
            alert(`Error updating avatar: ${error.message}`);
        } finally {
            setIsUpdatingAvatar(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">My Profile</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors focus:outline-none ${
                            activeTab === 'details'
                                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400 bg-gray-50 dark:bg-gray-800'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        My Details
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors focus:outline-none ${
                            activeTab === 'appearance'
                                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400 bg-gray-50 dark:bg-gray-800'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        Appearance
                    </button>
                </div>

                <div className="p-6 sm:p-8">
                    {activeTab === 'details' ? (
                        <>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-8">
                                <div className="relative flex-shrink-0 group">
                                    <button 
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full ring-4 ring-pink-500/50 focus:outline-none focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-pink-500 disabled:cursor-not-allowed"
                                        aria-label="Change profile picture"
                                        disabled={isUpdatingAvatar}
                                    >
                                        <img
                                            src={currentUser.avatarUrl || `https://i.pravatar.cc/128?u=${currentUser.username}`}
                                            alt={currentUser.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                                            {isUpdatingAvatar ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                            ) : (
                                                <CameraIcon />
                                            )}
                                        </div>
                                    </button>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{currentUser.name}</h1>
                                    <p className="text-md text-gray-500 dark:text-gray-400 mt-1">@{currentUser.username}</p>
                                    <span className={`mt-3 inline-block px-3 py-1 text-sm font-semibold rounded-full ${currentUser.role === 'PATRON' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                        {currentUser.role}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Attendance Summary</h3>
                                {isLoading ? (
                                    <p className="text-gray-500 dark:text-gray-400">Loading attendance data...</p>
                                ) : totalActivities > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                            <StatCard
                                                icon={<CheckCircleIcon />}
                                                label="Present"
                                                value={attendanceSummary.Present}
                                                percentage={getPercentage(attendanceSummary.Present)}
                                                color="text-pink-500"
                                            />
                                            <StatCard
                                                icon={<XCircleIcon />}
                                                label="Absent"
                                                value={attendanceSummary.Absent}
                                                percentage={getPercentage(attendanceSummary.Absent)}
                                                color="text-red-500"
                                            />
                                            <StatCard
                                                icon={<ExclamationCircleIcon />}
                                                label="Excused"
                                                value={attendanceSummary.Excused}
                                                percentage={getPercentage(attendanceSummary.Excused)}
                                                color="text-yellow-500"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No attendance records found.</p>
                                )}
                            </div>
                            <ChangePasswordForm currentUser={currentUser} />
                        </>
                    ) : (
                        <AppearanceSettings />
                    )}
                </div>
            </div>
            <AvatarSelectionModal 
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onSelect={handleAvatarSelect}
            />
        </div>
    );
};

export default Profile;
