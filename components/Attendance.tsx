import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import * as api from '../services/apiService';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { useData } from '../DataContext';
import ChartErrorBoundary from './ChartErrorBoundary';
import Tooltip from './Tooltip';

interface AttendanceProps {
  currentUser: User;
  isVisible: boolean;
}

const statusColors: { [key in AttendanceStatus]: string } = {
  'Present': 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
  'Absent': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  'Excused': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const chartColors = {
    'Present': '#EC4899', // Pink-500
    'Absent': '#EF4444', // Red-500
    'Excused': '#F59E0B', // Amber-500
};

const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  try {
    // Handle YYYY-MM-DD strings by appending time to prevent UTC shift issues
    // or use the string directly if it already has time
    const dateToParse = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    const date = new Date(dateToParse);
    
    if (isNaN(date.getTime())) return dateString;
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

const useScrollAnimation = (delay = 0) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        
        element.style.transitionDelay = `${delay}ms`;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    element.classList.add('is-visible');
                    observer.unobserve(element);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [delay]);

    return ref;
};

const Attendance: React.FC<AttendanceProps> = ({ currentUser, isVisible }) => {
  const { 
    attendance: attendanceRecords, 
    activities, 
    isLoadingAttendance, 
    isLoadingActivities, 
    attendanceError,
    activitiesError,
    fetchAttendance,
    fetchActivities,
    allUsers,
    isLoadingUsers
  } = useData();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('Present');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRenderChart, setShouldRenderChart] = useState(false);
  const [patronActivityId, setPatronActivityId] = useState<string>('');
  const [attendanceChecklist, setAttendanceChecklist] = useState<Record<string, boolean>>({});
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const memberUsers = useMemo(() => 
    allUsers.filter(user => user.role === 'MEMBER' && user.status === 'APPROVED'),
  [allUsers]);
  
  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return memberUsers;
    return memberUsers.filter(user => {
      const name = (user.name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      return name.includes(term) || username.includes(term);
    });
  }, [memberUsers, memberSearch]);

  const presentCount = useMemo(() => 
    memberUsers.reduce((count, user) => count + (attendanceChecklist[user.uid] ? 1 : 0), 0),
  [memberUsers, attendanceChecklist]);
  
  const absentCount = memberUsers.length - presentCount;

  // Animation Refs
  const formRef = useScrollAnimation();
  const logRef = useScrollAnimation(100);
  const summaryRef = useScrollAnimation(200);
  const trendRef = useScrollAnimation(100);

  useEffect(() => {
    if (isVisible) {
      // Delay rendering charts to allow container to get dimensions
      const timer = setTimeout(() => {
        setShouldRenderChart(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShouldRenderChart(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!patronActivityId) return;
    setAttendanceChecklist((prev) => {
      const next: Record<string, boolean> = {};
      memberUsers.forEach((user) => {
        next[user.uid] = prev[user.uid] ?? false;
      });
      return next;
    });
  }, [patronActivityId, memberUsers]);

  const unrecordedActivities = useMemo(() => 
    activities.filter(activity => 
      !attendanceRecords.some(record => record.activityId === activity.id)
    ), [activities, attendanceRecords]);

  const attendanceSummary = useMemo(() => attendanceRecords.reduce(
    (acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    },
    {} as { [key in AttendanceStatus]: number }
  ), [attendanceRecords]);

  const pieChartData = useMemo(() => Object.entries(attendanceSummary).map(([name, value]) => ({
    name: name as AttendanceStatus,
    value,
  })), [attendanceSummary]);

  const hasPieData = pieChartData.some((entry) => Number(entry.value) > 0);
  
  const lineChartData = useMemo(() => {
    const statusToValue = (status: AttendanceStatus): number => {
        if (status === 'Present') return 2;
        if (status === 'Excused') return 1;
        return 0; // Absent
    };
    // Sort by date ascending for the chart
    const sorted = [...attendanceRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map(rec => ({
        date: rec.date,
        name: rec.activityTitle,
        value: statusToValue(rec.status),
        status: rec.status,
    }));
  }, [attendanceRecords]);

  const yAxisTickFormatter = (value: number) => {
      if (value === 2) return 'Present';
      if (value === 1) return 'Excused';
      return 'Absent';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                  <p className="font-bold text-gray-800 dark:text-gray-200">{data.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{`Date: ${formatDate(data.date)}`}</p>
                  <p className="text-sm font-semibold" style={{ color: chartColors[data.status as AttendanceStatus] }}>{`Status: ${data.status}`}</p>
              </div>
          );
      }
      return null;
  };

  const handleRecordAttendance = async (newRecordData: Omit<AttendanceRecord, 'id' | 'userId'>) => {
    await api.addAttendance(currentUser.uid, newRecordData);
    await fetchAttendance(); // Refetch from context
  };

  const handleQuickAttendance = async () => {
    setIsQuickCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newActivity = await api.addActivity({
        title: today,
        date: today,
        description: 'Quick attendance session',
        location: 'ICT Club',
        category: 'OTHER'
      }, currentUser.uid);
      await fetchActivities();
      setPatronActivityId(newActivity.id);
    } catch (err: any) {
      console.error("Failed to create quick attendance activity:", err);
      alert(`Failed to create quick attendance: ${err.message || 'Unknown error'}`);
    } finally {
      setIsQuickCreating(false);
    }
  };

  const handleToggleChecklist = (userId: string) => {
    setAttendanceChecklist((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleBulkSubmit = async () => {
    if (!patronActivityId) {
      alert("Please select an activity.");
      return;
    }
    const activity = activities.find(a => a.id === patronActivityId);
    if (!activity) {
      alert("Selected activity not found.");
      return;
    }
    if (memberUsers.length === 0) {
      alert("No members available to mark attendance.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const records = memberUsers.map(user => ({
        userId: user.uid,
        activityId: activity.id,
        status: attendanceChecklist[user.uid] ? 'Present' : 'Absent'
      }));
      await api.addAttendanceBatch(records);
      alert("Attendance saved for all members.");
    } catch (err: any) {
      console.error("Failed to submit bulk attendance:", err);
      alert(`Failed to submit attendance: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleMarkAll = (isPresent: boolean) => {
    setAttendanceChecklist(() => {
      const next: Record<string, boolean> = {};
      memberUsers.forEach((user) => {
        next[user.uid] = isPresent;
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId) {
      alert("Please select an activity.");
      return;
    }
    const activity = activities.find(a => a.id === selectedActivityId);
    if (!activity) return;

    const newRecordData: Omit<AttendanceRecord, 'id' | 'userId'> = {
      activityId: activity.id,
      activityTitle: activity.title,
      date: activity.date,
      status: selectedStatus,
    };

    setIsSubmitting(true);
    try {
        await handleRecordAttendance(newRecordData);
        setIsFormVisible(false);
        setSelectedActivityId('');
        setSelectedStatus('Present');
    } catch (err: any) {
        console.error("Failed to submit attendance:", err);
        alert(`An error occurred while submitting your attendance: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDownloadCSV = () => {
    if (attendanceRecords.length === 0) {
        alert("No attendance data to download.");
        return;
    }

    const headers = ['Activity Title', 'Date', 'Status'];
    const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const rows = sortedRecords.map(record =>
      [
        `"${record.activityTitle.replace(/"/g, '""')}"`,
        record.date,
        record.status,
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'attendance_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  if (isLoadingAttendance || isLoadingActivities || isLoadingUsers) {
      return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading attendance data...</div>;
  }
  
  if (attendanceError || activitiesError) {
      return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Error: ${attendanceError || activitiesError}`}</div>;
  }

  return (
    <>
      {currentUser.role === 'PATRON' ? (
        <div ref={formRef} className="scroll-animate mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Patron Attendance</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Quickly mark attendance for all members in one session.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleQuickAttendance}
                disabled={isQuickCreating}
                className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-pink-600 rounded-xl shadow-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Tooltip text="Create a quick attendance session for today.">
                  <span className="flex items-center space-x-2">
                    <PlusCircleIcon />
                    <span>{isQuickCreating ? 'Creating...' : 'Quick Attendance'}</span>
                  </span>
                </Tooltip>
              </button>
              <Tooltip text="Export attendance records as a CSV file.">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-purple-600 rounded-xl shadow-md hover:bg-purple-700 transition-all"
                  aria-label="Download attendance records as CSV"
                >
                  <DownloadIcon />
                  <span>Download CSV</span>
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
              <div>
                <label htmlFor="patron-activity-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity</label>
                <select
                  id="patron-activity-select"
                  value={patronActivityId}
                  onChange={(e) => setPatronActivityId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-xl"
                >
                  <option value="" disabled>Select an activity...</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.title} ({formatDate(act.date)})</option>
                  ))}
                </select>
              </div>
              <Tooltip text="Save attendance for all members at once.">
                <button
                  onClick={handleBulkSubmit}
                  disabled={!patronActivityId || isBulkSubmitting}
                  className="inline-flex justify-center py-2.5 px-5 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                >
                  {isBulkSubmitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </Tooltip>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gray-50/80 dark:bg-gray-900/40">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Members</p>
                  <p className="text-xs text-gray-400">{memberUsers.length} total • {presentCount} present • {absentCount} absent</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip text="Mark every member as present.">
                    <button
                      type="button"
                      onClick={() => handleMarkAll(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      All Present
                    </button>
                  </Tooltip>
                  <Tooltip text="Clear all selections (mark everyone absent).">
                    <button
                      type="button"
                      onClick={() => handleMarkAll(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </Tooltip>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members..."
                    className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-700">
                {filteredMembers.map(user => {
                  const isPresent = attendanceChecklist[user.uid] || false;
                  return (
                    <label key={user.uid} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.username}`}
                          alt={user.name}
                          className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isPresent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isPresent}
                            onChange={() => handleToggleChecklist(user.uid)}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-10 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors peer-checked:bg-emerald-500"></div>
                          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></div>
                        </div>
                      </div>
                    </label>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-6">No members found.</p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                Checked = Present, unchecked = Absent.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={formRef} className="scroll-animate mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Attendance Recording</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Attendance can only be recorded by patron accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        <div ref={logRef} className="scroll-animate lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Attendance Log</h2>
          <div className="overflow-x-auto">
             {attendanceRecords.length > 0 ? (
                <table className="w-full text-left">
                <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                    <tr>
                    <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Event</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {attendanceRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{record.activityTitle}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{formatDate(record.date)}</td>
                        <td className="py-3 px-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[record.status]}`}>
                            {record.status}
                        </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">You have no attendance records yet.</p>
             )}
          </div>
        </div>
        <div ref={summaryRef} className="scroll-animate bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">Summary</h2>
          <div className="relative w-full h-[300px]">
            {shouldRenderChart ? (
                hasPieData ? (
                    <ChartErrorBoundary>
                        <ResponsiveContainer width="99%" height="100%">
                            <PieChart>
                                <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                                >
                                {pieChartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={chartColors[entry.name as AttendanceStatus]} />
                                ))}
                                </Pie>
                                <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                    borderColor: '#4B5563'
                                }}
                                itemStyle={{ color: '#D1D5DB' }}
                                />
                                <Legend wrapperStyle={{color: '#9CA3AF'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartErrorBoundary>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">No attendance data yet.</div>
                )
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading chart...</div>
            )}
          </div>
        </div>
      </div>
      
      <div ref={trendRef} className="scroll-animate bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Attendance Trend</h2>
           {lineChartData.length > 1 ? (
            <div className="relative w-full h-80">
                {shouldRenderChart ? (
                    <ChartErrorBoundary>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                                <defs>
                                    <linearGradient id="line-color-gradient" x1="0" y1="0" x2="1" y2="0">
                                        {lineChartData.map((entry, index) => {
                                            const offsetDenominator = lineChartData.length > 1 ? lineChartData.length - 1 : 1;
                                            const offset = (index / offsetDenominator) * 100;
                                            return <stop key={index} offset={`${offset}%`} stopColor={chartColors[entry.status as AttendanceStatus]} />;
                                        })}
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d).split(',')[0]} tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={70} interval={0} />
                                <YAxis domain={[0, 2]} ticks={[0, 1, 2]} tickFormatter={yAxisTickFormatter} tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="url(#line-color-gradient)" 
                                strokeWidth={3} 
                                activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} 
                                dot={{ r: 4, stroke: '#fff', strokeWidth: 1 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartErrorBoundary>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading chart...</div>
                )}
            </div>
           ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">More attendance records are needed to show a trend.</p>
           )}
      </div>
    </>
  );
};

export default Attendance;
