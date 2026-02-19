
import React, { useState, useEffect, useRef } from "react";
import { LLMConfig, Sentence } from "../lib/types"; // Feedback type unused for now in Live mode
import { LiveClient } from "../lib/live-client";

interface PracticeScreenProps {
    config: LLMConfig;
    sentences: Sentence[];
    currentIndex: number;
    onSentencePass: (sentenceId: number) => void;
    onRestart: () => void;
    onPrevSentence: () => void;
    onComplete: () => void;
}

type Step = "idle" | "connecting" | "connected" | "listening" | "speaking" | "error";

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
    config,
    sentences,
    currentIndex,
    onSentencePass,
    onRestart,
    onPrevSentence,
    onComplete,
}) => {
    const [step, setStep] = useState<Step>("idle");
    const [statusText, setStatusText] = useState("Ready to practice");
    const [aiResponse, setAiResponse] = useState<string>("");

    // Use ref for client to persist across renders
    const client = useRef<LiveClient | null>(null);
    const currentSentence = sentences[currentIndex];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (client.current) {
                client.current.disconnect();
            }
        };
    }, []);

    // Removed auto-connect on mount to satisfy browser user-gesture policy for AudioContext
    useEffect(() => {
        // We now wait for the "Start Practice" button click
    }, [config, sentences]);

    const handleConnect = async () => {
        if (client.current) return;
        setStep("connecting");
        setStatusText("Waking up your English coach...");
        try {
            client.current = new LiveClient(config);

            // Setup callbacks
            client.current.onTextData = (text) => {
                setAiResponse(prev => {
                    const newText = prev + text;
                    // Keep only last 500 characters to prevent overflow and simplify
                    return newText.length > 500 ? "..." + newText.slice(-500) : newText;
                });
            };

            client.current.onAudioData = () => {
                setStep("listening"); // AI is speaking
                setStatusText("AI Coach is speaking...");
            };

            client.current.onTurnComplete = () => {
                setStep("speaking"); // User's turn
                setStatusText("Your turn. Speak now.");
            };

            const material = sentences.map(s => `${s.id}. "${s.text}"`).join("\n");
            await client.current.connect(material);

            // Auto-start audio immediately
            await client.current.startAudioInput();
            setStep("speaking");
            setStatusText("Coach is online. Follow the guide!");

        } catch (e: any) {
            console.error(e);
            setStep("error");
            setStatusText("Coach is resting. Retrying soon...");
            // Simple retry logic after 5s if it was a connection error
            setTimeout(() => setStep("idle"), 5000);
        }
    };

    const handleStopSession = () => {
        if (client.current) {
            client.current.disconnect();
            client.current = null;
        }
        setStep("idle");
        onRestart(); // Call parent to reset index
    };

    const handleNextSentence = () => {
        onSentencePass(currentSentence.id);
        setAiResponse("");
        setStatusText("Next sentence ready.");
    };

    if (!currentSentence) return <div className="p-10 text-center text-white">No sentences found.</div>;

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white p-6 items-center justify-center space-y-8">

            {/* Header / Status */}
            <div className="absolute top-16 left-0 right-0 px-6 flex justify-between text-slate-400 text-sm">
                <span>Sentence {currentIndex + 1} / {sentences.length}</span>
                <span className={`uppercase font-bold ${step === "connected" || step === "speaking" ? "text-green-500" : "text-slate-500"}`}>
                    {step}
                </span>
            </div>

            {/* Sentence Display */}
            <div className="text-center space-y-6 max-w-lg">
                <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">
                    {currentSentence.text}
                </h1>

                {/* AI Response Text (Subtitle) - Fixed height rolling window */}
                <div
                    className="h-[200px] overflow-y-auto text-lg font-medium text-indigo-300 p-4 bg-slate-800/80 rounded-xl border border-slate-700 shadow-inner custom-scrollbar"
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                >
                    {aiResponse || <span className="text-slate-600 italic">Follow my lead, I'll guide you through the sentences...</span>}
                </div>

                <div className="text-slate-400 text-sm">{statusText}</div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-xs space-y-4">
                {step === "idle" && (
                    <button
                        onClick={handleConnect}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-2xl font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
                    >
                        🚀 Start Practice
                    </button>
                )}

                {step === "error" ? (
                    <button
                        onClick={handleConnect}
                        className="w-full py-4 bg-red-600 rounded-full text-xl font-bold animate-pulse"
                    >
                        Coach Resting - Tap to Wake
                    </button>
                ) : (
                    <>
                        {step === "connecting" && (
                            <div className="w-full py-6 text-center text-blue-400 font-bold animate-pulse text-xl">
                                ⏳ Calling Mentor...
                            </div>
                        )}

                        {(step === "speaking" || step === "listening") && (
                            <div className="w-full flex flex-col gap-4">
                                <div className={`w-full py-6 rounded-full text-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all duration-500 ${step === "speaking"
                                    ? "bg-green-600 shadow-green-500/30 scale-105"
                                    : "bg-indigo-600/50 shadow-indigo-500/20"
                                    }`}>
                                    {step === "speaking" ? "🎙 Coach is Listening" : "🔊 Coach is Speaking"}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleStopSession}
                                        className="flex-1 py-3 bg-slate-800 rounded-full text-sm font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                                    >
                                        Restart
                                    </button>
                                    {currentIndex > 0 && (
                                        <button
                                            onClick={onPrevSentence}
                                            className="flex-1 py-3 bg-slate-800 rounded-full text-sm font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                                        >
                                            ⬅ Prev
                                        </button>
                                    )}
                                    <button
                                        onClick={handleNextSentence}
                                        className="flex-1 py-3 bg-blue-600/80 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors"
                                    >
                                        Next ➡
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
};
