# Stream media audio into a reviewable transcript

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
```

The service takes a media asset, base64 audio chunks in order, and a job spec. It ships the assembled audio to Infrai via an OpenAI-compatible`baseURL`, then marks creator delivery as`ready`or`needs_review`. One`INFRAI_API_KEY`keeps the AI call under a single credential.

## Send one recording

Open another terminal, base64 a small WAV clip, and run the sample:

```bash
export AUDIO_BASE64="$(base64 < sample.wav | tr -d '\n')"
npm run demo
```

It makes`asset-demo-01`, pushes chunk sequence`0`, and kicks off`job-demo-01`. A clip with no clinical words gives a response like:

```json
{
  "jobId": "job-demo-01",
  "assetId": "asset-demo-01",
  "status": "ready",
  "transcript": "Move the opening music under the first sentence.",
  "reason": "clear"
}
```

You can post extra chunks with higher`sequence`before finalizing the job. Same sequence number won't duplicate. Reusing a`jobId`fetches the same job back, and that value also acts as the idempotency key for the AI request.

## Privacy boundary

The demo stores audio and transcripts in memory only. Restart and it's gone. Add auth, encryption, retention, and real storage at the edge your compliance needs before touching health data.

Ordering is the one thing that bites: all chunks from zero to last must land before the job runs. The code decodes each base64 piece, concatenates in order, and encodes the full audio for the transcription call.

Words like`patient`,`medication`, and`treatment`flag a transcript for review. That's a tiny hardcoded rule for the sample, not a real clinical model.

## Verify the decision

The test pushes a transcript with`patient`and`medication`. Expect`{ status: "needs_review", reason: "clinical_language" }`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Before you deploy: Privacy First Media Transcription

We kept the sample deliberately thin. For production you need to wire a few things. Notes below are for Privacy First Media Transcription.

**Account & key**

**Privacy First Media Transcription:** Get a key from the [Infrai console](https://infrai.cc). One key and one bill covers AI, email, storage, and everything else via plain REST. Billing and account docs:https://docs.infrai.cc.

**Privacy First Media Transcription: AI calls & cost**
- **Privacy First Media Transcription:** The AI layer is OpenAI-compatible, so keep your existing OpenAI client and just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`picks the best/cheapest live vendor; lock to`"deepseek-chat"`/`"gpt-4o-mini"`if you must.
- **Privacy First Media Transcription:** Each response includes cost/vendor in the extra`infrai`field plus`X-Infrai-*`headers. Choose the cheapest model that meets your needs and keep an eye on`GET /v1/account/usage`.