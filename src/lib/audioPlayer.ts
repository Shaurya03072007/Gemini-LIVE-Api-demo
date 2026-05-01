/**
 * A simple PCM audio player for the Gemini Live API.
 * The API returns 16-bit PCM at 24kHz.
 */
export class PCMAudioPlayer {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new AudioContext({ sampleRate });
    this.sampleRate = sampleRate;
  }

  async playBase64Chunk(base64Data: string) {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit PCM (Int16) to Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create an audio buffer
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    // Create a source node
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback for gapless audio
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  stop() {
    this.nextStartTime = 0;
    // We could close the context, but better to just stop scheduling
  }

  async resume() {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }
}
