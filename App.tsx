
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import LiveSession from './components/LiveSession';
import DarkAcademiaGenerator from './components/DarkAcademiaGenerator';
import AdminFiction from './components/AdminFiction';
import Settings from './components/Settings';
import Login from './components/Login';
import { AppMode, User } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  const [user, setUser] = useState<User | null>(null);

  // Persistence check
  useEffect(() => {
    const savedUser = localStorage.getItem('hyun_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('hyun_user', JSON.stringify(userData));
  };

  const handleUpdateUser = (updatedData: User) => {
    setUser(updatedData);
    localStorage.setItem('hyun_user', JSON.stringify(updatedData));
    setActiveMode(AppMode.CHAT); // Return to chat after saving
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hyun_user');
  };

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.CHAT:
        return <ChatInterface user={user} />;
      case AppMode.IMAGE:
        return <ImageGenerator />;
      case AppMode.VIDEO:
        return <VideoGenerator user={user} />;
      case AppMode.LIVE:
        return <LiveSession user={user} />;
      case AppMode.DARK_ACADEMIA:
        return <DarkAcademiaGenerator />;
      case AppMode.ADMIN_FICTION:
        return <AdminFiction user={user} />;
      case AppMode.SETTINGS:
        return <Settings user={user!} onUpdate={handleUpdateUser} onCancel={() => setActiveMode(AppMode.CHAT)} />;
      default:
        return <ChatInterface user={user} />;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <Sidebar 
        activeMode={activeMode} 
        setActiveMode={setActiveMode} 
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
