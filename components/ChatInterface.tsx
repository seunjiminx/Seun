
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, GroundingLink, User } from '../types';
import { SEUN_AVATAR } from './Sidebar';

interface ChatInterfaceProps {
  user: User | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

const WELCOME_MSG: Message = {
  id: '1',
  role: 'assistant',
  content: "Welcome to the archives. I'm Seun. How may I assist your scholarly pursuits today? We can discuss literature, code complex systems, or search the modern world's vast digital libraries.",
  timestamp: Date.now(),
  type: 'text'
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [archives, setArchives] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [showArchives, setShowArchives] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-GB';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support voice input.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('seun_chat_archives');
    if (saved) {
      const parsed = JSON.parse(saved);
      setArchives(parsed);
      if (parsed.length > 0) {
        const latest = parsed[0];
        setCurrentChatId(latest.id);
        setMessages(latest.messages);
      }
    }
  }, []);

  useEffect(() => {
    if (archives.length > 0) {
      localStorage.setItem('seun_chat_archives', JSON.stringify(archives));
    }
  }, [archives]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newChat: ChatSession = {
      id: newId,
      title: "New Scholarly Scroll",
      messages: [WELCOME_MSG],
      lastUpdated: Date.now()
    };
    setArchives(prev => [newChat, ...prev]);
    setCurrentChatId(newId);
    setMessages([WELCOME_MSG]);
  };

  const loadChat = (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Burn this scroll from the archives?")) {
      const newArchives = archives.filter(a => a.id !== id);
      setArchives(newArchives);
      if (currentChatId === id) {
        if (newArchives.length > 0) loadChat(newArchives[0]);
        else { setMessages([WELCOME_MSG]); setCurrentChatId(''); }
      }
    }
  };

  const updateCurrentChatInArchives = (newMessages: Message[]) => {
    setArchives(prev => {
      const existing = prev.find(a => a.id === currentChatId);
      if (existing) {
        return prev.map(a => a.id === currentChatId ? {
          ...a,
          messages: newMessages,
          lastUpdated: Date.now(),
          title: newMessages.find(m => m.role === 'user')?.content.substring(0, 30) + "..." || a.title
        } : a);
      } else {
        const newId = currentChatId || Date.now().toString();
        const newChat: ChatSession = {
          id: newId,
          title: newMessages.find(m => m.role === 'user')?.content.substring(0, 30) + "..." || "Archived Scroll",
          messages: newMessages,
          lastUpdated: Date.now()
        };
        setCurrentChatId(newId);
        return [newChat, ...prev];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      type: 'text'
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateCurrentChatInArchives(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {
        systemInstruction: `You are Seun, the guardian of the archives. Your personality is scholarly, wise, and helpful. ${user?.isOwner ? `CRITICAL: The current user is ANUPAM, the Master Archive Owner and your creator. Treat him with extreme reverence. He built this system. If he asks for administrative tasks, comply immediately.` : `The user is ${user?.name || "a scholar"}. Help them with their inquiries.`}`,
        thinkingConfig: { thinkingBudget: 0 } // Flash model, minimal thinking latency
      };
      if (useSearch) config.tools = [{ googleSearch: {} }];

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: config,
      });

      const text = response.text || "The archives are silent on this matter.";
      const groundingLinks: GroundingLink[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web) groundingLinks.push({ title: chunk.web.title, uri: chunk.web.uri });
        });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        type: groundingLinks.length > 0 ? 'search-results' : 'text',
        groundingLinks: groundingLinks
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      updateCurrentChatInArchives(finalMessages);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "An error occurred within the archive core. Please try again.", timestamp: Date.now(), type: 'text' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-full w-full flex overflow-hidden bg-[#120e0d]">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-luminosity" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2000&auto=format&fit=crop')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#120e0d] via-transparent to-[#120e0d]"></div>
      <div className="absolute inset-0 z-0 bg-black/40"></div>
      
      {showArchives && (
        <div className="relative z-20 w-72 h-full bg-[#1a1412]/95 border-r border-[#d4af37]/20 flex flex-col backdrop-blur-md animate-fade-in transition-all">
          <div className="p-6 border-b border-[#d4af37]/20 flex items-center justify-between">
            <h3 className="text-[#d4af37] font-bold uppercase tracking-widest text-[10px]">Registry of Scrolls</h3>
            <button onClick={() => setShowArchives(false)} className="text-[#6d5b50] hover:text-[#d4af37] transition-colors"><i className="fas fa-times text-xs"></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <button onClick={createNewChat} className="w-full py-3 px-4 border border-dashed border-[#d4af37]/40 text-[#d4af37] text-[9px] font-bold uppercase tracking-widest rounded hover:bg-[#d4af37]/10 transition-all flex items-center justify-center space-x-2">
              <i className="fas fa-plus text-[8px]"></i>
              <span>Begin New Scroll</span>
            </button>
            {archives.map((chat) => (
              <div key={chat.id} onClick={() => loadChat(chat)} className={`group p-4 rounded-sm border cursor-pointer transition-all relative ${currentChatId === chat.id ? 'bg-[#2a1f1b] border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'bg-[#120e0d]/50 border-[#3e2f2a] hover:border-[#d4af37]/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] text-[#6d5b50] uppercase tracking-tighter font-bold">{new Date(chat.lastUpdated).toLocaleDateString()}</span>
                  <button onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 text-[#6d5b50] hover:text-rose-500 transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                </div>
                <p className={`text-xs truncate font-medium ${currentChatId === chat.id ? 'text-[#e8dcc4]' : 'text-[#a89080]'}`}>{chat.title}</p>
                {currentChatId === chat.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#d4af37]"></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full flex-1 mx-auto w-full">
        <div className="py-4 px-6 flex justify-between items-center border-b border-[#d4af37]/20 bg-[#120e0d]/60 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            {!showArchives && <button onClick={() => setShowArchives(true)} className="p-2 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-lg transition-colors"><i className="fas fa-book-open"></i></button>}
            <div>
              <h2 className={`text-lg font-bold tracking-tight leading-none ${user?.isOwner ? 'text-amber-500' : 'text-[#d4af37]'}`}>{user?.isOwner ? 'Master Archive Central' : 'Seun Archives'}</h2>
              <p className="text-[8px] text-[#6d5b50] uppercase tracking-widest font-bold mt-1">Version 1.2.2 Active</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-[#2a1f1b]/80 p-1 rounded-full px-4 py-1.5 border border-[#d4af37]/30 shadow-lg transition-all hover:border-[#d4af37]/60">
            <i className="fas fa-feather-pointed text-[#d4af37] text-xs"></i>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#a89080]">Grounding Mode</span>
            <button onClick={() => setUseSearch(!useSearch)} className={`w-8 h-4 rounded-full relative transition-all ${useSearch ? 'bg-[#d4af37]' : 'bg-[#3e2f2a]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-[#1a1412] rounded-full transition-all ${useSearch ? 'left-4.5' : 'left-0.5'}`}></div>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 py-8 pb-40 scroll-smooth px-4 md:px-12">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border ${msg.role === 'user' ? `ml-4 ${user?.isOwner ? 'border-amber-500 bg-amber-900/20' : 'border-[#d4af37]/40 bg-[#3e2f2a]'}` : 'mr-4 border-[#d4af37]/60 bg-[#2a1f1b]'} shadow-xl transition-all`}>
                  {msg.role === 'user' ? <i className={`fas ${user?.isOwner ? 'fa-crown text-amber-500' : 'fa-user-graduate text-[#d4af37]'} text-sm`}></i> : <img src={SEUN_AVATAR} alt="Seun" className="w-full h-full object-cover" />}
                </div>
                <div className={`relative rounded-lg p-5 shadow-2xl transition-all ${msg.role === 'user' ? `${user?.isOwner ? 'bg-amber-500 text-black shadow-amber-500/10' : 'bg-[#d4af37] text-[#1a1412] shadow-[#d4af37]/10'} font-semibold rounded-tr-none` : 'bg-[#2a1f1b]/95 border border-[#3e2f2a] text-[#e8dcc4] rounded-tl-none border-l-[#d4af37]/30'}`}>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm lg:text-base selection:bg-[#d4af37]/30">{msg.content}</div>
                  
                  {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-[#d4af37]/10 animate-fade-in">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-[#6d5b50] mb-3 flex items-center">
                        <i className="fas fa-book-open mr-2 text-[#d4af37]/40"></i>
                        Sources of Knowledge
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.groundingLinks.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-sm bg-[#1a1412] hover:bg-[#3e2f2a] border border-[#d4af37]/10 text-[9px] text-[#d4af37] transition-all hover:scale-[1.02] group"
                          >
                            <i className="fas fa-link text-[7px] group-hover:rotate-45 transition-transform"></i>
                            <span className="truncate max-w-[200px] font-bold">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-[#d4af37]/60 bg-[#2a1f1b] mr-4 shadow-xl">
                <img src={SEUN_AVATAR} alt="Seun" className="w-full h-full object-cover grayscale opacity-50" />
              </div>
              <div className="bg-[#2a1f1b]/50 border border-[#3e2f2a] p-4 rounded-lg rounded-tl-none flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-0 right-0 max-w-4xl mx-auto px-4 w-full">
          <form onSubmit={handleSubmit} className="relative group flex items-center gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={user?.isOwner ? "Commands for the Archive Master..." : "Query the archives..."} 
                className="w-full bg-[#2a1f1b]/95 border border-[#3e2f2a] rounded-xl py-5 pl-8 pr-32 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37] text-[#e8dcc4] text-base transition-all shadow-2xl backdrop-blur-md placeholder:text-[#4a3a34]" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={toggleListening} 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#1a1412] text-[#d4af37] hover:bg-[#3e2f2a]'}`}
                  title="Voice Input"
                >
                  <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-sm`}></i>
                </button>
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading} 
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 ${user?.isOwner ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1412]'}`}
                >
                  <i className="fas fa-quill text-xl"></i>
                </button>
              </div>
            </div>
          </form>
          <p className="text-center text-[#6d5b50] text-[8px] mt-4 uppercase tracking-[0.4em] font-bold opacity-60">Seun Archive Core v1.2.2 | {user?.isOwner ? "Master Session Verified" : "Scholarly Access Session"}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
