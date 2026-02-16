
export interface LLMConfig {
  id: string;
  provider: "openai" | "azure" | "local" | "gemini" | "custom";
  endpoint?: string;
  apiKey: string;
  model: string;
  supportsAudioIn: boolean;
  supportsAudioOut: boolean;
  maxLatencyMs?: number;
}

export interface Sentence {
  id: number;
  text: string;
  status: "pending" | "pass" | "fail";
}

export interface SessionState {
  currentSentenceIndex: number;
  attempts: number;
  passedSentences: number[]; // IDs
  modelConfigId: string;
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  feedback?: Feedback;
}

export interface Feedback {
  phonemes: "ok" | "weak" | "wrong";
  stress: "natural" | "unnatural";
  intonation: "natural" | "flat" | "incorrect";
  overall: "pass" | "almost" | "fail";
  feedbackText: string;
  feedbackAudio?: string; // base64
  action: "retry" | "next";
}

export interface ModelHealthCheckResult {
  status: "available" | "unavailable";
  latencyMs: number;
  audioIn: boolean;
  audioOut: boolean;
  message: string;
}
