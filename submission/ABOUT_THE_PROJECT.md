## Inspiration

I'm sixteen. I have never received a letter from a government agency that could take away my food. Linda has.

Linda is 58, lives in Des Moines, cleans houses ten hours a week and has no car. In October an envelope arrives. Two pages of administrative English, and somewhere in the middle, the sentence that matters: from now on she must show **80 hours a month** of work, training or volunteering, or her SNAP food assistance stops. She has 21 days.

Linda is a composite. I built her out of numbers, and the numbers are real. The 2025 federal law (P.L. 119-21) extended SNAP's work rule from age 54 to 64, kept the parent exemption only for households with a child under 14, and removed the exemptions for veterans, people experiencing homelessness and young adults who aged out of foster care. In one year, Iowa's SNAP rolls fell **9%**, from 271,880 to 247,907 people. Meanwhile **1 in 8 Iowans** don't know where their next meal is coming from, and the pantry lines in Des Moines keep breaking records. When someone loses SNAP, they don't disappear. They join that line.

I started where I always start: I read everything, then I wrote it down. Before a single line of code existed, I had a 21-page brief: personas, objections, a demo script, the roadmap.

On page three of my own notes, I found the sentence that became the project. It wasn't in the news. It was in the regulation itself, **7 CFR 273.24**: volunteering with a public, faith-based or community organization **already counts toward the 80 hours, hour for hour**, as long as the hours are verified.

So the law already gives Linda a way to keep her food. What it doesn't give her is a way to prove she used it.

That changed the whole problem. People don't lose SNAP because they refuse to work. They lose it because they don't know whether they're exempt, they can't read the letter, they can't reach hours without a car, they can't prove what they did, or they miss one deadline. And two streets away, the same pantries are short of regular weekday volunteers and still track attendance on a paper sign-in sheet.

One well-recorded hour helps three people at once. **Linda keeps her food. The pantry gains a volunteer. The State gets clean proof.**

In maths class, when a proof lands, I shout *"C'est du génie !"* out loud. My teacher has given up trying to stop me. This idea felt like that kind of proof: invisible before you see it, obvious after.

## Why a sixteen-year-old

I can't vote on this law. I can't sign a lease, and I don't run a food bank. What I can do is notice when the hard part of a problem isn't the hard part everyone is looking at.

I taught myself English with an app, one day at a time, until one morning a video made complete sense. A few years ago I stopped learning to code and studied something else: who a product is for, and how to explain it to them. I still don't know if that was smart or lazy. But it's why Count Me In starts with a woman holding a letter, not with a database. It's also why every screen asks the same question: would Linda understand this, on a cheap phone, tired, in her second language?

## What it does

Count Me In turns volunteering into verified hours.

**For the person, on any phone, in 8 languages.** No app, no account, no password. She texts a number, calls it, or uses the web.
- **The letter, decoded.** She photographs the letter, crooked and badly lit. She gets back three plain sentences: what it says, the deadline, and the one thing to do. A reminder is set automatically.
- **"Does this apply to me?"** Six questions, one at a time, answered in her own words. *"My knees hurt a bit but I can still work."* A deterministic rules engine, not the AI, decides between "probably exempt", "covered" and "let's check with a human". It cites the regulation every time.
- **A plan.** An 80-hour gauge, then **three missions at most**, ranked by real access: a 12-minute walk, a DART bus line, her cleaning schedule, her language, her knees.
- **Proof.** She checks in at the door by scanning a **QR code**, or by texting a **4-digit code** from any basic phone.
- **Control.** HELP reaches a human navigator. DELETE erases everything.

**For host sites.** Pantries, churches, gardens and corporate volunteer programs sign up in about ten minutes and print a QR poster. The coordinator sees a first name and a time slot, never a SNAP file. They confirm hours in one tap, and each confirmation is signed with the site's Ed25519 key. At the end of the month they get a report ready to attach to a grant application.

**For the State.** Every month, Linda receives an attestation: a PDF with a QR code. A caseworker scans it and knows in one second that it's authentic. **Change a single digit, and the signature breaks.** Nothing goes to Iowa HHS without her explicit YES, and that YES is logged.

**For Iowa.** A public, anonymized dashboard (no number ever describes fewer than 10 people), and a **map of opportunity deserts**: for each of the 99 counties, how many volunteer hours are reachable without a car compared with how many are needed. Under our model, 64 counties fall short, most of them rural. It's the kind of data that tells a food bank where to open its next site, and tells a policymaker where the rule can't physically be met.

