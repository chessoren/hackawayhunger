# Count Me In

**Every hour counts. So do you.** — Hack Away Hunger 2026 (dsmHack × Corteva Agriscience)

Count Me In turns volunteering into verified hours so Iowans facing SNAP's new 80-hour work rule keep their food assistance, while food pantries gain the regular volunteers they need.

- **Live app:** https://count-me-in-iowa.netlify.app (bring your own Claude or OpenAI key — temporary for judging)
- **Live demo stage:** https://count-me-in-iowa.netlify.app/stage
- **Verify an attestation:** https://count-me-in-iowa.netlify.app/verify
- **Submission materials:** [`submission/`](submission/) — essay, 15 slides (3:2), demo video, submission PDF, Devpost fields

## What's inside

| Path | What it is |
|---|---|
| `rules/iowa.yaml` | The Iowa rules file: one YAML per state, readable by a non-developer, with cited sources |
| `src/core/rules.ts` | Deterministic eligibility evaluator (the AI never decides) |
| `src/core/agent.ts` | Channel-agnostic SMS/voice/web agent (state machine + AI understanding + translation) |
| `src/core/llm.ts` | Bring-your-own-key layer: Claude (Anthropic SDK) or OpenAI, structured outputs |
| `src/core/letter.ts` | Vision/OCR reader for photos of administrative letters |
| `src/core/matching.ts` | Mission matching: walking time, DART bus, schedule, language, constraints |
| `src/core/ledger.ts`, `crypto.ts` | Append-only, hash-chained ledger with Ed25519 coordinator signatures |
| `src/core/attestation.ts` | Signed monthly attestations, verifiable from a QR code |
| `src/core/deserts.ts`, `impact.ts` | Opportunity-desert model for 99 Iowa counties; impact formula |
| `api/` | Serverless functions: platform key, attestation signing, Twilio SMS and Voice webhooks |
| `netlify/functions/api.mts` | Adapter that serves the same `/api/*` handlers on Netlify |
| `tests/core.test.ts` | 20 unit tests (rules, tamper and forgery detection, matching, impact, privacy) |

## Run locally

```bash
npm install
PLATFORM_SIGNING_SEED=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))") npm run dev
npm test
```

Open http://localhost:5173, paste a Claude or OpenAI key on the first screen (it stays in your browser).

## Server configuration (production)

| Variable | Purpose |
|---|---|
| `PLATFORM_SIGNING_SEED` | 32-byte base64 seed of the platform Ed25519 key that signs attestations. Without it, attestations fall back to a per-device development key (clearly labeled). |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | AI key for the SMS/voice webhooks |
| `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID` | Twilio webhooks `/api/sms` and `/api/voice` (signature-validated) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional shared state for the SMS/voice channels |

## API keys — temporary arrangement

For the hackathon submission, the app asks each user for their own AI key; no key is shipped in the code. If Count Me In wins, the prize funds the AI, SMS and voice keys so the service runs for everyone.

## Honesty notes

Host-site names, people and the sample State letter are illustrative; no partnership is implied. The opportunity-desert map uses a transparent model to be replaced by live site and transit data in the pilot. The demo video was recorded with pre-written AI responses standing in for the model's outputs.

License: MIT.
