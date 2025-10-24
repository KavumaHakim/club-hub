import React, { useState, useEffect, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatus } from '../types';
import * as api from '../services/apiService';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';


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
                    <input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" required />
                </div>
                 <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                    <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" required />
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


const Profile: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
    
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">My Profile</h2>
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-8">
                    <div className="flex-shrink-0">
                        <img
                            src={`https://i.pravatar.cc/128?u=${currentUser.username}`}
                            alt={currentUser.name}
                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full ring-4 ring-pink-500/50"
                        />
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
            </div>
        </div>
    );
};

export default Profile;