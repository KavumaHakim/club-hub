import React, { useState, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AttendanceRecord, AttendanceStatus, User } from '../types';
import * as api from '../services/apiService';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { useData } from '../DataContext';

interface AttendanceProps {
  currentUser: User;
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

const Attendance: React.FC<AttendanceProps> = ({ currentUser }) => {
  const { 
    attendance: attendanceRecords, 
    activities, 
    isLoadingAttendance, 
    isLoadingActivities, 
    fetchAttendance 
  } = useData();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('Present');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const lineChartData = useMemo(() => {
    const statusToValue = (status: AttendanceStatus): number => {
        if (status === 'Present') return 2;
        if (status === 'Excused') return 1;
        return 0; // Absent
    };
    return [...attendanceRecords].reverse().map(rec => ({
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{`Date: ${data.date}`}</p>
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
    } catch (err) {
        console.error("Failed to submit attendance:", err);
        alert("An error occurred while submitting your attendance. Please try again.");
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


  if (isLoadingAttendance || isLoadingActivities) {
      return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading attendance data...</div>;
  }

  return (
    <>
      <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Record Your Attendance</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Missed signing in? Log your attendance for a past event here.</p>
          </div>
          <div className="flex items-center space-x-3">
            {currentUser.role === 'PATRON' && (
               <button
                  onClick={handleDownloadCSV}
                  className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 transition-all"
                  aria-label="Download attendance records as CSV"
                >
                  <DownloadIcon />
                  <span>Download CSV</span>
                </button>
            )}
            <button
              onClick={() => setIsFormVisible(!isFormVisible)}
              disabled={unrecordedActivities.length === 0 && !isFormVisible}
              className="flex items-center space-x-2 px-5 py-3 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <PlusCircleIcon />
              <span>{isFormVisible ? 'Cancel' : 'Record Attendance'}</span>
            </button>
          </div>
        </div>
        {isFormVisible && (
          <form onSubmit={handleSubmit} className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            {unrecordedActivities.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="activity-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity</label>
                    <select
                      id="activity-select"
                      value={selectedActivityId}
                      onChange={(e) => setSelectedActivityId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                    >
                      <option value="" disabled>Select an activity...</option>
                      {unrecordedActivities.map(act => (
                        <option key={act.id} value={act.id}>{act.title} ({act.date})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <div className="flex space-x-4">
                      {(['Present', 'Absent', 'Excused'] as AttendanceStatus[]).map(status => (
                        <label key={status} className="flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={selectedStatus === status}
                            onChange={() => setSelectedStatus(status)}
                            className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-right">
                  <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
                    {isSubmitting ? 'Submitting...' : 'Submit Record'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-4">All attendance has been recorded. Good job!</p>
            )}
          </form>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
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
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{record.date}</td>
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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">Summary</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
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
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Attendance Trend</h2>
           {lineChartData.length > 1 ? (
            <div className="h-80 w-full">
                <ResponsiveContainer>
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
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={70} interval={0} />
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
            </div>
           ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">More attendance records are needed to show a trend.</p>
           )}
      </div>
    </>
  );
};

export default Attendance;