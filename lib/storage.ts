
import { LLMConfig } from "./types";

const SETTINGS_KEY = "spoken_english_settings";
const SESSION_KEY = "spoken_english_session";

export const DEFAULT_CONFIG: LLMConfig = {
    id: "default-gemini",
    provider: "gemini",
    apiKey: process.env.API_KEY || "", // User must provide this or use env variable
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    supportsAudioIn: true,
    supportsAudioOut: true, // Now supported via WebSocket/Audio output
};

export const saveSettings = (configs: LLMConfig[], currentId: string) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ configs, currentId }));
};

export const loadSettings = (): { configs: LLMConfig[]; currentId: string } => {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
        const settings = JSON.parse(data);
        // Ensure that if the current config has an empty API key, we fallback to our build-time env variable
        settings.configs = settings.configs.map((c: LLMConfig) => {
            if (c.provider === "gemini" && !c.apiKey && DEFAULT_CONFIG.apiKey) {
                return { ...c, apiKey: DEFAULT_CONFIG.apiKey };
            }
            return c;
        });
        return settings;
    }
    return { configs: [DEFAULT_CONFIG], currentId: DEFAULT_CONFIG.id };
};

export const saveSession = (state: any) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
};

export const loadSession = () => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
};
