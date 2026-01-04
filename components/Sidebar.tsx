
import React, { useState, useEffect } from 'react';
import { AppMode, User } from '../types';

interface SidebarProps {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  user: User;
  onLogout: () => void;
}

export const SEUN_AVATAR = "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=200&auto=format&fit=crop";

const Sidebar: React.FC<SidebarProps> = ({ activeMode, setActiveMode, user, onLogout }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navItems = [
    { mode: AppMode.CHAT, label: 'SeunChat', icon: 'fa-comments', color: 'text-blue-400', badge: null },
    { mode: AppMode.IMAGE, label: 'Imagine', icon: 'fa-image', color: 'text-purple-400', badge: 'Free' },
    { mode: AppMode.DARK_ACADEMIA, label: 'Scholarly Art', icon: 'fa-book-open', color: 'text-amber-500', badge: 'Free' },
    { mode: AppMode.VIDEO, label: 'Veo Engine', icon: 'fa-film', color: 'text-pink-400', badge: user.isOwner ? 'Unlocked' : 'Paid' },
    { mode: AppMode.LIVE, label: 'Live Pulse', icon: 'fa-microphone', color: 'text-emerald-400', badge: null },
    { mode: AppMode.ADMIN_FICTION, label: 'AdminFiction', icon: 'fa-vault', color: 'text-rose-400', badge: user.isOwner ? 'Access Granted' : 'Restricted' },
  ];

  return (
    <div className="w-64 glass-morphism h-full flex flex-col border-r border-slate-800 transition-all duration-300 relative z-50">
      {/* Glow Effect for Owner */}
      {user.isOwner && (
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500/0 via-amber-500/50 to-amber-500/0"></div>
      )}

      <div className="p-6 flex items-center space-x-3">
        <div className="relative group cursor-pointer" onClick={() => setActiveMode(AppMode.CHAT)}>
          <img 
            src={user.isOwner ? user.avatar : SEUN_AVATAR} 
            alt="Seun" 
            className={`w-12 h-12 rounded-full object-cover ring-2 transition-transform duration-300 group-hover:scale-110 ${user.isOwner ? 'ring-amber-500 shadow-[0_0_20px_rgba(212,175,55,0.6)]' : 'ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${user.isOwner ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Seun AI
          </h1>
          <div className="flex items-center space-x-2">
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${user.isOwner ? 'text-amber-500' : 'text-emerald-400'}`}>
              {user.isOwner ? 'Master Online' : 'Scholar Online'}
            </span>
            <span className="text-[8px] bg-slate-800 text-slate-500 px-1 rounded border border-slate-700">v1.2.3</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setActiveMode(item.mode)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeMode === item.mode
                ? 'bg-slate-800 text-white ring-1 ring-slate-700 shadow-lg'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <i className={`fas ${item.icon} ${activeMode === item.mode ? item.color : 'text-slate-500 group-hover:text-slate-300'} transition-colors w-5 text-center`}></i>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter border ${
                item.badge === 'Free' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : 
                item.badge === 'Restricted' ? 'border-rose-500/30 text-rose-500 bg-rose-500/10' :
                item.badge === 'Unlocked' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' :
                item.badge === 'Access Granted' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' :
                'border-pink-500/30 text-pink-500 bg-pink-500/10'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full mt-4 flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600/20 to-amber-900/20 text-amber-400 border border-amber-500/30 animate-pulse hover:from-amber-600/30 transition-all shadow-xl"
          >
            <i className="fas fa-download"></i>
            <span className="font-bold text-xs uppercase tracking-widest">Install Seun AI</span>
          </button>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <div className={`bg-slate-900/50 rounded-xl p-3 flex items-center space-x-3 group relative border transition-all ${user.isOwner ? 'border-amber-500/20 bg-amber-500/5 shadow-inner' : 'border-slate-800'}`}>
          <img
            src={user.avatar}
            alt={user.name}
            className={`w-8 h-8 rounded-full ring-2 object-cover ${user.isOwner ? 'ring-amber-500' : 'ring-slate-700'}`}
          />
          <div className="flex-1 overflow-hidden">
            <p className={`text-xs font-semibold truncate ${user.isOwner ? 'text-amber-500' : 'text-slate-100'}`}>{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">{user.isOwner ? 'Master Archive Owner' : 'Premium Scholar'}</p>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setActiveMode(AppMode.SETTINGS)}
              title="Settings"
              className={`p-1 transition-colors ${activeMode === AppMode.SETTINGS ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
            >
              <i className="fas fa-cog"></i>
            </button>
            <button 
              onClick={onLogout}
              title="Logout"
              className="text-slate-500 hover:text-rose-500 cursor-pointer transition-colors p-1"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
