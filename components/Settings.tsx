
import React, { useState } from 'react';
import { User } from '../types';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onCancel: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onCancel }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdate({
        ...user,
        name,
        avatar
      });
      setIsSaving(false);
    }, 800);
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-[#120e0d] overflow-hidden">
      {/* Background Library Imagery */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 grayscale"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#120e0d] via-transparent to-[#120e0d]"></div>
      
      {/* Subtle Texture */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>

      <div className="relative z-10 w-full max-w-lg p-6">
        <div className="bg-[#1a1412]/95 border border-[#d4af37]/30 rounded-lg p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 rounded-lg border border-[#d4af37]/30 bg-[#120e0d]">
              <i className="fas fa-user-edit text-2xl text-[#d4af37]"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#d4af37]">Identity Archives</h2>
              <p className="text-[#a89080] text-xs uppercase tracking-widest font-sans">Modify Your Scholarly Profile</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <img 
                  src={avatar} 
                  alt="Profile Preview" 
                  className="w-24 h-24 rounded-full border-2 border-[#d4af37]/40 p-1 object-cover bg-[#2a1f1b]"
                />
                <button 
                  type="button"
                  onClick={generateRandomAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#d4af37] text-[#1a1412] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  title="Random Sketch"
                >
                  <i className="fas fa-sync-alt text-xs"></i>
                </button>
              </div>
              <p className="text-[10px] text-[#6d5b50] mt-3 uppercase tracking-widest font-bold">Your Scholarly Portrait</p>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2">Display Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Scholar's Name"
                className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm py-3 px-4 text-[#e8dcc4] focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#4a3a34]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2">Avatar URL</label>
              <input 
                type="text" 
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://your-portrait-link.jpg"
                className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm py-3 px-4 text-[#e8dcc4] focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#4a3a34] text-xs font-mono"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button 
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 bg-transparent border border-[#3e2f2a] hover:bg-[#3e2f2a]/30 text-[#a89080] text-sm font-bold uppercase tracking-widest rounded-sm transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-[2] bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1412] font-bold py-3 rounded-sm tracking-widest uppercase text-sm transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-feather-pointed animate-pulse mr-2"></i>
                    Recording...
                  </span>
                ) : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-[#6d5b50] uppercase tracking-[0.3em] font-bold">
            Powered by SeunJiminx
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
