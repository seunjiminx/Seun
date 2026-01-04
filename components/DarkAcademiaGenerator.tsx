
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const DARK_ACADEMIA_PROMPTS = [
  "A secret societies meeting in a candlelit mahogany room",
  "Old scrolls floating in a flooded gothic library",
  "A raven perched on a stack of ancient leather-bound books",
  "A misty morning at an ivy-covered university courtyard",
  "An alchemist's desk with vintage vials and astronomical maps"
];

const DarkAcademiaGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleGenerate = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt || prompt;
    if (!finalPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setResultImage(null);

    // Dark Academia aesthetic augmentation
    const augmentedPrompt = `${finalPrompt}, dark academia aesthetic, moody lighting, vintage scholarly atmosphere, classical oil painting texture, deep browns and burgundies, gold accents, historical drama style, hyper-detailed, melancholic beauty`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: augmentedPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4" // Classic portrait ratio
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        alert("The library is closed. No image returned.");
      }
    } catch (error) {
      console.error("Dark Academia Gen Error:", error);
      alert("The ink has run dry. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1412] dark-academia-font overflow-hidden relative">
      <style>{`
        @keyframes manifestFromArchives {
          0% {
            filter: blur(20px) sepia(1) brightness(0.3) contrast(1.2);
            opacity: 0;
            transform: scale(1.1);
          }
          40% {
            filter: blur(8px) sepia(0.6) brightness(0.6) contrast(1.1);
            opacity: 0.4;
          }
          100% {
            filter: blur(0) sepia(0) brightness(1) contrast(1);
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-manifest {
          animation: manifestFromArchives 4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .parchment-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.8), inset 0 0 20px rgba(212,175,55,0.1);
          pointer-events: none;
        }
      `}</style>
      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
      
      <div className="flex-1 flex flex-col lg:flex-row p-8 gap-8 relative z-10">
        {/* Left Side: Scholarly Input */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-serif text-[#d4af37] italic">Scholarly Art</h2>
            <p className="text-[#a89080] text-sm uppercase tracking-widest font-sans">Dark Academia Creation</p>
          </div>

          <div className="bg-[#2a1f1b] border border-[#3e2f2a] rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-6">
            <div>
              <label className="block text-[#a89080] text-xs font-bold uppercase mb-3">Compose Your Vision</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your vision here... e.g. 'A lonely scholar by candlelight'"
                className="w-full bg-[#1a1412] border border-[#3e2f2a] rounded p-4 h-32 focus:outline-none focus:border-[#d4af37] text-[#e8dcc4] italic transition-colors resize-none placeholder:text-[#4a3a34]"
              />
            </div>

            <div>
              <label className="block text-[#a89080] text-[10px] font-bold uppercase mb-3 tracking-widest">Inspiration from the Archives</label>
              <div className="flex flex-wrap gap-2">
                {DARK_ACADEMIA_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(p);
                      handleGenerate(p);
                    }}
                    className="text-[10px] text-[#6d5b50] hover:text-[#d4af37] border border-[#3e2f2a] hover:border-[#d4af37]/40 px-3 py-1.5 rounded-sm bg-[#1a1412]/50 transition-all text-left italic leading-tight"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-[#a89080]">
                <span>Aesthetic Tuning</span>
                <span className="text-[#d4af37]">Classical / Moody</span>
              </div>
              <div className="h-[1px] bg-[#3e2f2a]"></div>
              <div className="flex items-center justify-between text-xs text-[#a89080]">
                <span>Canvas Type</span>
                <span className="text-[#d4af37]">3:4 Portrait</span>
              </div>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating}
              className={`w-full py-4 bg-[#d4af37] text-[#1a1412] font-bold uppercase tracking-widest rounded-sm transition-all shadow-[0_5px_15px_rgba(212,175,55,0.2)] hover:bg-[#c4a030] active:scale-[0.98] disabled:opacity-30 ${
                isGenerating ? 'animate-pulse' : ''
              }`}
            >
              {isGenerating ? 'Mixing Pigments...' : 'Envision Art'}
            </button>
          </div>

          <div className="mt-auto border-l-2 border-[#3e2f2a] pl-6 py-4">
            <p className="text-[#6d5b50] text-sm italic leading-relaxed">
              "To define is to limit." — Oscar Wilde
            </p>
          </div>
        </div>

        {/* Right Side: The Gallery Canvas */}
        <div className="flex-1 glass-morphism rounded-lg border border-[#3e2f2a] bg-[#1a1412]/60 overflow-hidden flex flex-col shadow-2xl relative group">
          {!resultImage && !isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 border border-[#3e2f2a] rounded-full flex items-center justify-center mb-6 text-[#3e2f2a]">
                <i className="fas fa-quill-pen text-3xl"></i>
              </div>
              <h3 className="text-2xl text-[#d4af37] font-serif">Awaiting the Muse</h3>
              <p className="text-[#6d5b50] text-sm mt-2 max-w-xs font-serif italic">The canvas is blank, the candles are lit. What story shall we paint tonight?</p>
            </div>
          )}

          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-24 h-24 border-2 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin"></div>
              </div>
              <p className="mt-8 text-xl text-[#d4af37] font-serif italic animate-pulse tracking-widest">Envisioning...</p>
            </div>
          )}

          {resultImage && !isGenerating && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#0d0a09] overflow-hidden">
              <div className="relative group max-h-full overflow-hidden rounded parchment-glow">
                <img 
                  src={resultImage} 
                  alt="Scholarly Masterpiece" 
                  className="max-h-[70vh] rounded shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[12px] border-[#2a1f1b] ring-1 ring-[#d4af37]/30 animate-manifest" 
                />
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage;
                    link.download = 'seun-scholarly-art.png';
                    link.click();
                  }}
                  className="absolute bottom-6 right-6 p-4 bg-[#d4af37] text-[#1a1412] rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                >
                  <i className="fas fa-download"></i>
                </button>
              </div>
              <p className="mt-6 text-[#a89080] text-xs uppercase tracking-widest">Rendered via Seun Dark Academia Engine</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DarkAcademiaGenerator;
