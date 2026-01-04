
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ImageHistory {
  prompt: string;
  url: string;
  timestamp: number;
}

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageHistory[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('hyun_image_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('hyun_image_history', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          const newEntry = { prompt, url: imageUrl, timestamp: Date.now() };
          setHistory(prev => [newEntry, ...prev]);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        alert("The visual engine returned text instead of an image. Please refine your prompt.");
      }
    } catch (error) {
      console.error("Image Gen Error:", error);
      alert("Failed to reach the image engine. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all your saved creations?")) {
      setHistory([]);
      localStorage.removeItem('hyun_image_history');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-6 space-y-6 md:space-y-0 md:space-x-6 overflow-hidden bg-[#120e0d]">
      {/* Background Library Texture */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>
      
      <div className="w-full md:w-1/3 flex flex-col bg-[#1a1412]/90 rounded-xl p-6 border border-[#3e2f2a] shadow-2xl overflow-y-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#d4af37] rounded-lg">
              <i className="fas fa-magic text-[#1a1412]"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#d4af37]">Image Studio</h2>
              <span className="text-[10px] text-[#a89080] font-bold uppercase tracking-widest">Unlimited Free Tier</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div className="relative">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-[#6d5b50] mb-2">Artistic Directive</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your vision... e.g. 'A grand library with floating scrolls'"
              className="w-full bg-[#120e0d] border border-[#3e2f2a] rounded-sm p-4 h-32 focus:outline-none focus:border-[#d4af37] transition-all resize-none text-[#e8dcc4] placeholder:text-[#4a3a34]"
            />
            <div className="absolute bottom-2 right-2 text-[8px] text-[#4a3a34] font-bold uppercase tracking-tighter">Unlimited Access</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#2a1f1b]/50 rounded-sm border border-[#3e2f2a] cursor-default">
              <p className="text-[9px] text-[#6d5b50] font-bold uppercase mb-1">Canvas</p>
              <p className="text-xs font-medium text-[#d4af37]">1:1 Square</p>
            </div>
            <div className="p-3 bg-[#2a1f1b]/50 rounded-sm border border-[#3e2f2a] cursor-default">
              <p className="text-[9px] text-[#6d5b50] font-bold uppercase mb-1">Cost</p>
              <p className="text-xs font-medium text-emerald-500">Free / Unlimited</p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={`w-full py-4 rounded-sm flex items-center justify-center space-x-2 font-bold uppercase tracking-widest text-sm transition-all shadow-xl active:scale-[0.98] ${
              isGenerating 
                ? 'bg-[#3e2f2a] text-[#6d5b50] cursor-not-allowed' 
                : 'bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1412]'
            }`}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                <span>Envisioning...</span>
              </>
            ) : (
              <>
                <i className="fas fa-paint-brush"></i>
                <span>Generate Masterpiece</span>
              </>
            )}
          </button>

          <div className="pt-8 border-t border-[#3e2f2a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-[#6d5b50] uppercase tracking-widest">Personal Archives</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-[9px] text-rose-500 hover:text-rose-400 font-bold uppercase">Clear</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {history.map((item, idx) => (
                <div 
                  key={idx} 
                  className="aspect-square rounded-sm overflow-hidden border border-[#3e2f2a] group relative cursor-pointer"
                  onClick={() => setResultImage(item.url)}
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  <div className="absolute inset-0 bg-[#1a1412]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                    <p className="text-[7px] text-[#d4af37] line-clamp-3 uppercase tracking-tighter">{item.prompt}</p>
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="col-span-3 text-[10px] text-[#4a3a34] italic text-center py-4 uppercase tracking-widest">Empty Archives</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#1a1412]/40 rounded-xl border border-[#3e2f2a] shadow-2xl overflow-hidden relative z-10">
        {!resultImage && !isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 border border-[#3e2f2a] rounded-full flex items-center justify-center mb-6 text-[#3e2f2a]">
              <i className="fas fa-palette text-4xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#d4af37] mb-2">The Unlimited Canvas</h3>
            <p className="text-[#a89080] max-w-sm mt-2 text-sm leading-relaxed">Describe a scene, a feeling, or a dream. Our engine will illustrate your thoughts with no limit on your creativity.</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-[#d4af37]/10 border-t-[#d4af37] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-feather text-[#d4af37] text-2xl animate-pulse"></i>
              </div>
            </div>
            <p className="mt-8 text-sm font-bold text-[#a89080] uppercase tracking-[0.3em] animate-pulse">Mixing Pigments...</p>
          </div>
        )}

        {resultImage && !isGenerating && (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex-1 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#3e2f2a] relative group bg-black/20">
              <img src={resultImage} alt="Generated" className="w-full h-full object-contain" />
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage;
                    link.download = `hyun-creation-${Date.now()}.png`;
                    link.click();
                  }}
                  className="p-3 bg-[#d4af37] text-[#1a1412] rounded-full hover:bg-[#c4a030] transition-colors shadow-2xl"
                  title="Archive Masterpiece"
                >
                  <i className="fas fa-download"></i>
                </button>
              </div>
            </div>
            <div className="mt-6 p-4 bg-[#120e0d] border border-[#3e2f2a] rounded-sm">
              <p className="text-[9px] text-[#6d5b50] font-bold uppercase tracking-widest mb-1">Subject Matter</p>
              <p className="text-sm text-[#e8dcc4] italic">{prompt}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
