
class AudioInputProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bytesWritten = 0;
    }

    process(inputs) {
        const input = inputs[0];
        const channel0 = input[0];

        if (!channel0) return true;

        for (let i = 0; i < channel0.length; i++) {
            this.buffer[this.bytesWritten++] = channel0[i];
            if (this.bytesWritten >= this.bufferSize) {
                this.port.postMessage(this.buffer);
                this.bytesWritten = 0;
            }
        }
        return true;
    }
}

registerProcessor("audio-input-processor", AudioInputProcessor);
