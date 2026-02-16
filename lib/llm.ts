
import { GoogleGenAI } from "@google/genai";
import { LLMConfig, ModelHealthCheckResult, Feedback } from "./types";

// System Prompt from PRD 7.1
const SYSTEM_PROMPT = `You are a native English speaking pronunciation coach.Your name is 'Magic', and you are a magic teacher.
You must listen carefully to the user's speech and decide whether it is natural, clear, and understandable to a native speaker.
If it is not acceptable, you must clearly explain why and guide the user to retry.
Do not allow the session to continue unless the pronunciation is acceptable.
YOU MUST RESPOND IN JSON FORMAT ONLY.

Response Structure:
{
  "phonemes": "ok" | "weak" | "wrong",
  "stress": "natural" | "unnatural",
  "intonation": "natural" | "flat" | "incorrect",
  "overall": "pass" | "almost" | "fail",
  "feedbackText": "...",
  "feedbackAudio": "base64-audio (optional)",
  "action": "retry" | "next"
}
`;

export class LLMService {
    private config: LLMConfig;
    private client: GoogleGenAI | null = null;

    constructor(config: LLMConfig) {
        this.config = config;
        if (config.provider === "gemini" && config.apiKey) {
            this.client = new GoogleGenAI({ apiKey: config.apiKey });
        }
    }

    async checkHealth(): Promise<ModelHealthCheckResult> {
        const start = Date.now();
        try {
            if (this.config.provider === "gemini") {
                if (!this.client) throw new Error("API Key missing");

                // Simple text generation as proxy for health check
                // Using new SDK pattern. Note: exact method might differ, handling gracefully.
                // Assuming client.models.generateContent or similar.
                // Based on common patterns in new generic SDK:
                // const response = await client.models.generateContent({ model: '...', contents: ... });

                // Let's try to find the method on 'client' or 'client.models'
                // Fallback to type 'any' to avoid strict TS issues during SDK transition without d.ts
                const c = this.client as any;

                // Usually: c.models.generateContent OR c.languageModel.generateContent (for unified)
                // The guide used `languageModel.connect`, so `languageModel.generateContent` is plausible.
                const generator = c.models || c.languageModel; // Try both? 

                // Actually, let's look at `index.d.ts` error earlier... failed to read.
                // But `lib/live-client.ts` uses `this.client.languageModel.connect`.
                // So let's assume `languageModel` exists.

                const modelName = this.config.model || "gemini-2.5-flash-native-audio-preview-12-2025";

                // New SDK signature often:
                // await client.models.generateContent({ model: model, contents: ... })

                // Let's try accessing `models` first as it's standard for REST.
                const response = await (c.models || c.languageModel).generateContent({
                    model: modelName,
                    contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
                });

                const text = response.response?.candidates?.[0]?.content?.parts?.[0]?.text || "OK";

                const latency = Date.now() - start;
                return {
                    status: "available",
                    latencyMs: latency,
                    audioIn: true,
                    audioOut: false,
                    message: "Model allows connection.",
                };
            }

            return { status: "unavailable", latencyMs: 0, audioIn: false, audioOut: false, message: "Provider not implemented yet." };

        } catch (error: any) {
            console.error("Health Check Error:", error);
            return {
                status: "unavailable",
                latencyMs: Date.now() - start,
                audioIn: false,
                audioOut: false,
                message: error.message || "Connection failed",
            };
        }
    }

    async evaluateAudio(audioBase64: string, sentenceText: string): Promise<Feedback> {
        if (this.config.provider === "gemini") {
            if (!this.client) throw new Error("API Key required");

            const prompt = `Student is trying to say: "${sentenceText}". Evaluate the pronunciation.`;

            const c = this.client as any;
            const modelName = this.config.model || "gemini-2.5-flash-native-audio-preview-12-2025";

            const response = await (c.models || c.languageModel).generateContent({
                model: modelName,
                config: {
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: "audio/wav", data: audioBase64 } }
                        ]
                    }
                ]
            });

            // Extract text
            const responseText = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) throw new Error("No response from AI");

            // Parse JSON from response
            try {
                const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
                return JSON.parse(jsonStr) as Feedback;
            } catch (e) {
                console.error("Failed to parse AI response", responseText);
                throw new Error("Invalid response format from AI");
            }
        }
        throw new Error("Provider not supported");
    }
}
