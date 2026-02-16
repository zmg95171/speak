
export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    async start(): Promise<void> {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.start();
    }

    stop(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject("Recorder not initialized");
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" }); // or webm depending on browser support
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(",")[1];
                    resolve(base64String);
                };
                reader.onerror = reject;

                // Clean up stream
                this.stream?.getTracks().forEach(t => t.stop());
                this.stream = null;
            };

            this.mediaRecorder.stop();
        });
    }
}

export const playAudioBase64 = (base64String: string) => {
    const audio = new Audio("data:audio/wav;base64," + base64String);
    return audio.play();
};
