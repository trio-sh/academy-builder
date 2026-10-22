# Answers to Tony's three checks and his request for the service provider list (draft, 22 October 2026)

For Hans Ade to review before sending. Everything here was read from the platform's own configuration on 22 October; nothing is guessed. Where something could not be verified it says so.

## His three points to check

**1. Commit seal key.** An administrator can read it. The key was generated inside the database and is held in Supabase Vault, encrypted at rest, and only the seal routine reads it; nobody was shown it. But anyone with database owner rights can still read it, so it does not meet "nobody with database access, including an administrator, can recreate the key". You decided (21 Oct, 20:51) that this stands for the sandbox and that before activation the seal becomes a key pair signature held by the commit service alone, with the key version on every seal. That is recorded as CR-173 and is not built yet.

**2. Environment.** The changes went to the live Supabase project `the-3rd-academy` (region us-east-1, created 20 September 2026, 15 accounts), not to a separate sandbox. There never was a separate Supabase project; the throwaway Postgres used for tests holds synthetic data only. Nothing is servable: no source approved, no consent, mentor or clearance, Stage 4 closed, every new table closed to the Data API, nothing activated. But it is the live project, and your emails say "authorized for the sandbox only". Please tell Hans whether you count this project as the sandbox. Until you do, no further change is applied to it (CR-177).

**3. Going live.** Understood and unchanged: CORR-007 built with BUILD COMPLETE, then mentors calibrated and authorized, then your activation decision.

## Service providers (for Sections 2.31 and 2.32), as found in the code and configuration

| Provider | What it does here | Where it processes data |
|---|---|---|
| Supabase | Database, sign in, storage, edge functions (`send-email`, `realtime-notify`) | United States (us-east-1). **Not Canada.** The Session Archive request asks for Canada hosting and says to record a gap if the region is not Canada: this is that gap |
| Vercel | Hosts and builds the web app | United States build region (Washington, D.C.); serving locations not checked |
| Google Workspace (Gmail, Drive, Meet) | Staff email, shared documents, the live sessions on Meet | Not checked here |
| Neon | Throwaway test database, synthetic data only, never real participants | United States |
| GitHub | Source code | United States |
| An email sending service called by the `send-email` function | Platform email | Not verified: needs the function's configuration |
| AI and web services called by the chat and assistant code (a0.dev, Kilo gateway, OpenRouter, Jina reader, DuckDuckGo, PiPilot) | The AI assistant and research features | Not verified. These must be reviewed before any participant content can reach them; the Stage 1 note and the notice must not claim otherwise |

Items marked not verified need Hans or you to confirm; I did not state a country I could not check.

## Access events and what each Stage stores

Access events are logged through the event registry (122 event names in 12 categories: commercial, consent, employer, governance, mentor, observation, participant, program, registry, rehearsal, report, system). The 18 tables that carry a Stage code are listed in `return/data-dictionary-as-built.csv`. A reviewed, written Stage by Stage statement of what is stored still has to be written from the dictionary; it should be checked against Section 4 of the notice before it is sent.
