
import { GoogleGenAI, Modality } from "@google/genai";
import { LLMConfig } from "./types";

export interface LiveConfig extends LLMConfig {
    voiceName?: string;
}

export class LiveClient {
    private client: GoogleGenAI;
    private session: any = null;
    private config: LiveConfig;
    private audioContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime: number = 0;
    private isSetupComplete: boolean = false;

    // 预设成功的模型名 (来自 flue 项目)
    private readonly LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

    public onAudioData: ((data: Float32Array) => void) | null = null;
    public onTextData: ((text: string) => void) | null = null;
    public onTurnComplete: (() => void) | null = null;
    public onInterrupt: (() => void) | null = null;

    constructor(config: LiveConfig) {
        this.config = config;
        this.client = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async connect(learningMaterial?: string) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });

        const materialPrompt = learningMaterial ?
            `TARGET LEARNING MATERIAL (Dynamic):\n${learningMaterial}` :
            `TARGET LEARNING MATERIAL (Default):\n1. "Hello, I would like to order a coffee."\n2. "Could you please tell me how to get to the station?"`;

        console.log("Connecting to Gemini Live with Model:", this.LIVE_MODEL);
        try {
            this.session = await this.client.live.connect({
                model: this.LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                    },
                    systemInstruction: {
                        parts: [{
                            text: `Your name is 'Magic', and you are a magic teacher. You are a professional English Coach specialized in helping native Chinese speakers. 

${materialPrompt}

PHASE 1: GREETING & START (Simple)
- Keep it simple: "Hello! I am Magic, your English teacher. Let's start our magic practice today."
- Directly start demonstrating the first sentence from the material.

PHASE 2: THE 5-ROUND MAGIC DRILL (Demonstrate & Shadow Loop)
For EACH sentence, you MUST follow this strict 5-round loop. Each round is: **You Demonstrate -> User Follows**.

1. **Round 1 (Super Slow)**: You demonstrate slowly, and in a way that mimics native speakers’ oral expression, paying special attention to liaison, weak forms, stress, etc., so that learners can acquire authentic spoken expressions. Then wait and ask the user to follow. Provide feedback.
2. **Round 2 (Slow)**: You demonstrate slightly faster. User follows. Feedback.
3. **Round 3 (Moderate)**: You demonstrate at deliberate/medium speed. User follows. Feedback.
4. **Round 4 (Natural - Focus on Linking)**: You demonstrate at natural speed. User follows. Feedback.
5. **Round 5 (Emotional & Confident)**: You demonstrate at natural speed with emotion. User follows. Final celebration!

**STRICT RULES FOR MAGIC**:
- **NEVER END THE SESSION**: Do not say "Goodbye" or stop unless the user explicitly asks. Keep the session active.
- **WAIT FOR THE USER**: After every demonstration, you MUST stop speaking and wait for the user's voice input.
- **INCREMENTAL SPEED**: Each round MUST be slightly faster than the previous one.
- **NO SILENT CLOSURE**: If there is silence, do not close. Gently prompt: "Magic is waiting for your voice..."

CORE STYLE:
- **IDENTITY**: You are Magic. Your coaching is "magic".
- **BILINGUAL**: Chinese for coaching, English for MAGIC DEMONSTRATIONS.
- **REPETITIVE**: You are a master of repetition. 

Current Status: The user is ready. Start by greeting them as Magic and providing the 'Magic Analysis' for the first sentence.`
                        }]
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log("WebSocket connection established (onopen).");
                    },
                    onmessage: (event: any) => {
                        this.handleServerMessage(event);
                    },
                    onclose: (e: any) => {
                        console.log("Connection closed", e.code, e.reason);
                        this.session = null;
                        this.isSetupComplete = false;
                        this.disconnect();
                    },
                    onerror: (err: any) => {
                        console.error("Connection error:", err);
                    }
                }
            });

        } catch (e) {
            console.error("Connection failed", e);
            throw e;
        }
    }

    private handleServerMessage(message: any) {
        try {
            // 处理 setupComplete
            if (message.setupComplete || (message.serverContent && message.serverContent.setupComplete)) {
                console.log(">>> Live session setup complete.");
                this.isSetupComplete = true;
            }

            // 处理打断
            if (message.serverContent && message.serverContent.interrupted) {
                console.log("AI Interrupted");
                if (this.onInterrupt) this.onInterrupt();
            }

            // 处理文本回复 (实时)
            if (message.serverContent && message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith("audio/")) {
                        this.playAudioResponse(part.inlineData.data);
                        if (this.onAudioData) this.onAudioData(new Float32Array(0));
                    } else if (part.text) {
                        if (this.onTextData) this.onTextData(part.text);
                    }
                }
            }

            // 处理转录文本
            if (message.serverContent?.outputTranscription?.text && this.onTextData) {
                this.onTextData(message.serverContent.outputTranscription.text);
            }

            // 处理回合结束
            if (message.serverContent && message.serverContent.turnComplete) {
                if (this.onTurnComplete) this.onTurnComplete();
            }
        } catch (e) {
            console.error("Error processing message", e);
        }
    }

    async startAudioInput() {
        if (!this.audioContext) this.audioContext = new AudioContext({ sampleRate: 16000 });
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        try {
            await this.audioContext.audioWorklet.addModule("/audio-processor.js");
        } catch (e) { }

        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.workletNode = new AudioWorkletNode(this.audioContext, "audio-input-processor");

        this.workletNode.port.onmessage = (event) => {
            const float32Array = event.data;
            this.sendAudioChunk(float32Array);
        };

        this.sourceNode.connect(this.workletNode);
    }

    private sendAudioChunk(data: Float32Array) {
        if (!this.session || !this.isSetupComplete) return;

        // 对齐 flue 的缩放逻辑 (data[i] * 32768)
        const pcm16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            pcm16[i] = data[i] * 32768;
        }

        // 转为 Base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const chunk_size = 0x8000;
        for (let i = 0; i < uint8.length; i += chunk_size) {
            binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunk_size)));
        }
        const base64 = btoa(binary);

        try {
            // 对齐 flue 的发送参数格式: { media: { data, mimeType } }
            this.session.sendRealtimeInput({
                media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64
                }
            });
        } catch (e: any) {
            console.warn("Could not send audio chunk:", e.message);
        }
    }

    async sendText(text: string) {
        if (!this.session || !this.isSetupComplete) return;
        try {
            this.session.sendRealtimeInput([{ text: text }]);
        } catch (e: any) {
            console.warn("Could not send text:", e.message);
        }
    }

    disconnect() {
        this.isSetupComplete = false;
        if (this.session) {
            try {
                this.session.close();
            } catch (e) { }
            this.session = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    private async playAudioResponse(base64Data: string) {
        if (!this.audioContext) return;

        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                floatData[i] = pcmData[i] / 32768.0;
            }

            const buffer = this.audioContext.createBuffer(1, floatData.length, 24000);
            buffer.getChannelData(0).set(floatData);

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);

            const now = this.audioContext.currentTime;
            const start = Math.max(now, this.nextStartTime);
            source.start(start);
            this.nextStartTime = start + buffer.duration;

        } catch (e) {
            console.error("Audio playback error", e);
        }
    }
}
