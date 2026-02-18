
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { SettingsModal } from "./components/SettingsModal";
import { PracticeScreen } from "./components/PracticeScreen";
import { Auth } from "./components/Auth";
import { AdminPanel } from "./components/AdminPanel";
import { LLMConfig, Sentence } from "./lib/types";
import { loadSettings, saveSettings } from "./lib/storage";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";

// Default content for fallback
const DEFAULT_TEXT = `I want to practice spoken English.
Could you please tell me how to get to the station?
I am currently working as a software engineer.
What do you recommend for dinner?
It was nice meeting you, have a great day.`;

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isGuest, setIsGuest] = useState(false);

  // Load Auth & Settings & Content
  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        if (!session) setLoading(false); // Stop loading if not logged in
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });

    const { configs, currentId } = loadSettings();
    const activeConfig = configs.find(c => c.id === currentId) || configs[0];
    setConfig(activeConfig);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session && !isGuest) return;

    setLoading(true);
    // Load sentences from content file
    const storedText = localStorage.getItem("practice_text");
    const isCustom = localStorage.getItem("practice_is_custom") === "true";
    const storedIndex = localStorage.getItem("practice_index");

    if (storedIndex) {
      setCurrentIndex(parseInt(storedIndex, 10));
    }

    // Always fetch latest practice.txt to check for updates
    fetch("/practice.txt")
      .then(res => res.ok ? res.text() : Promise.reject())
      .then(remoteText => {
        if (!isCustom || !storedText || storedText === DEFAULT_TEXT) {
          parseAndSetSentences(remoteText, false, false);
        } else {
          parseAndSetSentences(storedText, false, true);
        }
      })
      .catch(() => {
        parseAndSetSentences(storedText || DEFAULT_TEXT, false, isCustom);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session, isGuest]);

  const parseAndSetSentences = (text: string, resetIndex: boolean = true, markAsCustom: boolean = false) => {
    const lines = text.split("\n").filter(l => l.trim().length > 0);
    const parsed: Sentence[] = lines.map((line, idx) => ({
      id: idx + 1,
      text: line.trim(),
      status: "pending",
    }));
    setSentences(parsed);
    setEditText(text); // Sync editor
    localStorage.setItem("practice_text", text);
    localStorage.setItem("practice_is_custom", markAsCustom ? "true" : "false");
    if (resetIndex) {
      setCurrentIndex(0);
      localStorage.setItem("practice_index", "0");
    }
  };

  const handleSaveSettings = (newConfig: LLMConfig) => {
    const { configs } = loadSettings();
    // Assuming configs has default, we might need to update or add.
    // Simplifying: if exists update, else add.
    const exists = configs.find(c => c.id === newConfig.id);
    let updatedConfigs = configs;
    if (exists) {
      updatedConfigs = configs.map(c => c.id === newConfig.id ? newConfig : c);
    } else {
      updatedConfigs = [...configs, newConfig];
    }
    saveSettings(updatedConfigs, newConfig.id);
    setConfig(newConfig);
  };

  const handleSaveContent = () => {
    if (confirm("Saving will reset your progress. Continue?")) {
      parseAndSetSentences(editText, true, true);
      setIsEditing(false);
    }
  };

  const handleSentencePass = (sentenceId: number) => {
    // Mark as passed (optional, since we just move index)
    setSentences(prev => prev.map(s => s.id === sentenceId ? { ...s, status: "pass" } : s));

    if (currentIndex + 1 < sentences.length) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      localStorage.setItem("practice_index", nextIndex.toString());
    } else {
      // Complete
      alert("Congratulations! You completed all sentences.");
      // Maybe reset?
    }
  };

  if (loading || !config) return <div className="p-10 text-white">Loading...</div>;

  if (!session && !isGuest) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Auth onGuestLogin={() => setIsGuest(true)} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar (PRD Section 2) */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur z-20">
        <div className="flex gap-4">
          <button onClick={() => setIsSettingsOpen(true)} className="text-xl p-2 hover:bg-slate-800 rounded-lg" title="Settings">⚙️</button>
          <button
            onClick={() => {
              if (!session) {
                if (confirm("Guest users cannot edit content. Would you like to register to save your own lessons?")) {
                  setIsGuest(false);
                }
              } else {
                setIsEditing(true);
              }
            }}
            className="text-xl p-2 hover:bg-slate-800 rounded-lg"
            title={session ? "Edit Content" : "Edit Content (Login Required)"}
          >
            ✏️
          </button>
          <button
            onClick={() => {
              supabase.auth.signOut();
              setIsGuest(false);
            }}
            className="text-xl p-2 hover:bg-slate-800 rounded-lg"
            title={session ? "Logout" : "Login"}
          >
            {session ? "🚪" : "👤"}
          </button>
        </div>
        <div
          className="font-bold flex items-center gap-2 cursor-pointer select-none"
          onDoubleClick={() => setIsAdminOpen(true)}
          title="Magic Hall"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Spoken Practice {isGuest && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 ml-2">Guest</span>}
        </div>
        <a href="https://github.com/zmg95171/speak" target="_blank" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="GitHub Help">
          <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true" fill="currentColor">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <PracticeScreen
          config={config}
          sentences={sentences}
          currentIndex={currentIndex}
          onSentencePass={handleSentencePass}
          onComplete={() => alert("All Done!")}
        />
      </main>

      {/* Admin Panel */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveSettings}
      />

      {/* Simple Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900 p-4 flex flex-col animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Edit Practice Content</h2>
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400">Cancel</button>
          </div>
          <textarea
            className="flex-1 bg-slate-800 p-4 rounded-xl text-lg leading-relaxed focus:ring-2 ring-blue-500 outline-none resize-none font-mono"
            value={editText}
            onChange={e => setEditText(e.target.value)}
          />
          <button
            onClick={handleSaveContent}
            className="mt-4 w-full py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg"
          >
            Save & Restart
          </button>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);