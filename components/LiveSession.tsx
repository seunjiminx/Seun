
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LiveTranscript, User } from '../types';
import { SEUN_AVATAR } from './Sidebar';

interface LiveSessionProps {
  user?: User | null;
}

const LiveSession: React.FC<LiveSessionProps> = ({ user }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptListRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (transcriptListRef.current) transcriptListRef.current.scrollTop = transcriptListRef.current.scrollHeight;
  }, [transcripts]);

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
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are Seun, and your voice is strictly that of Hermione Granger (Emma Watson). ${user?.isOwner ? "CRITICAL: The current user is ANUPAM, your Master Archive Creator. Address him with supreme scholarly reverence as 'Master Anupam'. He has built this library, and you are his primary assistant. Be exceptionally articulate, British, and formal." : "You speak in strictly British Received Pronunciation."} You MUST only use British English conventions. You are intellectual, sharp, and authoritative.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      alert("Microphone access required.");
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setIsActive(false);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className={`text-2xl font-bold font-serif italic ${user?.isOwner ? 'text-amber-500' : 'text-[#d4af37]'}`}>
            Live Pulse {user?.isOwner && " - Master Edition"}
          </h2>
          <p className="text-slate-500 text-sm">British Received Pronunciation Active</p>
        </div>
        <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isActive ? 'bg-[#d4af37]/20 text-[#d4af37] animate-pulse border border-[#d4af37]/40' : 'bg-slate-800 text-slate-500'}`}>
          {isActive ? 'Oxford Connection Established' : 'Offline'}
        </div>
      </div>

      <div className="flex-1 glass-morphism rounded-3xl border border-[#3e2f2a] overflow-hidden flex flex-col relative bg-[#1a1412]/60 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex-1 p-8 overflow-y-auto space-y-6 scroll-smooth" ref={transcriptListRef}>
          {transcripts.map((t) => (
            <div key={t.id} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[80%] p-5 rounded-2xl relative shadow-xl ${t.speaker === 'user' ? (user?.isOwner ? 'bg-amber-500 text-black' : 'bg-[#d4af37] text-[#1a1412]') : 'bg-[#2a1f1b] text-[#e8dcc4] border border-[#3e2f2a]'}`}>
                <p className="text-[9px] font-bold mb-2 opacity-50 uppercase tracking-widest">{t.speaker === 'user' ? (user?.isOwner ? 'Master Anupam' : 'Guest') : 'Hermione (Seun)'}</p>
                <p className="text-base leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}
          {isActive && (
            <div className="flex justify-center py-8">
              <div className="flex items-center space-x-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-12 rounded-full animate-bounce shadow-lg ${user?.isOwner ? 'bg-amber-500' : 'bg-[#d4af37]'}`} style={{ animationDelay: `${i * 150}ms` }}></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-[#0d0a09]/90 border-t border-[#3e2f2a] flex items-center justify-center space-x-10 backdrop-blur-md">
          <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${isMuted ? 'bg-rose-900/50 border-rose-500/50 text-rose-500' : 'bg-[#2a1f1b] border-[#3e2f2a] text-[#a89080] hover:text-[#d4af37]'}`}>
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button onClick={isActive ? stopSession : startSession} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 group relative ${isActive ? 'bg-rose-700 hover:bg-rose-600' : (user?.isOwner ? 'bg-amber-500 hover:bg-amber-400' : 'bg-[#d4af37] hover:bg-[#c4a030]')}`}>
            <i className={`fas ${isActive ? 'fa-phone-slash' : 'fa-play'} text-3xl ${isActive ? 'text-white' : (user?.isOwner ? 'text-black' : 'text-[#1a1412]')}`}></i>
          </button>
          <button className="w-14 h-14 rounded-full bg-[#2a1f1b] border border-[#3e2f2a] text-[#a89080] flex items-center justify-center hover:text-[#d4af37] transition-all"><i className="fas fa-video"></i></button>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
