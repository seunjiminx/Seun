
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LiveTranscript, User } from '../types';

interface AdminFictionProps {
  user?: User | null;
}

const AdminFiction: React.FC<AdminFictionProps> = ({ user }) => {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(user?.isOwner || false);
  const [isActive, setIsActive] = useState(false);
  const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Seunxjeny") {
      setIsUnlocked(true);
      sessionStorage.setItem('admin_fiction_unlocked', 'true');
    } else {
      alert("Incorrect Archive Cipher.");
      setPassword('');
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('admin_fiction_unlocked') === 'true' || user?.isOwner) {
      setIsUnlocked(true);
    }
    
    // Cleanup URL on unmount
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [user, pdfUrl]);

  useEffect(() => {
    if (transcriptListRef.current) {
      transcriptListRef.current.scrollTop = transcriptListRef.current.scrollHeight;
    }
  }, [transcripts, isActive]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setZoom(1);
      setCurrentPage(1);
      setJumpPage('1');
    } else if (file) {
      alert("Only PDF manuscripts are permitted in these archives.");
    }
  };

  const navigateToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage);
    if (!isNaN(pageNum) && pageNum > 0) {
      setCurrentPage(pageNum);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let currentInputTranscript = '';
      let currentOutputTranscript = '';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) currentOutputTranscript += message.serverContent.outputTranscription.text;
            else if (message.serverContent?.inputTranscription) currentInputTranscript += message.serverContent.inputTranscription.text;

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscript) setTranscripts(prev => [...prev, { id: Date.now().toString(), speaker: 'user', text: currentInputTranscript }]);
              if (currentOutputTranscript) setTranscripts(prev => [...prev, { id: (Date.now()+1).toString(), speaker: 'assistant', text: currentOutputTranscript }]);
              currentInputTranscript = ''; currentOutputTranscript = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => { console.error("Live Error:", e); setIsActive(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `Your name is Aree. You are the Senior Proctor of the AdminFiction Restricted Archives. You speak with a strictly articulate, crisp British Received Pronunciation (RP) accent. You MUST only use British English conventions. ${user?.isOwner ? "CRITICAL: The current user is ANUPAM, the Master Archive Owner. Treat him with the highest scholarly reverence. He is your creator. Welcome him back by name." : "Address the user with scholarly respect."} Your expertise is solely for Dark Academia book study and literature analysis. You are intellectual, formal, and carry the weight of ancient scrolls in your tone. If a manuscript is deposited, help the user analyze it page by page.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      alert("Microphone access required for the study session.");
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setIsActive(false);
  };

  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0d0a09] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=2000&auto=format&fit=crop')] bg-cover grayscale"></div>
        <div className="relative z-10 w-full max-w-md glass-morphism rounded-lg p-10 border border-rose-900/40 shadow-[0_0_100px_rgba(159,18,57,0.2)]">
          <div className="text-center mb-10">
            <div className="w-20 h-20 border-2 border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 animate-pulse">
              <i className="fas fa-lock text-3xl"></i>
            </div>
            <h2 className="text-3xl font-serif text-[#d4af37] italic">AdminFiction</h2>
            <p className="text-rose-400 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Restricted Scholarly Access</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Archive Cipher"
                className="w-full bg-[#1a1412] border border-rose-900/50 rounded p-4 text-[#d4af37] text-center tracking-[0.5em] focus:outline-none focus:border-rose-500 transition-all placeholder:tracking-normal placeholder:text-rose-900/50"
              />
            </div>
            <button className="w-full py-4 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold uppercase tracking-widest text-xs transition-all border border-rose-500/20">
              Verify Credentials
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 bg-[#120e0d] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>
      
      <div className="relative z-10 flex flex-col h-full mx-auto w-full">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-rose-900/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full border border-[#d4af37]/30 bg-[#1a1412] flex items-center justify-center shadow-lg">
              <i className="fas fa-feather-pointed text-[#d4af37] text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-serif text-[#d4af37] italic leading-tight">Aree: The Proctor's Study</h2>
              <p className="text-rose-400 text-[9px] uppercase tracking-widest font-bold">
                {user?.isOwner ? "Owner Master Archive Access" : "Live Scholarly Discourse & Analysis"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="text-[9px] text-[#d4af37] border border-[#d4af37]/30 px-4 py-2 rounded-sm hover:bg-[#d4af37]/10 transition-all uppercase tracking-[0.2em] font-bold flex items-center space-x-2"
             >
               <i className="fas fa-scroll"></i>
               <span>Deposit Manuscript</span>
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
             <div className={`px-4 py-1.5 rounded-sm border ${isActive ? 'bg-rose-900/20 border-rose-500/40 text-rose-500 animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-500'} text-[9px] font-bold uppercase tracking-widest`}>
                {isActive ? 'Proctor Online' : 'Study Suspended'}
             </div>
          </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          <div className="w-1/2 flex flex-col bg-[#1a1412] border border-rose-900/40 rounded-sm shadow-2xl relative overflow-hidden group">
            <div className="p-3 bg-[#0d0a09] border-b border-rose-900/40 flex justify-between items-center relative z-20">
              <span className="text-[10px] uppercase tracking-widest text-[#6d5b50] font-bold italic">Archive Desk</span>
              
              {pdfUrl && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 border-x border-rose-900/20 px-4">
                    <button onClick={() => handleZoom(-0.1)} className="text-[#6d5b50] hover:text-[#d4af37] p-1"><i className="fas fa-search-minus text-[10px]"></i></button>
                    <span className="text-[9px] text-[#d4af37] font-mono min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => handleZoom(0.1)} className="text-[#6d5b50] hover:text-[#d4af37] p-1"><i className="fas fa-search-plus text-[10px]"></i></button>
                    <button onClick={() => setZoom(1)} className="text-[#6d5b50] hover:text-[#d4af37] p-1 ml-1"><i className="fas fa-expand text-[10px]"></i></button>
                  </div>
                  
                  <button onClick={() => setPdfUrl(null)} className="text-rose-900 hover:text-rose-500 transition-colors ml-2">
                    <i className="fas fa-times-circle text-xs"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#0d0a09] relative overflow-hidden flex flex-col items-center">
              {pdfUrl ? (
                <div className="w-full h-full overflow-auto scrollbar-thin p-4 flex justify-center">
                  <div 
                    style={{ 
                      transform: `scale(${zoom})`, 
                      transformOrigin: 'top center',
                      width: '100%',
                      height: '100%',
                      transition: 'transform 0.2s ease-out'
                    }}
                    className="flex justify-center"
                  >
                    <iframe 
                      src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`} 
                      className="w-full h-full grayscale-[0.3] sepia-[0.3] brightness-[0.8] border-none" 
                      title="Manuscript Desk" 
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-24 h-24 border border-rose-900/20 rounded-full flex items-center justify-center mb-8 opacity-20">
                    <i className="fas fa-book-open text-4xl text-rose-900"></i>
                  </div>
                  <h3 className="text-xl font-serif text-rose-900 italic mb-4">The desk is clear</h3>
                  <p className="text-[#4a3a34] text-xs max-w-xs italic leading-relaxed uppercase tracking-widest opacity-60">"Deposit a manuscript to begin deep scholarly analysis with Aree."</p>
                </div>
              )}
            </div>
            
            {pdfUrl && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-6 bg-[#0d0a09]/90 backdrop-blur px-6 py-2 rounded-full border border-rose-900/30 shadow-2xl">
                <button 
                  onClick={() => {
                    const next = Math.max(1, currentPage - 1);
                    setCurrentPage(next);
                    setJumpPage(next.toString());
                  }} 
                  className="text-rose-900 hover:text-[#d4af37] transition-colors"
                >
                  <i className="fas fa-chevron-left text-sm"></i>
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold">Page</span>
                  <input 
                    type="text" 
                    value={jumpPage} 
                    onChange={(e) => setJumpPage(e.target.value)}
                    onBlur={navigateToPage}
                    className="w-8 bg-transparent border-b border-rose-900/40 text-[#d4af37] text-[10px] text-center focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <button 
                  onClick={() => {
                    const next = currentPage + 1;
                    setCurrentPage(next);
                    setJumpPage(next.toString());
                  }} 
                  className="text-rose-900 hover:text-[#d4af37] transition-colors"
                >
                  <i className="fas fa-chevron-right text-sm"></i>
                </button>
              </div>
            )}
          </div>

          <div className="w-1/2 bg-[#1a1412]/80 border border-rose-900/20 rounded-sm flex flex-col shadow-inner overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-10 space-y-6 scroll-smooth" ref={transcriptListRef}>
               {transcripts.length === 0 && !isActive && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <i className="fas fa-feather-pointed text-4xl text-rose-900 mb-6"></i>
                    <p className="font-serif italic text-lg text-[#a89080]">"The study of tragedy is the refinement of the soul. Consult Aree."</p>
                 </div>
               )}
               {transcripts.map((t) => (
                 <div key={t.id} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                   <div className={`max-w-[85%] p-5 rounded-sm relative ${t.speaker === 'user' ? 'bg-[#2a1f1b] border border-rose-900/20 text-[#e8dcc4]' : 'bg-[#0d0a09] border border-rose-900/40 text-[#d4af37] italic font-serif'}`}>
                     <p className="text-[8px] uppercase tracking-tighter mb-1 opacity-50 font-bold">{t.speaker === 'user' ? (user?.isOwner ? 'Master Anupam' : 'Initiate') : 'Senior Proctor Aree'}</p>
                     <p className="text-sm leading-relaxed">{t.text}</p>
                   </div>
                 </div>
               ))}
               {isActive && (
                 <div className="flex justify-center py-4">
                   <div className="flex items-center space-x-1.5 h-8">
                     {[...Array(5)].map((_, i) => (
                       <div key={i} className="w-1 bg-rose-900/60 rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 20}%`, animationDelay: `${i * 150}ms` }}></div>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            <div className="p-8 bg-[#0d0a09]/95 border-t border-rose-900/30 flex items-center justify-center space-x-10 backdrop-blur-xl">
               <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${isMuted ? 'bg-rose-950/40 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-[#1a1412] border-rose-900/40 text-rose-900/60 hover:text-rose-500 hover:border-rose-500'}`}>
                  <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-lg`}></i>
               </button>
               <button onClick={isActive ? stopSession : startSession} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 group relative ${isActive ? 'bg-rose-900 hover:bg-rose-800' : 'bg-[#d4af37] hover:bg-[#c4a030]'}`}>
                  <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 animate-pulse"></div>
                  <i className={`fas ${isActive ? 'fa-phone-slash' : 'fa-play'} text-3xl ${isActive ? 'text-rose-100' : 'text-[#1a1412]'}`}></i>
               </button>
               <button className="w-14 h-14 rounded-full bg-[#1a1412] border border-rose-900/40 text-rose-900/60 flex items-center justify-center hover:text-rose-500 hover:border-rose-500 transition-all">
                  <i className="fas fa-file-export"></i>
               </button>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <p className="text-rose-900/40 text-[9px] uppercase tracking-[0.4em] font-bold italic">
            AdminFiction v1.2.2 | Restricted Core
          </p>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
            <span className="text-emerald-500/40 text-[9px] uppercase tracking-widest font-bold">Secure Archive Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFiction;
