import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, AttendanceRecord, AttendanceStatus } from '../types';
import * as api from '../services/apiService';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { CameraIcon } from './icons/CameraIcon';
import { BadgeCheckIcon } from './icons/BadgeCheckIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { predefinedAvatars } from '../constants';
import { useData } from '../DataContext';
import { CursorVariant } from './CustomCursor';
import { FormattedMessage } from './FormattedMessage';

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


const StatCard: React.FC<{icon: React.ReactElement<{className?: string}>, label: string, value: number, percentage: string, color: string}> = ({ icon, label, value, percentage, color }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-visible');
                observer.unobserve(element);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="scroll-animate bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${color}`}>
                {React.cloneElement(icon, { className: 'h-6 w-6' })}
            </div>
            <p className="text-3xl font-bold mt-2 text-gray-800 dark:text-gray-200">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">{percentage}%</p>
        </div>
    );
};

const ChangePasswordForm: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-visible');
                observer.unobserve(element);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

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
        <div ref={ref} className="scroll-animate mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
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
    const [selectedCursor, setSelectedCursor] = useState<CursorVariant>('normal');
    const [selectedFont, setSelectedFont] = useState('Inter, sans-serif');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-visible');
                observer.unobserve(element);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const savedCursor = localStorage.getItem('app_cursor') as CursorVariant;
        if (savedCursor) setSelectedCursor(savedCursor);

        const savedFont = localStorage.getItem('app_font');
        if (savedFont) setSelectedFont(savedFont);
    }, []);

    const handleCursorSelect = (variant: CursorVariant) => {
        setSelectedCursor(variant);
        localStorage.setItem('app_cursor', variant);
        // Dispatch event so CustomCursor updates immediately
        window.dispatchEvent(new CustomEvent('cursor-change', { detail: variant }));
    };

    const handleFontSelect = (font: string) => {
        setSelectedFont(font);
        localStorage.setItem('app_font', font);
        window.dispatchEvent(new CustomEvent('font-change', { detail: font }));
    };

    const cursors: { id: CursorVariant, name: string, preview: React.ReactNode }[] = [
        {
            id: 'normal',
            name: 'System Default',
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center text-gray-900 dark:text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    </svg>
                </div>
            )
        },
        { 
            id: 'figma', 
            name: 'Figma Style', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.1943L11.7841 12.3673H5.65376Z" fill="black" stroke="white" strokeWidth="1"/>
                    </svg>
                </div>
            )
        },
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
            id: 'halo', 
            name: 'Halo', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_6px_rgba(253,224,71,0.9)]"></div>
                    <div className="absolute w-10 h-10 border-2 border-yellow-300/70 rounded-full"></div>
                </div>
            )
        },
        { 
            id: 'orbit', 
            name: 'Orbit', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full"></div>
                    <div className="absolute w-10 h-10 border border-cyan-400/50 rounded-full animate-spin-slow"></div>
                </div>
            )
        },
        { 
            id: 'comet', 
            name: 'Comet', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)]"></div>
                    <div className="absolute left-1/2 w-8 h-1 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-cyan-300/70 to-white/80"></div>
                </div>
            )
        },
        { 
            id: 'neon', 
            name: 'Neon', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-lime-300 rounded-sm shadow-[0_0_8px_rgba(190,242,100,0.9)]"></div>
                    <div className="absolute w-9 h-9 border-2 border-lime-300/70 rounded-lg"></div>
                </div>
            )
        },
        { 
            id: 'scanner', 
            name: 'Scanner', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                    <div className="absolute w-9 h-9 border border-emerald-400/60 rounded-md"></div>
                </div>
            )
        },
        { 
            id: 'glitch', 
            name: 'Glitch', 
            preview: (
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-pink-500"></div>
                    <div className="absolute w-8 h-8 border border-cyan-400/60 translate-x-0.5 -translate-y-0.5"></div>
                </div>
            )
        },
    ];

    const fontOptions = [
        { name: 'Modern (Default)', value: 'Inter, sans-serif' },
        { name: 'Professional', value: '"Lora", serif' },
        { name: 'Coding', value: '"Roboto Mono", monospace' },
        { name: 'Playful', value: '"Comic Neue", cursive' },
    ];

    return (
        <div ref={ref} className="scroll-animate mt-6 space-y-10">
            {/* Cursor Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Cursor Customization</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Personalize your experience by choosing a custom cursor style. 
                    (Only visible on desktop devices)
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {/* Typography Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Typography</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Choose a font style that suits your reading preference.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {fontOptions.map((font) => (
                        <button
                            key={font.value}
                            onClick={() => handleFontSelect(font.value)}
                            className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 group
                            ${selectedFont === font.value 
                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/10' 
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-pink-300 dark:hover:border-pink-700'}`}
                        >
                            <div className="mb-3 text-2xl" style={{ fontFamily: font.value }}>
                                Aa
                            </div>
                            <span className={`font-medium text-sm ${selectedFont === font.value ? 'text-pink-700 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {font.name}
                            </span>
                            {selectedFont === font.value && (
                                <div className="absolute top-3 right-3 text-pink-500">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


const Profile: React.FC<{ currentUser: User, onUpdateUserProfile: (user: User) => void }> = ({ currentUser, onUpdateUserProfile }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [bio, setBio] = useState(currentUser.bio || '');
    const [isSavingBio, setIsSavingBio] = useState(false);
    const [bioStatus, setBioStatus] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'appearance'>('details');
    const { fetchUsers, fetchFeedItems, fetchProjectData, showcaseItems } = useData();
    const badgesRef = useRef<HTMLDivElement>(null);
    const summaryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const elements = [badgesRef.current, summaryRef.current].filter(Boolean);
        if (elements.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        elements.forEach(el => el && observer.observe(el));
        return () => observer.disconnect();
    }, [activeTab]);

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

    useEffect(() => {
        setBio(currentUser.bio || '');
    }, [currentUser.bio]);

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

    const portfolioItems = useMemo(() => {
        return showcaseItems
            .filter(item => item.userUid === currentUser.uid)
            .slice(0, 4);
    }, [showcaseItems, currentUser.uid]);

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

    const handleSaveBio = async () => {
        if (isSavingBio) return;
        setIsSavingBio(true);
        setBioStatus(null);
        try {
            const cleaned = bio.trim();
            await api.updateUser(currentUser.uid, { bio: cleaned });
            const updatedUser = { ...currentUser, bio: cleaned };
            onUpdateUserProfile(updatedUser);
            await fetchUsers();
            setBioStatus('Saved!');
        } catch (error: any) {
            console.error("Failed to update bio:", error);
            setBioStatus(error?.message || 'Failed to save bio.');
        } finally {
            setIsSavingBio(false);
            setTimeout(() => setBioStatus(null), 2500);
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
                                    <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                                        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${currentUser.role === 'PATRON' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                            {currentUser.role}
                                        </span>
                                        {currentUser.skillLevel && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                <AcademicCapIcon className="w-4 h-4" /> {currentUser.skillLevel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">About Me</h3>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={3}
                                    maxLength={240}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Write a short bio or about phrase for your portfolio..."
                                />
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3">
                                        {bio.trim() ? (
                                            <FormattedMessage text={bio} isUser={false} />
                                        ) : (
                                            <p className="text-xs text-gray-400">Your bio will appear here.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{bio.length}/240</span>
                                    <div className="flex items-center gap-3">
                                        {bioStatus && (
                                            <span className={`text-xs ${bioStatus === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>
                                                {bioStatus}
                                            </span>
                                        )}
                                        <button
                                            onClick={handleSaveBio}
                                            disabled={isSavingBio}
                                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSavingBio ? 'Saving...' : 'Save Bio'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Badges Section */}
                            <div ref={badgesRef} className="scroll-animate mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <BadgeCheckIcon className="h-6 w-6 text-yellow-500" />
                                    Badges & Achievements
                                </h3>
                                {!currentUser.badges || currentUser.badges.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No badges yet. Participate in challenges to earn them!</p>
                                ) : (
                                    <div className="flex flex-wrap gap-3">
                                        {currentUser.badges.map((badge, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm font-medium text-yellow-800 dark:text-yellow-200 shadow-sm">
                                                <div className="p-1 bg-yellow-200 dark:bg-yellow-800 rounded-full">
                                                    <BadgeCheckIcon className="w-4 h-4 text-yellow-700 dark:text-yellow-100" />
                                                </div>
                                                {badge}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Portfolio Section */}
                            <div className="scroll-animate mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Portfolio Highlights</h3>
                                {portfolioItems.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No showcases yet. Share your work to build your portfolio.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {portfolioItems.map(item => (
                                            <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                                                <p className="text-[11px] text-gray-400 mt-2">Shared {item.createdAt}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div ref={summaryRef} className="scroll-animate mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
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
