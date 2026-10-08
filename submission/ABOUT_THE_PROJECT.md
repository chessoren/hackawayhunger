# Count Me In

**Every hour counts. So do you.**

*Count Me In turns volunteering into verified hours, so Iowans facing SNAP's new 80-hour work rule keep their food assistance, and food pantries gain the regular volunteers they need.*

> “The people in the food line can be the ones who move it — and keep their food aid doing it.”

---

## Inspiration

### Linda

Linda is 58 and lives on the east side of Des Moines. For twenty years she cared for other people as a home health aide. Today she cleans houses about ten hours a week. She has no car. She receives SNAP, the federal food assistance program, and it is a large share of what keeps her fridge from going empty at the end of the month.

In October, a letter arrives. It is two dense pages of administrative English. Somewhere in the middle it says that, under a new federal law, she must now show **80 hours a month** of work, volunteering or training, or her food assistance will stop after three months. She has **21 days** to report her hours or ask for an exemption.

Linda is not a real person. She is a composite, and we built the whole demo around her because every part of her story is real. Since July 2025, millions of adults like her have been in the same position. Without help, the most likely ending of her story is simple: in a few months she is standing in the line at a DMARC food pantry, which already serves record numbers of people.

### The rule that changed

The federal reconciliation law signed on July 4, 2025 (Public Law 119-21, often called the "One Big Beautiful Bill") rewrote SNAP's work requirement for "able-bodied adults without dependents":

- The age range now runs from **18 to 64** (it used to stop at 54).
- Parents are only exempt if a child **under 14** lives in their SNAP household. Parents of teenagers are now covered.
- The exemptions for **veterans**, people **experiencing homelessness**, and **young adults who aged out of foster care** were removed.
- The rule itself did not change in shape: **80 hours a month** of work, a work program or training, or volunteering, in any mix. Without that, or an exemption, SNAP is limited to **3 months in a 36-month period**.

In Iowa, the expanded rules started applying in 2026. The numbers are already moving: Iowa HHS data reported in July 2026 show **247,907 Iowans received SNAP in May 2026, down from 271,880 a year earlier, a 9% drop**. The average benefit was **$168.51 per person per month**.

At the same time, hunger in Iowa is rising. According to Feeding America's *Map the Meal Gap 2025*, about **1 in 8 Iowans and 1 in 6 Iowa children** face food insecurity, and the state's annual **meal gap is roughly 73 million meals**. Food insecurity rose in every one of Iowa's 99 counties. DMARC, the Des Moines Area Religious Council food pantry network, has broken one attendance record after another; its fiscal year ending June 2024 was its busiest ever, with more than 70,000 people served.

Feeding America often points out that SNAP provides about nine meals for every one meal the charitable food network provides. So when someone loses SNAP, the pantries cannot absorb the shock. Every person who drops off the program walks straight into a line that is already too long.

### The insight: the problem is proof, not willingness

When we read the regulation closely, one detail changed everything. Federal rules (7 CFR 273.24) already count **unpaid and volunteer work with a public, faith-based or community organization** toward the 80 hours, hour for hour. State manuals add the condition that matters: those hours must be **documented and verified**.

That means many people who lose SNAP under this rule are not people who refused to work. They are people who:

1. **Don't know they are covered**, or don't know they are actually **exempt** (pregnancy, a health condition, caring for someone).
2. **Don't understand the letter** — long, in English, with a tight deadline.
3. **Can't find accessible hours** — no car, irregular shifts, gig jobs under 20 hours a week.
4. **Can't prove what they do** — volunteering often leaves no trace a caseworker can use.
5. **Miss the deadline** — one missed report is enough to cut the benefit.

On the other side of the same street, food pantries chronically lack **regular, weekday volunteers**. They manage attendance on paper sign-in sheets and spreadsheets, and they have no way to certify anything.

Put those two facts next to each other and the idea becomes obvious in hindsight: **one hour of volunteering, properly recorded, serves three people at once.**

- **The person** keeps their food assistance.
- **The pantry** gains a reliable volunteer.
- **The State** receives clean, verifiable proof instead of an incomplete file to process by hand.

