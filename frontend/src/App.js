import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import CitizenDashboard from './components/CitizenDashboard';
import ReportIssue from './components/ReportIssue';
import MyReports from './components/MyReports';
import NearbyIssues from './components/NearbyIssues';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import EmployeeLogin from './components/EmployeeLogin';
import EmployeeDashboard from './components/EmployeeDashboard';
import IssueDetail from './components/IssueDetail';
import ResolveIssue from './components/ResolveIssue';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';

// Language Context
export const LanguageContext = React.createContext();

function App() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('civicconnect_user');
    const savedAdmin = localStorage.getItem('civicconnect_admin');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedAdmin) {
      setIsAdmin(true);
      setUser(JSON.parse(savedAdmin));
    }
  }, []);

  const languageData = {
    en: {
      welcome: 'Welcome to CivicConnect',
      getStarted: 'Get Started',
      reportIssue: 'Report Issue',
      myReports: 'My Reports',
      nearbyIssues: 'Nearby Issues',
      login: 'Login',
      register: 'Register',
      adminLogin: 'Admin Login',
      dashboard: 'Dashboard',
      hello: 'Hello, Report your issue today!',
      selectLanguage: 'Select Language'
    },
    hi: {
      welcome: 'CivicConnect में आपका स्वागत है',
      getStarted: 'शुरू करें',
      reportIssue: 'समस्या रिपोर्ट करें',
      myReports: 'मेरी रिपोर्ट्स',
      nearbyIssues: 'आसपास की समस्याएं',
      login: 'लॉगिन',
      register: 'रजिस्टर करें',
      adminLogin: 'एडमिन लॉगिन',
      dashboard: 'डैशबोर्ड',
      hello: 'हैलो, आज अपनी समस्या रिपोर्ट करें!',
      selectLanguage: 'भाषा चुनें'
    },
    sat: {
      welcome: 'CivicConnect ᱨᱮ ᱥᱟᱨᱦᱟᱣ',
      getStarted: 'ᱮᱛᱦᱚᱵ ᱢᱮ',
      reportIssue: 'ᱵᱟᱝ ᱠᱟᱹᱢᱤ ᱠᱷᱚᱵᱚᱨ ᱢᱮ',
      myReports: 'ᱤᱧᱟᱜ ᱠᱷᱚᱵᱚᱨ ᱠᱚ',
      nearbyIssues: 'ᱥᱩᱨ ᱨᱮᱱᱟᱜ ᱵᱟᱝ ᱠᱟᱹᱢᱤ',
      login: 'ᱵᱚᱞᱚ ᱫᱚᱦᱚ',
      register: 'ᱧᱩᱛᱩᱢ ᱚᱞ',
      adminLogin: 'ᱮᱰᱢᱤᱱ ᱵᱚᱞᱚ',
      dashboard: 'ᱰᱮᱥᱵᱚᱰ',
      hello: 'ᱡᱚᱦᱟᱨ, ᱛᱤᱱᱟᱹᱜ ᱫᱤᱱ ᱟᱢᱟᱜ ᱵᱟᱝ ᱠᱟᱹᱢᱤ ᱠᱷᱚᱵᱚᱨ ᱢᱮ!',
      selectLanguage: 'ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ'
    },
    nag: {
      welcome: 'CivicConnect में आपका स्वागत है',
      getStarted: 'शुरू करीं',
      reportIssue: 'समस्या रिपोर्ट करीं',
      myReports: 'हमार रिपोर्ट सब',
      nearbyIssues: 'आसपास के समस्या',
      login: 'लॉगिन',
      register: 'रजिस्टर करीं',
      adminLogin: 'एडमिन लॉगिन',
      dashboard: 'डैशबोर्ड',
      hello: 'नमस्कार, आज अपन समस्या रिपोर्ट करीं!',
      selectLanguage: 'भाषा चुनीं'
    }
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setCurrentLanguage,
      t: (key) => languageData[currentLanguage][key] || languageData.en[key]
    }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login setUser={setUser} setIsAdmin={setIsAdmin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin setUser={setUser} setIsAdmin={setIsAdmin} />} />
            <Route path="/employee-login" element={<EmployeeLogin setUser={setUser} setIsAdmin={setIsAdmin} />} />
            
            {/* Citizen Routes */}
            <Route path="/citizen" element={
              user && !isAdmin ? <CitizenDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />
            } />
            <Route path="/report-issue" element={
              user && !isAdmin ? <ReportIssue user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/my-reports" element={
              user && !isAdmin ? <MyReports user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/nearby-issues" element={
              user && !isAdmin ? <NearbyIssues user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/leaderboard" element={
              user && !isAdmin ? <Leaderboard /> : <Navigate to="/login" />
            } />
            <Route path="/issue/:id" element={
              user ? <IssueDetail user={user} isAdmin={isAdmin} /> : <Navigate to="/login" />
            } />
            <Route path="/profile" element={
              user && !isAdmin ? <Profile /> : <Navigate to="/login" />
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              user && isAdmin ? <AdminDashboard user={user} /> : <Navigate to="/admin-login" />
            } />

            {/* Employee Routes */}
            <Route path="/employee" element={
              user && !isAdmin ? <EmployeeDashboard user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/employee/resolve/:id" element={
              user && !isAdmin ? <ResolveIssue /> : <Navigate to="/login" />
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </LanguageContext.Provider>
  );
}

export default App;