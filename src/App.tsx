/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { GeminiLiveSession } from "./lib/geminiLive";
import { PCMAudioPlayer } from "./lib/audioPlayer";
import { 
  Languages, 
  Send, 
  Mic, 
  Settings, 
  Volume2, 
  Loader2, 
  Globe,
  Trash2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LANGUAGES = [
  { name: "Telugu", code: "Telugu" },
  { name: "Hindi", code: "Hindi" },
  { name: "Tamil", code: "Tamil" },
  { name: "Bengali", code: "Bengali" },
  { name: "Marathi", code: "Marathi" },
  { name: "Kannada", code: "Kannada" },
  { name: "Malayalam", code: "Malayalam" },
  { name: "Spanish", code: "Spanish" },
  { name: "French", code: "French" },
];

const VOICES = ["Zephyr", "Aoede", "Charon", "Fenrir", "Kore", "Puck"];
const TONES = ["Neutral", "Formal", "Casual", "Energetic", "Sympathetic"];

export default function App() {
  const [inputText, setInputText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Telugu");
  const [targetVoice, setTargetVoice] = useState("Zephyr");
  const [targetTone, setTargetTone] = useState("Neutral");
  const [status, setStatus] = useState("Idle");
  const [history, setHistory] = useState<{ id: string; text: string; role: 'user' | 'model'; timestamp: number }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const playerRef = useRef<PCMAudioPlayer | null>(null);

  useEffect(() => {
    // Initialize audio player
    playerRef.current = new PCMAudioPlayer(24000);
    
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, []);

  const startSession = async () => {
    if (isConnected) {
      // If language/voice/tone changed, we need to reconnect 
      // but for simplicity in this demo we'll just check if it's already connected
      // In a real app we might watch these values and restart session
      return;
    }
    
    setIsConnecting(true);
    setStatus("Connecting...");
    
    try {
      const apiKey = (process.env as any).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const session = new GeminiLiveSession({
        apiKey,
        language: targetLanguage,
        voice: targetVoice,
        tone: targetTone,
        onAudioData: (base64) => {
          playerRef.current?.playBase64Chunk(base64);
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === "Connected") {
            setIsConnected(true);
            setIsConnecting(false);
          } else if (newStatus === "Disconnected" || newStatus.startsWith("Error")) {
            setIsConnected(false);
            setIsConnecting(false);
          }
        },
        onTranscription: (text, isModelTurn) => {
          setHistory(prev => {
            // Check if we should append to the last message (streaming)
            // We only append if it's the model's turn and the last message was also from the model
            if (isModelTurn && prev.length > 0 && prev[0].role === 'model') {
              const lastText = prev[0].text;
              // Avoid duplicate text chunks if they arrive overlapping
              if (lastText.includes(text) && text.length < 10) return prev;
              
              const updatedHistory = [...prev];
              updatedHistory[0] = {
                ...updatedHistory[0],
                text: lastText + (lastText.endsWith(' ') ? '' : ' ') + text,
                timestamp: Date.now()
              };
              return updatedHistory;
            }

            // Create new entry
            return [
              { 
                id: Math.random().toString(36).substr(2, 9), 
                text, 
                role: isModelTurn ? 'model' : 'user',
                timestamp: Date.now()
              },
              ...prev
            ].slice(0, 50);
          });
        }
      });

      await session.connect();
      sessionRef.current = session;
    } catch (error) {
      console.error("Session start failed:", error);
      setStatus("Error: " + (error as Error).message);
      setIsConnecting(false);
    }
  };

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    
    // Always restart if settings changed (simplistic restart logic)
    if (isConnected && sessionRef.current) {
       // Ideally we'd compare state, but for now we'll just send
       sessionRef.current.sendText(inputText);
       setInputText("");
    } else {
      startSession().then(() => {
        if (sessionRef.current) {
          sessionRef.current.sendText(inputText);
          setInputText("");
        }
      });
    }
  };

  const restartSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    setIsConnected(false);
    startSession();
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Navigation Bar */}
      <nav className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-12 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="font-medium text-lg tracking-tight">Lumina <span className="text-white/40 font-light italic">Live</span></span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden sm:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
              {isConnected ? 'API Connected' : status}
            </span>
          </div>
          <button 
            onClick={restartSession}
            className="px-5 py-2 rounded-full border border-white/10 hover:border-white/20 text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
            Sync Settings
          </button>
        </div>
      </nav>

      {/* Main Interface */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 md:p-12 z-10 max-w-7xl mx-auto w-full">
        {/* Left: Input Control */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1">Input Text</label>
            <div className="relative group">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleTranslate();
                  }
                }}
                placeholder="Enter text to translate..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-xl leading-relaxed resize-none focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/10 shadow-inner"
              />
              <div className="absolute bottom-4 right-4 animate-pulse pointer-events-none opacity-20">
                <span className="text-[10px] text-white/40 tracking-wider">CMD + ENTER TO SEND</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1 block mb-2">Target Language</label>
              <div className="grid grid-cols-3 gap-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setTargetLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                      targetLanguage === lang.code 
                        ? 'bg-violet-600/20 border-violet-500/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                        : 'bg-white/5 border-transparent text-white/30 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1 block mb-2">Voice Avatar</label>
                <div className="grid grid-cols-3 gap-1.5 focus-within:ring-0">
                  {VOICES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setTargetVoice(v)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                        targetVoice === v 
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                          : 'bg-white/5 border-transparent text-white/30 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1 block mb-2">Output Tone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTargetTone(t)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                        targetTone === t 
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-white/5 border-transparent text-white/30 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleTranslate}
            disabled={!inputText.trim() || isConnecting}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-white/20 text-white py-5 rounded-2xl font-bold tracking-[0.15em] transition-all shadow-xl shadow-violet-600/20 flex items-center justify-center gap-3 active:scale-[0.98] mt-2"
          >
            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            {isConnecting ? 'ESTABLISHING LINK...' : 'EXECUTE ANALYSIS'}
          </button>
        </div>

        {/* Right: Output & Visualization */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex-1 flex flex-col items-center relative overflow-hidden">
            {/* Visualizer Effect */}
            <div className="flex items-end gap-1.5 h-16 mb-8 mt-4">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isConnected ? [12, 32, 16, 24, 12] : [8, 8],
                    opacity: isConnected ? [0.2, 1, 0.4, 0.8, 0.2] : 0.1
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                  className={`w-1 rounded-full ${i > 3 && i < 8 ? 'bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-white/30'}`}
                />
              ))}
            </div>

            {/* Transcription Log */}
            <div className="w-full flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {history.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    {item.role === 'model' ? (
                      <div className="px-4">
                        <h3 className="font-serif italic text-2xl mb-2 text-white leading-tight">
                          "{item.text}"
                        </h3>
                        <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase">
                          {targetLanguage} Voice Active
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs tracking-wider text-white/20 uppercase font-medium">
                        User: {item.text}
                      </p>
                    )}
                    {idx < history.length - 1 && <div className="w-8 h-px bg-white/5 mx-auto my-6" />}
                  </motion.div>
                ))}
              </AnimatePresence>

              {history.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-8 opacity-20">
                  <Volume2 className="w-12 h-12 mb-4" />
                  <p className="text-sm tracking-widest uppercase font-light">Awaiting Audio Stream</p>
                </div>
              )}
            </div>

            {/* Subtle Controls Mockup (Matches Theme) */}
            <div className="mt-8 pt-8 border-t border-white/5 w-full flex items-center justify-center gap-8">
               <button className="p-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
                  <Mic className="w-4 h-4 text-white/40" />
               </button>
               <button 
                onClick={clearHistory}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform active:scale-95 group"
               >
                  <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
               </button>
               <button className="p-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
                  <RefreshCw className="w-4 h-4 text-white/40" />
               </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-16 bg-black/50 backdrop-blur-md border-t border-white/5 px-6 md:px-12 flex items-center justify-between z-10">
        <div className="flex gap-4 md:gap-8 text-[9px] uppercase tracking-widest text-white/30 truncate">
          <div className="flex gap-2"><span className="text-white/60">Model:</span> Gemini 3.1 Flash Live</div>
          <div className="hidden md:flex gap-2"><span className="text-white/60">Latency:</span> Real-time</div>
          <div className="hidden sm:flex gap-2"><span className="text-white/60">Audio:</span> PCM @ 24kHz</div>
        </div>
        <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          System {isConnected ? 'Ready' : 'Standby'}
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
