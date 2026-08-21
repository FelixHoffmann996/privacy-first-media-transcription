import express, { type NextFunction, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { decideCreatorDelivery } from "./creator_delivery.js";
import { InfraiTranscriber, type AudioFormat } from "./infrai_transcriber.js";

type Asset = {
  assetId: string;
  creatorId: string;
  format: AudioFormat;
  chunks: string[];
};

type ProcessingJob = {
  jobId: string;
  assetId: string;
  status: "processing" | "ready" | "needs_review";
  transcript?: string;
  reason?: string;
};

const assetSchema = z.object({
  assetId: z.string().min(1),
  creatorId: z.string().min(1),
  format: z.enum(["mp3", "wav"]),
});

const chunkSchema = z.object({
  sequence: z.number().int().nonnegative(),
  audioBase64: z.string().min(1),
});

const jobSchema = z.object({
  jobId: z.string().min(1),
  assetId: z.string().min(1),
});

const assets = new Map<string, Asset>();
const chunkSequences = new Map<string, Set<number>>();
const jobs = new Map<string, ProcessingJob>();

export function createTranscriptionService(transcriber = new InfraiTranscriber()) {
  const service = express();
  service.use(express.json({ limit: "30mb" }));

  service.post("/assets", (request, response) => {
    const input = assetSchema.parse(request.body);
    assets.set(input.assetId, { ...input, chunks: [] } as Asset);
    chunkSequences.set(input.assetId, new Set());
    response.status(201).json({ assetId: input.assetId, status: "ingesting" });
  });

  service.post("/assets/:assetId/chunks", (request, response) => {
    const input = chunkSchema.parse(request.body);
    const asset = assets.get(request.params.assetId);
    if (!asset) {
      response.status(404).json({ error: "asset_not_found" });
      return;
    }

    const seen = chunkSequences.get(asset.assetId) ?? new Set<number>();
    if (!seen.has(input.sequence)) {
      asset.chunks[input.sequence] = input.audioBase64;
      seen.add(input.sequence);
      chunkSequences.set(asset.assetId, seen);
    }
    response.status(202).json({ assetId: asset.assetId, acceptedSequence: input.sequence });
  });

  service.post("/transcription-jobs", async (request, response, next) => {
    try {
      const input = jobSchema.parse(request.body);
      const existing = jobs.get(input.jobId);
      if (existing) {
        response.json(existing);
        return;
      }

      const asset = assets.get(input.assetId);
      if (!asset || asset.chunks.length === 0) {
        response.status(422).json({ error: "audio_required" });
        return;
      }
      const orderedChunks = Array.from(
        { length: asset.chunks.length },
        (_value, index) => asset.chunks[index],
      );
      if (orderedChunks.some((chunk) => !chunk)) {
        response.status(422).json({ error: "audio_sequence_incomplete" });
        return;
      }

      const job: ProcessingJob = { ...input, status: "processing" } as ProcessingJob;
      jobs.set(input.jobId, job);
      const audioBase64 = Buffer.concat(
        orderedChunks.map((chunk) => Buffer.from(chunk!, "base64")),
      ).toString("base64");
      const transcript = await transcriber.transcribe({
        audioBase64,
        format: asset.format,
        idempotencyKey: input.jobId,
      });
      const decision = decideCreatorDelivery(transcript);
      Object.assign(job, { transcript, ...decision });
      response.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  service.get("/creator-deliveries/:jobId", (request, response) => {
    const job = jobs.get(request.params.jobId);
    if (!job) {
      response.status(404).json({ error: "job_not_found" });
      return;
    }
    response.json(job);
  });

  service.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "invalid_request", details: error.issues });
      return;
    }
    if (error instanceof OpenAI.APIError && error.status && error.status < 500) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : "request_failed";
    response.status(502).json({ error: message });
  });

  return service;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  createTranscriptionService().listen(port, () => {
    console.log(`Transcription service listening on http://localhost:${port}`);
  });
}
