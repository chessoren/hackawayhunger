## Inspiration

Linda is 58, lives in Des Moines, cleans houses ten hours a week and has no car. In October a letter tells her that, under the 2025 federal law, she must now show **80 hours a month** of work, training or volunteering, or lose her SNAP food assistance. She has 21 days.

Linda is a composite, but her situation is real for many Iowans. The law (P.L. 119-21) raised the SNAP work-rule age limit from 54 to 64, limited the parent exemption to households with a child under 14, and removed the exemptions for veterans, people experiencing homelessness and former foster youth. Iowa SNAP recipients fell **9% in a year** (271,880 → 247,907, May 2025 → May 2026), while **1 in 8 Iowans** face food insecurity. Everyone who loses SNAP ends up in a pantry line that is already breaking records.

Then we found the detail that shaped the project: **federal rules already count volunteering toward the 80 hours, hour for hour (7 CFR 273.24), as long as the hours are verified.** People don't lose SNAP because they refuse to work. They lose it because they can't prove what they do. Meanwhile pantries are short of regular weekday volunteers and track attendance on paper. So one well-recorded hour serves three people at once: **the person keeps their food aid, the pantry gains a volunteer, and the State gets clean proof.**

## What it does

Count Me In turns volunteering into verified hours.

**For the person — any phone, any of 8 languages.** No app, no account: they text a number (or call, or use the web).
- **Letter decoded:** they photograph the State letter and get back three plain sentences, the deadline and the one thing to do, with an automatic reminder.
- **Screening:** six questions, one at a time, answered in their own words. A deterministic rules engine — not the AI — decides "probably exempt", "covered" or "let's check with a navigator", and cites the regulation.
- **Planning:** an 80-hour gauge, then at most **three missions** ranked by real access (walking time, DART bus, work schedule, language, physical limits).
- **Logging:** check-in by **QR code** or a **4-digit code** texted from any basic phone.
- **Always in control:** HELP reaches a human, DELETE erases everything.

**For host sites.** Pantries, churches, gardens and corporate volunteer programs onboard in about 10 minutes and print a QR poster. The coordinator sees only a first name and a time slot, never the SNAP file. They confirm hours in one tap, and each confirmation is signed with the site's Ed25519 key. They get a monthly report ready for grant applications.

**For the State.** Each month the person gets an attestation as a PDF with a QR code. A caseworker scans it and knows in one second that it is authentic; **change a single digit and the signature breaks**. Nothing is sent to Iowa HHS without the person's explicit YES, and that consent is logged.

**For the community.** A public, anonymized dashboard (no cell under 10 people) and a **map of opportunity deserts**: for each of Iowa's 99 counties, how many volunteer hours are reachable without a car compared with the hours needed. Under our model, 64 counties, mostly rural, fall short.

**Impact you can check in your head:** 500 people supported × 40% who would lose SNAP × 75% who keep it with the tool = 150 people. 150 × $168.51 (Iowa average benefit, May 2026) × 12 ≈ **$303,000 of food aid preserved per year**, plus about 36,000 volunteer hours for host sites. All of this runs on a few thousand dollars a year.

## How we built it

- **React + TypeScript + Vite**, mobile-first and accessible: large touch targets, high contrast, right-to-left Arabic, a Burmese font, and a voice mode using the Web Speech API.
- **One channel-agnostic agent** — the same code answers the web phone and the **Twilio** SMS and Voice webhooks. Keywords and site codes are handled first, without AI, so basic phones and outages still work. AI is used only for free text.
- **AI layer:** Claude (Anthropic SDK) or OpenAI, always with **structured JSON outputs**. It does three things: understand free text, read letter photos with vision and OCR, and translate.
- **Rules engine:** `rules/iowa.yaml`, one readable file per state with its sources. When the law changes, you edit the file, not the code.
- **Signed ledger:** append-only and hash-chained, with Ed25519 signatures (TweetNaCl). It stores a salted pseudonym, never a phone number.
- **Attestations:** signed server-side, built with **pdf-lib**, a QR code, and a verification page that also works by camera scan (**jsQR**).
- **Map:** a custom SVG renderer of Iowa county GeoJSON — no third-party map tiles.
- **Hosting:** serverless functions on **Netlify**.
- **Quality:** **Vitest** (20 tests, including forgery and tampering cases) and a full **Playwright** end-to-end run.

**API keys — temporary.** For the judging, the app asks each user for their own Claude or OpenAI key. The key stays in the browser and is never in the code. **If we win, the prize will fund the AI, SMS and voice keys so the service runs for everyone**; people like Linda will never see a key. Because we shipped no keys, the demo video was recorded with pre-written AI responses; the live app uses the real APIs.

## Challenges we ran into

- **Getting the law exactly right.** Sources contradicted each other: early drafts set the parent threshold at a child under 7. We encoded only rules we could cite.
- **Keeping the AI out of decisions without sounding robotic.** The AI can only fill in facts; the rules engine decides. Making that still feel human took several iterations.
- **Translating without breaking SMS.** Option numbers, codes, times and keywords must survive translation intact.
- **Making proof genuinely hard to fake.** We wrote tests that try to forge an attestation, for example turning 4 hours into 8, and made sure they fail.
- **Staying honest.** We used Iowa's real average benefit ($168.51) rather than a rounder figure, even though it lowers our headline number.

## Accomplishments that we're proud of

A complete journey you can test in two minutes: from "Hi" to a signed, verifiable attestation. A rules file a paralegal can read. Proof a caseworker can trust in one second. It works on any phone, in eight languages, with a human always one word away, and privacy is built in from the start.

## What we learned

The bottleneck is **verification, not willingness**. "AI-first" doesn't have to mean "AI decides": a cited rules engine makes the tool easier to trust and to explain. And dignity has to be designed in. That means calling them "missions" and "hours that count", making Count Me In volunteers indistinguishable from everyone else, and sending nothing without a yes.

## What's next for Count Me In

1. **Pilot in the DMARC network** (Nov 2026 – Mar 2027): 3–5 host sites, English and Spanish.
2. **Validate the attestation format with Iowa HHS.**
3. **Scale to Food Bank of Iowa's 55 counties**, then other states with one rules file each.

Next steps include moving the ledger to server-side PostgreSQL, loading DART's full transit feed, and funding the keys. The code is open source (MIT), with a nonprofit host and dsmHack volunteers for maintenance. We'd love Corteva to be the first corporate host site.

*We don't create food. We stop it from disappearing.*

*Demo host sites, people and the sample letter are illustrative; no partnership is implied.*
