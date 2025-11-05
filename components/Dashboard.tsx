import React, { useState } from 'react';
import Activities from './Activities';
import Attendance from './Attendance';
import Feed from './Feed';
import Members from './Members';
import ProjectsBoard from './ProjectsBoard';
import Profile from './Profile';
import Chat from './Chat';
import { CalendarIcon } from './icons/CalendarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { User } from '../types';

type Tab = 'feed' | 'activities' | 'attendance' | 'projects' | 'chat' | 'profile' | 'members';

interface DashboardProps {
  currentUser: User;
  onUpdateUserProfile: (user: User) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onUpdateUserProfile }) => {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed currentUser={currentUser} />;
      case 'activities':
        return <Activities currentUser={currentUser} />;
      case 'attendance':
        return <Attendance currentUser={currentUser} />;
      case 'projects':
        return <ProjectsBoard currentUser={currentUser} />;
      case 'chat':
        return <Chat currentUser={currentUser} />;
      case 'profile':
        return <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />;
      case 'members':
        if (currentUser.role === 'PATRON') {
          return <Members currentUser={currentUser} />;
        }
        return null;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{
    tabName: Tab;
    label: string;
    icon: React.ReactNode;
  }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        activeTab === tabName
          ? 'bg-purple-600 text-white shadow-md'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm inline-flex flex-wrap space-x-2 border border-gray-200 dark:border-gray-700">
        <TabButton tabName="feed" label="Feed" icon={<HomeIcon />} />
        <TabButton tabName="activities" label="Activities" icon={<CalendarIcon />} />
        <TabButton tabName="attendance" label="Attendance" icon={<CheckCircleIcon />} />
        <TabButton tabName="projects" label="Projects" icon={<ClipboardListIcon />} />
        <TabButton tabName="chat" label="Chat" icon={<ChatBubbleIcon />} />
        <TabButton tabName="profile" label="Profile" icon={<IdentificationIcon />} />
        {currentUser.role === 'PATRON' && (
          <TabButton tabName="members" label="Members" icon={<UsersIcon />} />
        )}
      </div>
      <div>{renderContent()}</div>
    </div>
  );
};

export default Dashboard;
