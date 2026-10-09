## Inspiration

I'm sixteen. I have never received a letter from a government agency that could take away my food. Linda has.

Linda is 58, lives in Des Moines, cleans houses ten hours a week and has no car. In October a letter tells her that, under a new federal law, she must now show **80 hours a month** of work, training or volunteering, or lose her SNAP food assistance. She has 21 days.

Linda is a composite, but the numbers behind her are real. The 2025 law (P.L. 119-21) extended SNAP's work rule from age 54 to 64, kept the parent exemption only for households with a child under 14, and removed the exemptions for veterans, people experiencing homelessness and former foster youth. In one year, Iowa's SNAP rolls fell **9%** (271,880 → 247,907), while **1 in 8 Iowans** face food insecurity. Everyone who loses SNAP ends up in a pantry line that is already breaking records.

Then I found the sentence that became the project, in the regulation itself (**7 CFR 273.24**): volunteering with a community organization **already counts toward the 80 hours, hour for hour**, as long as the hours are verified.

So the law already gives Linda a way to keep her food. What it doesn't give her is a way to prove it. People don't lose SNAP because they refuse to work. They lose it because they can't prove what they do. And the pantries nearby are short of regular volunteers and still use paper sign-in sheets.

One well-recorded hour helps three people at once: **Linda keeps her food, the pantry gains a volunteer, and the State gets clean proof.**

I can't vote on this law, and I don't run a food bank. But I could build the missing piece, and I wanted to build it for Linda first: a tired person, on a cheap phone, maybe in her second language.

## What it does

Count Me In turns volunteering into verified hours.

**For the person, on any phone, in 8 languages.** No app, no account. She texts a number, calls it, or uses the web.
- **The letter, decoded:** she photographs the letter and gets back three plain sentences, the deadline and the one thing to do, with an automatic reminder.
- **"Does this apply to me?":** six questions, one at a time, answered in her own words. A deterministic rules engine, not the AI, decides between "probably exempt", "covered" and "let's check with a human", and cites the regulation.
- **A plan:** an 80-hour gauge, then **three missions at most**, ranked by real access: walking time, bus line, schedule, language.
- **Proof:** she checks in with a **QR code**, or a **4-digit code** texted from any basic phone.
- **Control:** HELP reaches a human. DELETE erases everything.

**For host sites.** Pantries, churches and volunteer programs sign up in about ten minutes and print a QR poster. The coordinator sees only a first name and a time slot, never a SNAP file, and confirms hours in one tap. Each confirmation is cryptographically signed.

**For the State.** Every month, Linda gets an attestation with a QR code. A caseworker scans it and knows in one second that it's authentic. **Change a single digit and the signature breaks.** Nothing is sent to Iowa HHS without her explicit YES.

**For Iowa.** An anonymized dashboard and a **map of opportunity deserts**: for each of the 99 counties, how many volunteer hours are reachable without a car compared with how many are needed. Under our model, 64 counties fall short, most of them rural.

**Impact you can check in your head:** 500 people supported × 40% who would lose SNAP × 75% who keep it with the tool = 150 people. 150 × $168.51 (Iowa's real average benefit) × 12 ≈ **$303,000 of food assistance preserved per year**, for a running cost of a few thousand dollars.

## How we built it

I built Count Me In with an AI coding agent. My part was the research, the architecture and the decisions, and saying "no, that's not it" until it was.

- **React + TypeScript + Vite**, mobile-first and accessible, with a voice mode for people who read little.
- **One agent for every channel:** the same code answers the web phone and **Twilio** SMS and voice. Keywords and site codes work without any AI, so basic phones and outages never break the flow.
- **AI layer:** Claude or OpenAI, always with **structured JSON outputs**. It only understands free text, reads letter photos and translates.
- **Rules engine:** `rules/iowa.yaml`, one readable file per state, with its sources. When the law changes, you edit the file, not the code.
- **Signed ledger:** append-only, hash-chained, with Ed25519 signatures. It stores a pseudonym, never a phone number.
- **Attestations:** signed on the server, rendered as a PDF with a QR code and a verification page.
- **Quality:** 20 automated tests, including forgery and tampering cases, and a full end-to-end run. Hosted on **Netlify**.

**About the API keys (temporary).** For judging, the app asks for your own Claude or OpenAI key. It stays in your browser and is never in the code. **If we win, the prize will fund the AI, SMS and voice keys so the service runs for everyone.** Linda will never see a key; she'll just text a number. Because I shipped no keys, the demo video uses pre-written AI responses; the live app uses the real APIs.

## Challenges we ran into

- **Getting the law exactly right.** Sources contradicted each other, so I only encoded rules I could cite.
- **Keeping the AI out of decisions without making it cold.** The AI turns words into facts; the rules engine decides. Making that still sound kind took many rounds.
- **Translating without breaking SMS.** Option numbers, codes and keywords must survive every language.
- **Making proof hard to fake.** I wrote tests that try to forge an attestation and made sure they all fail.
- **Starting over on design.** The first version worked but looked generic, so I rebuilt every screen around a single design system.

## Accomplishments that we're proud of

A complete journey you can test in two minutes, from "Hi" to a signed attestation a caseworker can trust in one second. It works on any phone, in eight languages, with a human always one word away. And the idea it's built on: **the problem is proof, not willingness.**

## What we learned

The bottleneck is verification, not willingness, and paperwork is something software is good at. "AI-first" doesn't have to mean "AI decides": a cited rules engine makes the tool easier to trust. Dignity has to be designed in, from the words we use to sending nothing without a yes. And being sixteen is not a reason to build something small.

## What's next for Count Me In

1. **A pilot in the DMARC pantry network**, with 3 to 5 host sites, in English and Spanish first.
2. **Validating the attestation format with Iowa HHS.**
3. **Scaling to the rest of Iowa**, then to other states, one rules file each.

The code is open source (MIT), so a nonprofit can host it and dsmHack volunteers can maintain it. I'd love Corteva to be the first corporate host site.

I can't change the law. I can make sure nobody loses their food because they couldn't prove an hour they actually gave.

*We don't create food. We stop it from disappearing.*

*Demo host sites, people and the sample letter are illustrative; no partnership is implied.*