**Impact you can check in your head:** 500 people supported × 40% who would lose SNAP × 75% who keep it thanks to the tool = 150 people. 150 × $168.51 (Iowa's real average benefit, May 2026) × 12 months ≈ **$303,000 of food assistance preserved per year**, plus about 36,000 volunteer hours for host sites. The running cost is a few thousand dollars a year.

## How we built it

I built Count Me In with an AI coding agent. My job was the brief, the architecture, the decisions, and above all saying "no, that's not it" until it was.

- **React + TypeScript + Vite**, mobile-first and accessible: large touch targets, high contrast, right-to-left Arabic, a Burmese font, and a voice mode (Web Speech API) for people who read little.
- **One agent for every channel.** The same code answers the web phone and the **Twilio** SMS and voice webhooks. Keywords and site codes are handled first, without any AI, so a basic phone or an outage never breaks the flow.
- **The AI layer:** Claude (Anthropic SDK) or OpenAI, always with **structured JSON outputs**. It does three things only: understand free text, read letter photos (vision + OCR), and translate.
- **The rules engine:** `rules/iowa.yaml`, one readable file per state, with its sources. When the law changes, you edit a file a paralegal can read, not the code.
- **The signed ledger:** append-only and hash-chained, with Ed25519 signatures (TweetNaCl). It stores a salted pseudonym, never a phone number.
- **Attestations:** signed on the server, rendered with **pdf-lib**, with a QR code and a verification page that also works by camera (**jsQR**).
- **The map:** my own SVG renderer of Iowa's county boundaries. No third-party map tiles.
- **Quality:** **Vitest** (20 tests, including forgery and tampering cases) and a full **Playwright** end-to-end run. Hosted on **Netlify**.

**About the API keys (temporary).** For judging, the app asks you for your own Claude or OpenAI key. It stays in your browser and is never in the code. **If we win, the prize will fund the AI, SMS and voice keys so the service runs for everyone.** People like Linda will never see a key. They'll just text a number. Because I shipped no keys, the demo video uses pre-written AI responses; the live app runs on the real APIs.

## Challenges we ran into

- **The law didn't agree with itself.** Early drafts of the bill set the parent threshold at a child under 7; the final law says under 14. I decided to encode only what I could cite, and to put every source in the rules file.
- **Keeping the AI out of decisions without making it cold.** The AI is only allowed to turn words into facts; the rules engine decides. Making that still sound like a kind person took many rounds.
- **Translation that doesn't break SMS.** "Reply 1, 2 or 3", a 4-digit code and the word HELP all have to survive Swahili and Arabic untouched.
- **Proof that is actually hard to fake.** I wrote tests that try to forge an attestation, turning 4 hours into 8, and made sure every one of them fails.
- **I hated my first design.** The first version worked and looked generic. I threw away the entire interface and rebuilt every screen, the slides and the video around one design system. The product works the same. It just finally looks like something Linda would trust.
- **Staying honest.** I used Iowa's real average benefit, $168.51, instead of a rounder number, even though it made my headline smaller.

## Accomplishments that we're proud of

A complete journey you can test in two minutes, from "Hi" to a signed attestation a caseworker can trust in one second. A rules file a paralegal can read. A product that works on any phone, in eight languages, with a human always one word away.

And the thing I'm proudest of is a sentence that isn't in the code: *the problem is proof, not willingness.* Once I understood that, every design decision followed from it.

## What we learned

**The bottleneck is verification, not willingness.** Most of this problem is a paperwork problem, and paperwork is something software is good at.

**"AI-first" doesn't have to mean "AI decides".** Putting a cited rules engine between the model and the outcome made the tool easier to trust, and easier to explain to a pastor or a caseworker.

**Dignity has to be designed in.** We say "missions" and "hours that count", never "control" or "sanctions". A Count Me In volunteer looks exactly like every other volunteer, and nothing leaves without a yes.

**Being sixteen is not a reason to build something small.** It's a reason to read the regulation more carefully than the people who assume they already know it.

## What's next for Count Me In

1. **A pilot in the DMARC pantry network** (Nov 2026 – Mar 2027): 3 to 5 host sites, English and Spanish first.
2. **Validating the attestation format with Iowa HHS.**
3. **Scaling to Food Bank of Iowa's 55 counties**, then to other states, one rules file each, because the law is federal and every state has the same problem.

Along the way: move the ledger to a server-side database, load DART's full transit feed, and fund the keys. The code is open source (MIT), so a nonprofit can host it and dsmHack volunteers can maintain it. I'd love Corteva to be the first corporate host site.

I can't change the law. I can make sure nobody loses their food because they couldn't prove an hour they actually gave.

*We don't create food. We stop it from disappearing.*

*Demo host sites, people and the sample letter are illustrative; no partnership is implied.*
