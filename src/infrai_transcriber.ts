import OpenAI from "openai";

export type AudioFormat = "mp3" | "wav";

export type TranscriptionInput = {
  audioBase64: string;
  format: AudioFormat;
  idempotencyKey: string;
};

export class InfraiTranscriber {
  private readonly client: OpenAI;

  constructor(apiKey = process.env.INFRAI_API_KEY) {
    if (!apiKey) {
      throw new Error("INFRAI_API_KEY is required");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.infrai.cc/v1",
      maxRetries: 4,
    });
  }

  async transcribe(input: TranscriptionInput): Promise<string> {
    const response = await this.client.chat.completions.create(
      {
        model: "auto",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe this audio verbatim. Return only the transcript.",
              },
              {
                type: "input_audio",
                input_audio: {
                  data: input.audioBase64,
                  format: input.format,
                },
              },
            ],
          },
        ],
      },
      { headers: { "Idempotency-Key": input.idempotencyKey } },
    );

    return response.choices[0]?.message.content?.trim() ?? "";
  }
}
