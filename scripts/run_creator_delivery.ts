import { readFile } from "node:fs/promises";

const base = process.env.MEDIA_SERVICE_URL ?? "http://localhost:3000";
const audioBase64 = (await readFile("sample.wav")).toString("base64");

async function request(path: string, init: RequestInit) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

await request("/assets", {
  method: "POST",
  body: JSON.stringify({ assetId: "asset-demo-01", creatorId: "creator-demo-01", format: "wav" }),
});
await request("/assets/asset-demo-01/chunks", {
  method: "POST",
  body: JSON.stringify({ sequence: 0, audioBase64 }),
});
await request("/transcription-jobs", {
  method: "POST",
  body: JSON.stringify({ jobId: "job-demo-01", assetId: "asset-demo-01" }),
});

const delivery = await request("/creator-deliveries/job-demo-01", { method: "GET" });
console.log(JSON.stringify(delivery, null, 2));
export {};
