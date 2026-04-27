
import React, { useState, useCallback, useEffect } from 'react';
import { User, Tab } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import PendingApprovalModal from './components/PendingApprovalModal';
import FeatureTourModal from './components/FeatureTourModal';
import CustomCursor from './components/CustomCursor';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';
import { MenuIcon } from './components/icons/MenuIcon';
import { DataProvider, useData } from './DataContext';
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';
import { LogoutIcon } from './components/icons/LogoutIcon';
import ToastContainer from './components/Toast';
import OfflineIndicator from './components/OfflineIndicator';
import OfflineQueueStatus from './components/OfflineQueueStatus';
import { startOfflineQueueSync } from './services/offlineQueue';

// ... keep all previous code unchanged ...

const App: React.FC = () => {

  // existing state...

  useEffect(() => {
    startOfflineQueueSync();
  }, []);

  // rest of existing logic unchanged...

  return (
    <div className="min-h-full text-gray-800 dark:text-gray-200 relative" style={{ fontFamily: font }}>
      {!isOnline && <OfflineIndicator />}
      <OfflineQueueStatus />
      <CustomCursor />
      <div className="relative z-10">{renderContent()}</div>
      <PendingApprovalModal isOpen={showPendingModal} onClose={() => setShowPendingModal(false)} />
      <FeatureTourModal isOpen={showTourModal} onClose={handleCloseTour} />
    </div>
  );
};

export default App;
