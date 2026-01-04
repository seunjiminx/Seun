
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

interface StoredUser extends User {
  password: string;
}

const OWNER_EMAIL = "anupameren@gmail.com";
const OWNER_PASS = "seunjimin090";

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simulated Database Helper
  const getVault = (): StoredUser[] => {
    const data = localStorage.getItem('seun_vault_db');
    return data ? JSON.parse(data) : [];
  };

  const saveToVault = (users: StoredUser[]) => {
    localStorage.setItem('seun_vault_db', JSON.stringify(users));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network latency for atmosphere
    setTimeout(() => {
      // MASTER OWNER CHECK
      if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        if (password === OWNER_PASS) {
          const ownerUser: User = {
            name: "Anupam",
            email: OWNER_EMAIL,
            // Updated to a randomly generated robot profile picture (consistent seed for the owner)
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=AnupamSeun&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            isOwner: true // Special flag for the system
          };
          onLogin(ownerUser);
          setIsLoading(false);
          return;
        } else if (!isSignUp) {
          setError("The Master Cipher is incorrect. Access to the Inner Vault denied.");
          setIsLoading(false);
          return;
        }
      }

      if (isSignUp) {
        // Prevent registering as the owner email
        if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
          setError("This identity is reserved for the Master Archive Owner.");
          setIsLoading(false);
          return;
        }

        const vault = getVault();
        const existingUser = vault.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          setError("This identity is already registered in the archives.");
          setIsLoading(false);
          return;
        }

        const newUser: StoredUser = {
          name: name || "Anonymous Scholar",
          email: email.toLowerCase(),
          password: password,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || email}`,
          isOwner: false
        };

        saveToVault([...vault, newUser]);
        const { password: _, ...userSession } = newUser;
        onLogin(userSession);
      } else {
        const vault = getVault();
        const user = vault.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
          setError("Invalid credentials. The archives remain closed.");
          setIsLoading(false);
          return;
        }

        const { password: _, ...userSession } = user;
        onLogin(userSession);
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-[#120e0d] overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 grayscale contrast-125 transition-all duration-1000"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#120e0d] via-transparent to-[#120e0d]"></div>
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>

      <div className="relative z-10 w-full max-w-md p-8 animate-fade-in">
        <div className="bg-[#1a1412]/95 border border-[#d4af37]/30 rounded-lg p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <div className="text-center mb-10">
            <div className={`inline-block p-4 rounded-full border border-[#d4af37]/40 mb-6 bg-[#120e0d] shadow-[0_0_20px_rgba(212,175,55,0.2)] ${email === OWNER_EMAIL ? 'animate-pulse border-amber-400' : ''}`}>
              <i className={`fas ${isSignUp ? 'fa-user-plus' : 'fa-key'} text-3xl text-[#d4af37]`}></i>
            </div>
            <h1 className="text-3xl font-bold text-[#d4af37] tracking-tight mb-2">Seun Archives</h1>
            <p className="text-[#a89080] text-[10px] uppercase tracking-[0.3em] font-bold">
              {isSignUp ? 'Issue New Library Card' : email === OWNER_EMAIL ? 'Master Archive Unlock' : 'Verify Scholarly Access'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="animate-slide-down">
                <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2 ml-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Master/Mistress Name"
                  className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm py-3 px-4 text-[#e8dcc4] focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-[#4a3a34] text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@archives.edu"
                className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm py-3 px-4 text-[#e8dcc4] focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-[#4a3a34] text-sm"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2 ml-1">Access Cipher</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm py-3 px-4 text-[#e8dcc4] focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-[#4a3a34] text-sm tracking-widest"
              />
            </div>

            {error && (
              <div className="text-rose-500 text-[10px] italic text-center animate-pulse py-1">
                {error}
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className={`w-full font-bold py-4 rounded-sm tracking-widest uppercase text-xs transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group ${email === OWNER_EMAIL ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' : 'bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1412]'}`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                {isLoading ? (
                  <span className="flex items-center justify-center relative z-10">
                    <i className="fas fa-quill-pen animate-bounce mr-3"></i>
                    Consulting Vault...
                  </span>
                ) : (
                  <span className="relative z-10">{isSignUp ? "Register Identity" : email === OWNER_EMAIL ? "Unlock Master Core" : "Unlock Archives"}</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-[#6d5b50] hover:text-[#d4af37] text-[10px] uppercase tracking-widest font-bold transition-colors border-b border-transparent hover:border-[#d4af37]/40 pb-1"
            >
              {isSignUp ? "Already have a card? Sign In" : "Don't have a library card? Sign Up"}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center opacity-40">
          <p className="text-[9px] text-[#6d5b50] uppercase tracking-[0.4em] font-bold">
            Powered by SeunJiminx Restricted Core
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slideDown 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Login;