Count Me In doesn't change any rule. It builds the missing link between *an hour given* and *an hour recognized*.

### Why nobody had built this

Most technology projects against hunger focus on logistics: inventory, food rescue, routing surplus. Social-services advocates focus on policy and legal aid. The administrative gap in between — the moment when a person with a letter needs to prove 80 hours — had no tool. The rule is also very new: the window has just opened. And looking at the Hack Away Hunger gallery, the other projects work on food rescue, pantry rebalancing and household waste. Nobody touches SNAP. We wanted to protect the single largest source of food for low-income families — federal food assistance — because preventing that loss is the most powerful lever, and the least explored.

---

## What it does

Count Me In is one platform with three entry points and three outputs. At its center is a **signed, append-only ledger of hours**: everything else either fills that ledger or produces proof from it.

### 1. For the person: a text message, in their language

There is nothing to install and no account to create. A person sees a phone number on a poster at a pantry, on a food bank distribution ticket, or from a social worker, and sends "Hi" — or "Hola", "Bonjour", "Jambo". Count Me In works by **SMS, by voice call, or in the web phone**, in **eight languages**: English, Spanish, Swahili, Burmese, Arabic, Vietnamese, French and Kinyarwanda (the main languages of Des Moines' immigrant and refugee communities, to be confirmed with local partners).

The journey has six moments:

1. **First contact.** A warm greeting, and the privacy promise in plain words: *"I only keep your first name, phone, language and hours. Nothing goes to the State without your YES. Reply DELETE anytime to erase everything, or HELP to talk to a person."*

2. **The letter, decoded.** The person photographs the letter from the State — crooked, badly lit, it doesn't matter. Count Me In reads it and sends back **three short sentences in the person's language**: what the letter says, the **deadline**, and **the one thing to do**, plus the phone number to call. A reminder is set automatically three days before the deadline. In our demo, the sample notice says "within 21 days of the date of this notice"; the AI computes the actual date.

3. **"Does this apply to me?"** Six simple questions, **one at a time**: age, whether a child under 14 lives in the household, pregnancy, a health condition that makes work hard, caring for someone who can't care for themselves, and paid hours per week. People can answer with a button, a number, or in their own words: *"My knees hurt a bit but I can still work"*, *"No, my son is grown, he's 31"*, *"I clean houses about 10 hours a week"*. The answer is one of three outcomes:
   - **You are probably exempt** — and here is exactly what proof to send (a short note from a clinic, a statement about the person you care for). A navigator is notified to help.
   - **The rule applies to you** — and here is your plan.
   - **Let's check together with a navigator** — when the situation is genuinely uncertain.
   Every outcome **cites the rule** it comes from, with a link to the regulation and the version of the rules file.
   If someone says they are a veteran or experiencing homelessness, Count Me In gently explains that those exemptions were removed in 2025 — because many people still believe they are protected.

4. **The 80-hour gauge.** Count Me In adds up what already counts: declared paid work, training or English classes, and **coordinator-confirmed** volunteer hours. It always says where you stand: *"Your hours this month: 43 of 80. You need 37 more hours before Oct 31 (23 days)."*

5. **Three missions, never more.** After three quick questions (ZIP code, car or no car, when you're *not* available), Count Me In proposes at most three volunteer missions ranked by **real accessibility**: walking time, a DART bus route and its travel time, compatibility with the person's work schedule, languages spoken on site, physical constraints (seated work, no lifting). The ranking optimizes for **success of the month** — reaching 80 hours before the deadline — not for volume. The person replies "1", "2" or "3". Booked.

6. **The day of, and after.** A reminder the evening before, with the address and the bus. At the door, the person **scans the QR code** on the site poster, or **texts the site's 4-digit code** from any basic phone. Same thing when leaving. That evening, once the coordinator confirms, the gauge updates: *"Pastor Dave confirmed 4 hours. ✅ You are at 47 of 80 hours this month — 33 to go."* At month's end, the **signed attestation** is ready.

Keywords always work, even with no AI at all: **HELP**, **DELETE**, **HOURS**, **MISSIONS**, **ATTESTATION**, and any site's 4-digit code. If someone is falling behind mid-month (for example, 30 hours on the 20th), Count Me In sends a nudge and puts them on a human navigator's "at risk" list.

What a person never sees: forms, passwords, jargon, ads, judgment. We speak of "hours that count" and "missions", never "control" or "sanctions".

### 2. For host sites: the paper sign-in sheet, replaced

Any pantry, faith community, library, community garden or corporate volunteer program can become a **host site in about ten minutes**, in five steps: organization and coordinator; mission types (sorting, distribution, welcome desk, kitchen, garden, office, driver, English class); recurring time slots and capacity; access conditions (languages, minimum age, wheelchair access, seated work); and a **printable poster** with the site's QR code and its 4-digit code. When the site goes live, Count Me In generates a **coordinator signing key** for it.

The coordinator's daily screen is built for a phone and a busy morning:

- **Today's list**: who is coming, at what time, for which mission. The coordinator sees **only a first name and a time slot** — never why the person volunteers, never their SNAP file. A Count Me In volunteer looks exactly like any other volunteer.
- **Confirm in one tap**: arrival and departure are pre-filled from the check-ins; the coordinator confirms or corrects. That confirmation is **signed with the site's key**.
- **No-show alert**: if someone hasn't checked in 20 minutes after the start, the coordinator can mark a no-show and offer the slot to the waitlist.
- **Monthly report**: volunteer hours received, number of volunteers, the economic value of the time given, a CSV export — ready to attach to a grant application.
- **Audit log**: every entry, its hash, whether it is signed, and a live check that the whole ledger is intact.

Safeguards for organizations: they choose which missions are open, can decline any slot, and only certify what they saw — arrival, departure, mission.

### 3. For the State: a document that verifies itself in one second

Each month, the person gets an **attestation of hours**, as a PDF and as a link. It contains the first name and month, every activity (date, organization, mission, arrival, departure, hours, the coordinator who validated, the ledger entry and the coordinator key fingerprint), totals by category (volunteering, training, paid work declared by the person) and an overall total, and a **QR code**.

A caseworker scans the QR code (or opens the link) and the verification page says, in one second, **"Authentic — not modified since it was signed"**. Change a single character — one hour, one date — and it says **"Not valid"**. No account, no AI key, nothing stored: verification runs in the browser against the platform's published Ed25519 public key.

Why it is harder to fake than a paper sign-in sheet:

- **Double validation**: the person checks in and out on site; the coordinator confirms. Nobody can award themselves hours.
- **Timestamps** at every step (optional geolocation with consent is on the roadmap).
- **Cryptographic signatures**: each coordinator validation is signed with the site's key, the ledger is hash-chained, and the attestation is signed by the platform.
- **Audit trail** visible to the host site.

How it reaches the administration, in three levels:

1. **Immediate (works today)**: the person downloads or prints the attestation at the pantry and hands it in or uploads it on the State portal.
2. **With consent**: Count Me In sends it to the competent office through a secure channel — only after an explicit **YES**, every time. (In this hackathon build, that sending is simulated and logged.)
3. **Partnership**: a direct, structured data connection with Iowa HHS.

The non-negotiable principle: **nothing goes to the State without the person's explicit "yes", every single time.** That consent is itself written to the ledger.

### 4. For the community: an impact dashboard and a map of opportunity deserts

A public, anonymized dashboard shows live counters (people supported, people recognized as exempt through screening, people on a plan, volunteer hours verified for host sites) with a hard privacy rule: **no cell ever shows fewer than 10 people** — below that, it shows "<10".

The **opportunity-desert map** colors each of Iowa's 99 counties by a single ratio: *car-free accessible volunteer hours per month* divided by *volunteer hours needed by people subject to the rule*. Red counties are those where the obligation is mathematically out of reach for part of the population. In our current model, **64 of 99 counties** are deserts — almost all small rural counties without fixed-route transit — while metro counties are "tight" or sufficient. Every host site registered in Count Me In feeds the supply side: register a site in Polk County and watch the map change. The county data downloads as CSV.

This is neutral, objective data. It serves those who want to open more host sites as much as those who want to request geographic waivers. It answers directly the challenge's category "supporting policy, advocacy or research through technology", and it guides action: where to recruit the next host site, where a mobile pantry or a shuttle would unlock hours.

The dashboard also hosts the **impact model**, with editable assumptions and their sources, so a judge can redo every number in their head:

> **Aid preserved per year = people who keep SNAP × average monthly benefit × 12**

With our pilot assumptions — 500 people supported in year one; 40% of them would lose SNAP without a tool; the tool helps 75% of those keep it; Iowa's average benefit of $168.51 per person per month — that is **500 × 40% × 75% = 150 people**, and **150 × $168.51 × 12 ≈ $303,000 of food assistance preserved per year**. At about $3.40 per meal (Map the Meal Gap 2025: $248.3M ÷ 73M meals for Iowa), that is roughly **89,000 meals**. Add **36,000 volunteer hours a year** injected into host sites (150 people × 20 hours × 12), worth about **$1.25 million** at Independent Sector's value of a volunteer hour — for a running cost of a few thousand dollars a year in SMS, AI and hosting.

We deliberately used the *real* average Iowa benefit instead of a rounder, more flattering number. Every assumption is on screen, editable, and labeled with how the pilot will measure it.

### 5. For navigators: always a human

Every conversation can reach a person. Typing HELP (or AIDE, AYUDA, MSAADA…) opens a ticket in the **navigator console**, as does any screening result that needs human review, any "probably exempt" case, or any person with no reachable mission. The console also lists people **at risk of missing their month** — hours still missing after counting bookings — so a navigator can call before it's too late.

---

## How we built it

### Architecture

Three input channels feed one platform whose core is the signed hours ledger. Six modules sit around it: the **multilingual AI agent**, the **letter reader**, the **rules engine**, **mission matching**, the **signed ledger**, and the **human relay**. Three outputs read from it: the **verifiable attestation**, **Iowa HHS** (only after a yes), and **anonymized data** aggregated by county.

The path of one hour through the system: the person books through the agent → matching assigns a slot → the person scans in and out → the coordinator validates → the ledger signs the entry → the gauge updates → the monthly attestation includes it.

### The stack

- **Front end**: React 18 + TypeScript + Vite. One accessible, mobile-first web app with seven surfaces: the person's phone, the coordinator screen, site onboarding, the navigator console, the impact dashboard and map, the rules explorer, and the public verification page. A "Live demo" stage shows the phone and the coordinator side by side with a demo clock, so judges can live a whole month in two minutes.
- **AI layer** (`src/core/llm.ts`): a small provider-agnostic interface with two implementations — **Claude** through the official Anthropic TypeScript SDK and **OpenAI** through the official OpenAI SDK. Every call uses **structured outputs** (a JSON schema), so the agent never parses free text. With Claude we default to Claude Opus 5.5 at low effort for conversation turns and medium effort for reading letters, with server-side refusal fallback enabled.
- **The agent** (`src/core/agent.ts`): a pure, channel-agnostic state machine. The *same code* answers the web phone, a Twilio SMS webhook and a Twilio voice webhook. Each turn: deterministic keyword and code handling first (so basic phones and outages still work), then — only for free text — an AI *understanding* call that turns words into facts, then the rules engine decides, then the reply is translated into the person's language.
- **Rules engine** (`src/core/rules.ts` + `rules/iowa.yaml`): one YAML file per state, readable by a paralegal, versioned, with sources. A tiny deterministic evaluator (`age >= 18 and age <= 64`, unknown facts → ask). When the law changes, we update the file, not the code — which is what makes Count Me In replicable in all 50 states.
- **Letter reader** (`src/core/letter.ts`): vision + OCR via the same AI layer, extracting letter type, sender, a three-sentence summary in the target language, the deadline as an ISO date (computing "within 21 days of the notice date"), the action, the phone number, and a confidence level. Low confidence → we say so and offer a navigator.
- **Matching** (`src/core/matching.ts`): walking time from street-distance estimates, a single-route DART trip model (walk to stop + half the headway + ride + walk), the person's busy windows, language match, physical constraints, capacity left, and a score that rewards closing the gap before the deadline. At most three options, from three different sites.
- **Signed ledger** (`src/core/ledger.ts`, `src/core/crypto.ts`): append-only entries (booking, check-in, check-out, validation, no-show, consent, erasure) with deterministic canonical JSON, a hash chain (SHA-512/256 via TweetNaCl), and **Ed25519 signatures** for coordinator validations. `verifyChain` re-checks every link and signature. Only coordinator-validated hours count; self-reported hours never do. The ledger stores a **salted pseudonym**, never a phone number.
- **Attestations** (`src/core/attestation.ts`, `src/app/attestationPdf.ts`): a compact payload signed by the **platform key on the server** (`/api/sign`, private seed only in the server environment), encoded into the verification URL, rendered as a PDF with **pdf-lib** and a QR code (**qrcode**). The verify page can also **scan a QR code with the camera** (**jsQR**).
- **Impact map**: **Leaflet** with Iowa county GeoJSON, a transparent county-level model, and CSV export.
- **Voice**: in the browser, the **Web Speech API** (speech recognition in the person's language and spoken replies — a "call mode" for people who read little); on the phone network, **Twilio Programmable Voice** with `<Gather input="speech">` and `<Say>` in the person's language.
- **Serverless functions**: `/api/platform-key`, `/api/sign`, `/api/sms` (Twilio Messaging, including MMS photos of letters, with Twilio signature validation) and `/api/voice`, written once and served on **Netlify Functions** (through a small adapter) or Vercel.
- **Quality**: **Vitest** unit tests for the rules engine, ledger tamper detection, attestation forgery detection, matching, impact formula, k-anonymity and multilingual keywords (20 tests), plus an end-to-end **Playwright** run of the full journey.

### AI where it helps, rules where it matters

We were strict about the line between AI and decisions:

- **What the AI does**: understand people in their own words and language ("I hurt my back since the accident" → *possible health exemption, to document*); read imperfect photos of letters; translate replies warmly and simply; answer general questions **only from the rules summary we give it**.
- **What the AI never does**: decide alone that someone is exempt or not (the rules engine and a human decide); invent a rule (every eligibility answer cites the rule that applies); share data with the administration without explicit consent.

### Bring your own key — temporary, for the submission

Count Me In needs an AI model to understand free text and read letters. For the hackathon judging, **the app asks each user to bring their own API key** (Claude or OpenAI) on the first screen. The key stays in the browser (session storage by default, or "remember on this device"), and it is sent only to the provider the user chose — never to our servers and never committed to the code. The SMS and voice webhooks read keys from server environment variables, again supplied by whoever runs the service.

This is a **temporary arrangement for the submission**, not the product model. **If Count Me In wins, we will use the prize to fund the API keys** (AI, SMS and voice) so the service runs for everyone, with no key to enter, during the pilot. People like Linda will never see an API key — they just text a number.

A note on the demo video: since we didn't ship any keys, the walkthrough in the video was recorded with **pre-written AI responses** (a fixture standing in for the model's structured outputs) so it plays deterministically; the live app on the "Try it out" link runs on the real Claude or OpenAI APIs with the key you provide.

### Privacy by design

- **Minimal data**: first name, phone, language, hours. No SNAP case number stored.
- **Pseudonymous ledger**: a salted hash instead of the phone number.
- **Explicit consent for every transfer** to the State, written to the ledger.
- **Erasure by SMS**: DELETE removes the person's name, answers, hours and reminders (the ledger keeps only an erasure marker for the pseudonym).
- **Need-to-know for host sites**: a first name and a time slot.
- **Aggregated public data**, never under 10 people per cell.
- **No resale, no ads, no commercial use.**

### Design, dignity, accessibility

The product is designed for someone stressed, tired and wary of the administration. Our six design rules: the simplest phone is enough (SMS and voice first; the web is a bonus); three choices maximum at every step; one question at a time; always say where you stand ("37 hours and 23 days left"); always a human exit (HELP); the language of dignity. The coordinator interface uses large tap targets (48–64 px), high contrast, visible focus rings, ARIA labels and live regions, right-to-left rendering for Arabic, and a Burmese font. Missions can be filtered by physical constraints. And the dignity rules are firm: volunteering is **one option among others**, never a condition to receive food on site; nobody has to volunteer where they receive aid; there is no visible difference between a Count Me In volunteer and any other.

### Visual identity

The symbol is a circular gauge filling up to 80 — it also evokes a plate. Champion green (Iowa agriculture) and a warm orange for the gauge. The name works both ways: *count my hours* and *I'm in — count on me*.

---

## Challenges we ran into

**Getting the law right, not approximately right.** The 2025 changes interact with older regulations, state manuals and ongoing litigation over waivers. Secondary sources contradicted each other (for example, early drafts of the bill set the parent threshold at children under 7; the final law uses under 14). We chose to encode only what we could cite, to put every source in the rules file, and to label the file "hackathon draft — to be validated with Iowa HHS".

**Keeping the AI out of decisions without making the experience robotic.** Our first instinct was a single "agent" prompt. We replaced it with a deterministic state machine where the AI only fills structured facts and translates. The difficulty was making that feel human: accepting "my son is grown, he's 31" as an answer to the child question, answering side questions from the rules summary, and switching language mid-conversation without breaking the flow.

**Translation without losing what matters.** Translating "Reply 1, 2 or 3", times, addresses, 4-digit codes and keywords like HELP is a classic way to break an SMS flow. The translation prompt keeps numbers, codes, URLs and option numbers intact and adds the local keyword in parentheses the first time. Letter summaries are produced directly in the person's language and are never translated twice.

**Proof that is genuinely hard to fake.** A screenshot of a spreadsheet is not proof. We designed a hash-chained, append-only ledger with Ed25519 signatures for every coordinator validation, and a separately signed attestation whose verification needs nothing but a public key. Then we wrote tests that try to forge it — changing hours from 4 to 40, swapping the signing key — and made sure they fail.

**Honest impact numbers.** The brief we started from used a round $250 monthly benefit. The real Iowa average in May 2026 is $168.51. We used the real number, even though it lowers the headline from ~$450,000 to ~$303,000, and we put every assumption on screen.

**Modeling opportunity deserts without perfect data.** Iowa doesn't publish a registry of every volunteer slot reachable without a car. We built a transparent model (population, the statewide SNAP rate, the share newly subject to the rule, fixed-route transit counties, a baseline of volunteer-hosting organizations) and made the supply side live from registered host sites. The pilot will replace the baseline with real site and transit data.

**Deploying under hackathon constraints.** Our first deployment target refused to create the project from our account, so we wrote the serverless functions once and added a thin adapter to run the same handlers on Netlify.

---

## Accomplishments that we're proud of

- **A complete, working journey**: from "Hi" to a signed, verifiable attestation — letter decoded, screening with a cited rule, three accessible missions, QR or 4-digit check-in, one-tap validation, gauge, consent, verification — that a judge can live in under two minutes on the live demo stage.
- **A rules engine a non-developer can read.** `rules/iowa.yaml` is the single place where Iowa's rule lives, with its sources. Swapping states is a file, not a rewrite.
- **Proof a caseworker can trust in one second**, and that breaks the moment anyone changes a digit.
- **Works on any phone.** Keywords and 4-digit site codes work without a smartphone, without data, and even if the AI is down.
- **Eight languages and a voice mode** for people who read little.
- **Privacy that is designed in, not bolted on**: pseudonymous ledger, consent logged per transfer, erasure by SMS, k ≥ 10 on every public cell, host sites that see only a first name.
- **A map that turns a policy debate into data**: where 80 hours are reachable, and where they are not.
- **Tested core**: 20 unit tests on the parts that must never be wrong — eligibility, tamper detection, forgery detection, impact math, privacy thresholds.

---

## What we learned

- **The bottleneck is verification, not willingness.** Once you see it, you can't unsee it: most of this problem is a documentation problem, and documentation is something technology does well.
- **"AI-first" is not "AI decides".** The most useful thing the model does here is understand people, not judge them. Putting a deterministic, cited rules engine between the AI and the outcome made the product more trustworthy *and* easier to explain to a caseworker or a pastor.
- **Dignity is a feature you have to design.** Words like "missions" and "hours that count", the absence of any visible marker on volunteers, and the guarantee that nothing leaves without a "yes" are not copywriting — they decide whether people use the tool at all.
- **One mechanism can serve three parties.** The best ideas in this space don't create a new obligation; they make an existing option usable.
- **Being conservative with numbers is persuasive.** A smaller number with visible assumptions is more convincing than a big one nobody can check.

---

## What's next for Count Me In

**Who carries it after the hackathon.** Hosting by an organization in the ecosystem — DMARC, a collective of social navigators, or a regional coalition — with **dsmHack** volunteers for maintenance, following its post-hackathon support model. The code is **open source (MIT)** so other states and organizations can reuse it.

**The roadmap — each phase unlocked by a proof:**

1. **MVP (October 2026, this hackathon)**: the full SMS journey, QR check-in and attestation, the demo dashboard. → *Gate: a signed letter of intent from a partner organization.*
2. **DMARC pilot (November 2026 – March 2027)**: 3 to 5 host sites, English and Spanish first, retention measured. → *Gate: Iowa HHS accepts the attestation format.*
3. **All of Iowa (2027)**: Food Bank of Iowa's 55 counties and beyond, 8 languages and voice, a direct link with Iowa HHS. → *Gate: published results showing people kept their benefits.*
4. **Other states (2028)**: multi-state rules files, a network of host sites. The reform is federal: every state has the same problem.

**Before the pilot**, we will: validate with Iowa HHS the verification format for volunteer hours (examples from Washington, New York, Missouri and Massachusetts show the variety of state practices); confirm the language list with refugee-serving partners; replace the demo site list and the DART excerpt with the real site registry and the full DART GTFS feed; move the ledger to a server-side, append-only PostgreSQL store; and fund the AI, SMS and voice keys so nobody ever has to bring their own.

**Business model — no profit, no dependency.** SMS and calls cost cents per exchange (corporate philanthropy); AI at this volume is cheap (tech-for-good programs); hosting is minimal (nonprofit cloud credits); the real cost is about half a coordinator position (foundation or State grant). A few thousand dollars a year, compared with hundreds of thousands of dollars of food assistance preserved.

**Why the State has an interest in adopting it.** States now carry 75% of SNAP's administrative costs. Structured, verified attestations reduce manual re-entry, errors and appeals. The tool saves caseworkers time.

**What we track**: share of people supported who keep SNAP at 3, 6 and 12 months; exemptions recognized; time from first message to first mission; active host sites, hours received and show-up rates; equity by language, county and age; and the share of attestations accepted by the administration on first submission.

**The sponsor fit.** Corteva supports the fight against hunger in Iowa every year and invests in employee volunteering. Count Me In gives that a concrete role: becoming the **first corporate host site** — Corteva volunteer days already appear as a sample host site in the demo — and sponsoring the pilot.

### The three things to remember

1. **The problem is proof, not willingness.**
2. **It works on any phone, in any language.**
3. **One hour of volunteering serves three people at once.**

*We don't create food. We stop it from disappearing.*

---

### Sources

- Public Law 119-21 (H.R. 1, 2025), Sec. 10102 — Modifications to SNAP work requirements for able-bodied adults.
- 7 CFR 273.24 — Time limit for able-bodied adults without dependents (work includes unpaid and volunteer work).
- USDA FNS — OBBB ABAWD exemptions implementation memo; National Association of Counties summary of USDA guidance.
- Iowa HHS SNAP data, May 2026, as reported by KCRG (July 10, 2026): 247,907 recipients; average benefit $168.51.
- Feeding America, *Map the Meal Gap 2025* (Iowa), via Food Bank of Iowa: 12% of Iowans and 16.6% of children food insecure; ~73 million-meal gap; $248.3 million.
- DMARC Food Pantry Network reporting (Business Record, Iowa Public Radio): record usage, 70,727 people in FY2024.
- State SNAP manuals (New Hampshire, Ohio, North Dakota, Oklahoma) on counting and documenting volunteer hours.
- Independent Sector — value of volunteer time.

*Demo data (host sites, people, letters) is illustrative. Site names are fictional and no partnership is implied. The sample State letter is marked "SAMPLE — not an official notice".*
