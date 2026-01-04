
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { VideoGenerationState, User } from '../types';

interface VideoGeneratorProps {
  user?: User | null;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ user }) => {
  const [prompt, setPrompt] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(user?.isOwner || false);
  const [password, setPassword] = useState('');
  const [showPassField, setShowPassField] = useState(false);
  const [genState, setGenState] = useState<VideoGenerationState>({ status: 'idle', progress: 0, message: '' });

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
      if (user?.isOwner) {
        setIsOwnerMode(true);
      } else {
        const ownerStatus = sessionStorage.getItem('hyun_owner_unlocked');
        if (ownerStatus === 'true') setIsOwnerMode(true);
      }
    };
    checkKey();
  }, [user]);

  const handleKeySelection = async () => {
    await (window as any).aistudio.openSelectKey();
    const selected = await (window as any).aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "HYUNXOX") {
      setIsOwnerMode(true);
      sessionStorage.setItem('hyun_owner_unlocked', 'true');
      setShowPassField(false);
    } else {
      alert("Invalid archive key. Access denied.");
      setPassword('');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || genState.status === 'generating') return;
    setGenState({ status: 'generating', progress: 5, message: 'Initializing Veo engine...' });
    try {
      // Re-instantiate ai client right before the call to ensure latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });
      
      setGenState(prev => ({ ...prev, progress: 20, message: 'Veo is dreaming up your video...' }));
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setGenState(prev => ({ ...prev, progress: Math.min(prev.progress + 10, 90), message: 'Processing motion and light...' }));
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video URI not found");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      
      setGenState({ status: 'idle', progress: 100, message: 'Generation complete!', videoUrl });
    } catch (error: any) {
      console.error("Video Error:", error);
      if (error?.message?.includes("Requested entity was not found.")) {
        // Handle race condition: reset key state and prompt
        setHasKey(false);
        alert("Session expired. Please select your API key again.");
      }
      setGenState({ status: 'error', progress: 0, message: 'Generation failed.' });
    }
  };

  if (!hasKey && !isOwnerMode) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#120e0d]">
        <div className="max-w-md glass-morphism rounded-3xl p-10 border border-[#d4af37]/20 shadow-2xl text-center bg-[#1a1412]/80 backdrop-blur-xl">
          <div className="w-20 h-20 bg-pink-600/10 text-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
            <i className="fas fa-lock text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-[#e8dcc4]">Veo Engine Locked</h2>
          <p className="text-[#a89080] mb-8 text-sm leading-relaxed">Standard access requires a paid Google Cloud Project API key.</p>
          <div className="space-y-4">
            {!showPassField ? (
              <>
                <button onClick={handleKeySelection} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm uppercase tracking-widest">Select Paid API Key</button>
                <button onClick={() => setShowPassField(true)} className="w-full py-3 bg-transparent border border-[#d4af37]/30 text-[#d4af37] font-bold rounded-xl transition-all hover:bg-[#d4af37]/10 text-xs uppercase tracking-widest">Owner Secret Access</button>
              </>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-fade-in">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Master Password" title="Owner Master Pass" className="w-full bg-[#0d0a09] border border-[#d4af37]/40 rounded-xl py-4 px-6 text-[#d4af37] focus:outline-none focus:border-[#d4af37] text-center tracking-[0.5em] font-bold" />
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setShowPassField(false)} className="flex-1 py-3 bg-[#3e2f2a] text-[#a89080] rounded-xl font-bold text-xs uppercase tracking-widest">Back</button>
                  <button type="submit" className="flex-[2] py-3 bg-[#d4af37] text-[#1a1412] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#c4a030]">Unlock Engine</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-6xl mx-auto p-6 flex flex-col bg-[#120e0d]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className={`text-3xl font-extrabold bg-clip-text text-transparent ${isOwnerMode ? 'bg-gradient-to-r from-amber-400 to-amber-200' : 'bg-gradient-to-r from-pink-400 to-rose-500'}`}>
            Veo Engine {isOwnerMode && <span className="text-sm align-top ml-2 opacity-50 italic">Owner Edition</span>}
          </h2>
          <p className="text-[#a89080] text-sm mt-1">Transform text into cinematic 720p video | v1.2.2</p>
        </div>
        <div className={`flex items-center space-x-3 text-xs px-4 py-2 rounded-full border ${isOwnerMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isOwnerMode ? 'bg-amber-500' : 'bg-green-500'}`}></span>
          <span className="font-bold tracking-widest uppercase text-[10px]">{isOwnerMode ? 'Master Mode Active' : 'Paid Engine Active'}</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#1a1412]/90 rounded-3xl p-6 border border-[#3e2f2a] h-fit shadow-2xl">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your cinematic vision..." className="w-full bg-[#0d0a09] border border-[#3e2f2a] rounded-2xl p-4 h-48 focus:outline-none focus:border-[#d4af37] transition-all text-[#e8dcc4] placeholder:text-[#4a3a34]" />
            <button onClick={handleGenerate} disabled={!prompt.trim() || genState.status === 'generating'} className={`w-full mt-6 py-4 rounded-2xl font-bold transition-all uppercase tracking-widest text-sm ${genState.status === 'generating' ? 'bg-[#3e2f2a] text-[#6d5b50]' : isOwnerMode ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' : 'bg-pink-600 text-white'}`}>{genState.status === 'generating' ? 'Synthesizing...' : 'Generate Video'}</button>
          </div>
        </div>
        <div className="lg:col-span-2 relative h-full">
          <div className="bg-[#1a1412]/40 rounded-3xl border border-[#3e2f2a] h-full overflow-hidden flex flex-col shadow-2xl min-h-[400px]">
            {genState.status === 'generating' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-bold text-[#e8dcc4]">{genState.message}</h3>
                <p className="mt-4 text-xs text-[#a89080] max-w-xs uppercase tracking-widest animate-pulse">This process may take several minutes.</p>
              </div>
            ) : genState.videoUrl ? (
              <video src={genState.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <i className="fas fa-film text-4xl text-[#d4af37] mb-4"></i>
                <h3 className="text-xl font-bold text-[#d4af37] uppercase tracking-widest">Cinema on Demand</h3>
                <p className="text-[#a89080] text-xs italic mt-2">Enter a prompt to begin synthesis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
