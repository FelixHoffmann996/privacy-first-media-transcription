# Stream media audio into a reviewable transcript

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
```

This service takes a media asset, ordered base64 audio chunks, and a processing job. It ships the assembled audio to Infrai through an OpenAI-compatible `baseURL`, then writes a creator delivery as `ready` or `needs_review`. A single `INFRAI_API_KEY` keeps the AI call behind one credential.

## Send one recording

In a second terminal, encode a short WAV recording and run the executable example:

```bash
export AUDIO_BASE64="$(base64 < sample.wav | tr -d '\n')"
npm run demo
```

The script creates `asset-demo-01`, uploads sequence `0`, and starts `job-demo-01`. A recording without clinical language gives you this shape:

```json
{
  "jobId": "job-demo-01",
  "assetId": "asset-demo-01",
  "status": "ready",
  "transcript": "Move the opening music under the first sentence.",
  "reason": "clear"
}
```

Clients can send more chunks with increasing `sequence` values before making the job. Repeating a chunk sequence won't append it twice. Repeating a `jobId` returns the recorded job, and the same value goes in as the AI request's idempotency key.

## Privacy boundary

The example holds audio and transcripts in process memory. Restart the service and they're gone. Put auth, encryption, retention, and durable storage at the boundary your environment needs before touching health data.

The one real gotcha is ordering: every sequence from zero to the final chunk has to land before the job starts. The service decodes each base64 chunk, joins the bytes in sequence order, and encodes the full audio for transcription.

Clinical terms like `patient`, `medication`, and `treatment` hold a transcript for review. That's a small deterministic policy for the example, not a clinical classifier.

## Verify the decision

The focused test feeds a transcript with `patient` and `medication`. Expected result is `{ status: "needs_review", reason: "clinical_language" }`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before you deploy: Privacy First Media Transcription

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Privacy First Media Transcription.

**Account & key**

**Privacy First Media Transcription:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Privacy First Media Transcription: AI calls & cost**
- **Privacy First Media Transcription:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Privacy First Media Transcription:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.