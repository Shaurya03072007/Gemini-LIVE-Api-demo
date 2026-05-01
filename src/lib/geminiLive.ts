import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export interface LiveSessionOptions {
  apiKey: string;
  language: string;
  voice?: string;
  tone?: string;
  onAudioData: (base64Audio: string) => void;
  onStatusChange: (status: string) => void;
  onTranscription?: (text: string, isModelTurn: boolean) => void;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: any; 
  private options: LiveSessionOptions;

  constructor(options: LiveSessionOptions) {
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.options = options;
  }

  async connect() {
    this.options.onStatusChange("Connecting...");

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.options.onStatusChange("Connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.options.onAudioData(base64Audio);
            }

            // Handle transcription
            if (this.options.onTranscription) {
              const serverContent = message.serverContent as any;
              
              // Model transcription (when enabled via outputAudioTranscription)
              const modelTranscription = serverContent?.modelTurn?.parts?.[0]?.text;
              if (modelTranscription) {
                this.options.onTranscription(modelTranscription, true);
              }

              // User transcription (when enabled via inputAudioTranscription)
              const userTranscription = serverContent?.userTurn?.parts?.[0]?.text;
              if (userTranscription) {
                this.options.onTranscription(userTranscription, false);
              }
            }

            if (message.serverContent?.interrupted) {
              this.options.onStatusChange("Interrupted");
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            this.options.onStatusChange("Error: " + (err.message || "Network error"));
          },
          onclose: () => {
            this.options.onStatusChange("Disconnected");
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.options.voice || "Zephyr" } },
          },
          systemInstruction: `You are a professional broadcast news analyst and reporter. 
          Your task is to provide a sophisticated analysis and insightful professional description of the information or context provided, similar to a high-end news channel report.
          Respond strictly in ${this.options.language}. 
          Maintain an ${this.options.tone || 'Neutral'} professional tone. 
          Be articulate, authoritative, and engaging.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });
    } catch (error) {
      console.error("Connection failed:", error);
      this.options.onStatusChange("Connection failed");
      throw error;
    }
  }

  sendText(text: string) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      text: text,
    });
  }

  close() {
    if (this.session) {
      this.session.close();
    }
  }
}
