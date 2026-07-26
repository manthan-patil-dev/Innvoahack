# LifeOS AI — Engineering Audit

**Audit date:** 2026-07-26
**Commit audited:** `0f40b8b` (branch `main`)
**Method:** static read of every source file, plus live execution of the backend, frontend, Supabase project and Render deployment.
**Scope rule:** only implemented behaviour is credited. Anything not present in code is marked missing, with the evidence that establishes it.

---

## 1. Executive Summary

**Purpose.** LifeOS AI is a multi-agent orchestrator. One natural-language request is classified, decomposed, dispatched to domain specialists in parallel, validated by a critic that can force a retry, and synthesised into a single report with the reasoning trace attached.

**Stage.** Working vertical slice, deployed but not yet functioning end-to-end in production. The orchestration core is genuinely built and runs against a live LLM. The surrounding product surface is thinner than the feature list implies.

**Completion.**

| Measured against | Estimate |
|---|---|
| Its own implemented scope (orchestrator, auth, persistence, email) | **~78%** |
| The full feature list in the audit brief | **~52%** |

The gap is not partial work — it is features that were never started (Meeting, Search, Notifications, Group Expense Splitting). See §4.

**Architecture.** Two deployables plus one managed service:

```
Browser ──► Next.js 14 (Vercel)
              ├─ /api/runs, /api/actions, /api/email/report   ──► Supabase / Resend
              └─ /api/[...path]  (server-side proxy)          ──► FastAPI (Render) ──► Groq
```

**Hackathon readiness.** The concept is legible in ten seconds and the orchestration is real, not theatre. Two config-level defects currently stop the deployed app from working at all.

---

## 2. Technology & Architecture

| Layer | Actual implementation | Evidence |
|---|---|---|
| Frontend | Next.js 14.2.35, App Router, React 18, TypeScript strict | `frontend/package.json`, `tsconfig.json` (`"strict": true`) |
| Backend | FastAPI 0.115.6 + Uvicorn, Python 3.11.9 | `backend/requirements.txt`, `backend/.python-version` |
| Database | Supabase Postgres, 9 tables + 1 view, RLS on every table | `supabase/schema.sql` (566 lines) |
| Auth | Supabase Auth, email/password, `@supabase/ssr` cookie sessions | `lib/supabase/{client,server,middleware}.ts` |
| LLM | Groq `llama-3.3-70b-versatile`; OpenAI/Gemini/Lyzr/Anthropic optional; fixtures last | `lyzr_client.py:280-351` |
| State | React hooks only. No Redux/Zustand/React Query | `lib/hooks/useRun.ts`, `useHealth.ts` |
| Styling | Tailwind + CSS custom properties, light/dark via `next-themes` | `app/globals.css`, `tailwind.config.ts` |
| Deployment | Vercel (frontend), Render (backend), Supabase (data) | `render.yaml`, `vercel.json` |
| Email | Resend REST via `fetch`, no SDK | `lib/email/resend.ts` |

**Request flow.** Browser → same-origin `/api/chat` → Next proxy (strips `Host`, `cookie`, hop-by-hop headers; 55s timeout) → FastAPI → `LifeCore.run()` → Intent → Planner → Router → specialists in `asyncio.gather` → Critic per output with at most one retry → Response. Result returns in one payload; the frontend replays the trace using server-supplied `elapsedMs`. Persistence fires afterwards, best-effort.

**Notable architectural decision.** `API_BASE = ""` (`lib/api/client.ts:12`) forces every browser call same-origin. This removes CORS from the system entirely and keeps the backend host out of the client bundle — verified: `innvoahack.onrender.com` appears in **0** files under `.next/static`.

---

## 3. Project Structure

```
backend/app/
  main.py                 FastAPI app, CORS, lifespan
  config.py               pydantic-settings, all providers
  routes/                 chat.py, health.py
  schemas/chat.py         wire contract, mirrors the TS types
  services/
    orchestrator.py       LifeCore — the pipeline (321 lines)
    lyzr_client.py        provider abstraction + degradation chain
    mocks.py              scripted fixtures
    agents/               8 agent modules + base.py
frontend/
  app/                    landing, login, /app, /app/history, /styleguide, 4 route handlers
  components/             brand, product, results, shell, states, ui
  lib/                    api, auth, email, hooks, supabase, types, mock
supabase/schema.sql       full schema, idempotent
```

**Total: 9,165 lines** of TS/TSX/Python/SQL.

**Strong points.** Clean layering — `lib/api/client.ts` is the only module that knows the backend speaks HTTP; `lib/supabase/queries.ts` is the only module that issues SQL. The backend schema is a deliberate 1:1 mirror of the TypeScript contract.

**Dead code / debt.**

| Item | Evidence | Impact |
|---|---|---|
| `SCENARIOS` fixture set (~400 lines) | `lib/mock/agentOutputs.ts:423` — defined, imported nowhere | Dead since History moved to Supabase. Only `DEMO_PROMPTS` is used |
| `project-root/scripts/create_lyzr_agents.py` | **0 bytes** | Empty file committed; also an orphan directory outside both apps |
| `document_text`, `expenses` request fields | `lib/types/agents.ts:221-222`, `schemas/chat.py:203-206` | Defined in both contracts, never populated by any caller |
| `vercel.json` `rewrites` | `/api/(.*)` → `/api/$1` | Self-referential no-op |
| `CLAUDE_MODEL` in `.env` | Anthropic not installed | Harmless but misleading |

**No unused npm dependencies** — all 9 runtime deps are imported.

---

## 4. Feature Audit

| Feature | Status | % | Demo Ready | Notes |
|---|---|---|---|---|
| Landing page | ✅ | 100 | Yes | `app/page.tsx`, 227 lines, full editorial layout |
| Authentication | ✅ | 95 | Yes | Supabase Auth, sign-in + sign-up, `middleware.ts` guards `/app/:path*`; verified httpOnly, forged-cookie rejection, deep-link return |
| Theme (light/dark) | ✅ | 100 | Yes | `next-themes`, `data-theme`, full token set both modes |
| Responsive UI | ✅ | 90 | Yes | 41 `sm:`, 20 `lg:`, 4 `md:`, 2 `xl:`. Verified no horizontal overflow at 375/768 |
| AI Workspace | ✅ | 90 | Yes | `app/app/page.tsx` — trace, results, report, actions |
| Chat input | 🟡 | 70 | Yes | Text works. Attach button is inert (below) |
| LifeCore Engine | ✅ | 95 | Yes | `orchestrator.py` — real sequential+parallel pipeline |
| Agent Orchestration | ✅ | 95 | Yes | 8 agents + inline Router; `asyncio.gather` for specialists |
| Finance Intelligence | ✅ | 85 | Yes | Real agent + schema; simulates when no `expenses` supplied |
| Security Intelligence | ✅ | 85 | Yes | Real agent, risk scoring, red flags |
| Travel Intelligence | ✅ | 88 | Yes | Prompt enforces exact budget arithmetic, tradeoffs, next steps |
| Document Intelligence | 🟡 | 60 | Partial | Agent is real, but **no file ever reaches it** — see Upload |
| Unified Report | ✅ | 95 | Yes | Markdown render, alerts, collapsible activity log with timings/retries |
| Priority Engine | ✅ | 80 | Yes | `priority_alerts` + `lib/actions.ts` ranking and dedup |
| Action Center | ✅ | 85 | Yes | Cross-agent aggregation, attributed, persists ticks |
| Life Score | 🟡 | 50 | Yes | **Model-authored, not computed.** Idle state shows hardcoded `{68, 95, 82}` (`SystemPanel.tsx:7`) |
| Demo Mode | ✅ | 95 | Yes | Fixture fallback + honest `DemoNotice` keyed on `run.backend` |
| Session Memory | 🟡 | 40 | Partial | `memories` table + seeding exist; **nothing writes memory from a run** |
| History | 🟡 | 70 | **No** | Reads real Supabase rows, but writes currently fail — see §8 CR-1 |
| Loading / Error states | ✅ | 95 | Yes | Skeletons, `AlertBanner`, honest degraded copy throughout |
| Email report | ✅ | 90 | Yes | Resend, server-side key, delivery audit incl. failures |
| Dashboard Intelligence | 🟡 | 45 | Yes | `SystemPanel` renders scores/reminders; no independent dashboard logic |
| Reminder Intelligence | 🟡 | 30 | Partial | Reminders **rendered** from `ResponseAgent` output. No reminder agent, no scheduling, no delivery |
| Shared Intelligence | 🟡 | 60 | Yes | Critic sees each specialist output; specialists do **not** see each other |
| Document Upload | ⚪ | 5 | **No** | `ChatComposer.tsx:44-50` — button has **no `onClick`**. `document_text` never sent |
| Search | 🔴 | 0 | No | No search UI, route, or query anywhere |
| Notifications | 🔴 | 0 | No | Zero occurrences in the codebase |
| Meeting Intelligence | 🔴 | 0 | No | Zero occurrences. No agent, schema, or UI |
| Travel Group Expense Splitting | 🔴 | 0 | No | Zero occurrences |

**Removed:** HMAC cookie auth (replaced by Supabase Auth); frontend-fixture History (replaced by DB reads); hardcoded "Recent runs" labelling.

**Simplified:** Anthropic reduced to optional and uninstalled; `LLM_BACKEND` pinned to `groq` rather than `auto`.

**Declared but unimplemented:** document upload pipeline, expense ingestion, memory writeback, vector recall (`history/page.tsx` states this in UI copy — honest).

---

## 5. AI Workflow Analysis

**Real.**
- Pipeline sequencing and parallelism — `asyncio.gather` over planned specialists (`orchestrator.py:127`).
- Critic validation with one retry, objections fed back into the retry prompt (`_critique_and_maybe_retry`, line 278).
- Plan sanitisation — drops non-specialists, dedupes, caps at 5, guarantees ≥1 step (`_sanitise_plan`, line 237).
- Provider degradation: Lyzr → Claude → OpenAI → Groq → Gemini → fixtures, per agent call.
- Honest provenance: `backend` reports what *served* the run, so a partial fallback surfaces as `groq+mock`.
- `action_log` rebuilt server-side from observed nodes, not trusted from the model (line 193).

**Mock.** `mocks.py` scripted fixtures — always the last link, and disclosed in UI whenever `run.backend` contains `mock`.

**Static / placeholder.**
- Idle Life Score `{68, 95, 82}` — hardcoded constant.
- `finance_score` / `security_score` / `life_score` are **LLM-authored**, unverified server-side. Only `action_log` is recomputed. A judge asking "who calculated 82?" gets "the model asserted it."
- Reminders originate in `ResponseAgent` JSON; nothing schedules or delivers them.

**Cross-intelligence collaboration** is weaker than the marketing implies: specialists run in parallel and never observe one another. Integration happens only at Critic (per-output) and Response (synthesis). That is a real orchestration pattern, but it is not agents collaborating.

---

## 6. UI / UX Review

| Area | Score | Evidence |
|---|---|---|
| Design consistency | **9/10** | Single token system; disciplined gold accent; `.eyebrow`/`.prose-lifeos` primitives |
| Responsiveness | **8.5/10** | Verified 375/768/1280. Wide tables scroll in their own container, page never does |
| Accessibility | **7/10** | `role=alert/dialog/img/status`, `aria-live`, `aria-current`, focus rings, `sr-only`. Gaps: only 2 `sr-only` uses, no skip-link, no focus trap in popovers |
| Premium feel | **9.5/10** | Editorial serif + Inter, hairline borders, restrained motion. Genuinely above hackathon norm |
| Navigation | **8/10** | Rail + mobile fallback. Only two destinations |
| UX honesty | **9.5/10** | Degraded states name the cause and the fix. Rare and valuable |
| Overall UX | **8.5/10** | Strong. Main gap is the inert attach affordance |

---

## 7. Engineering Review

**Strengths.**
- TypeScript `strict`, zero `tsc` errors, zero ESLint warnings at audit time.
- Backend/frontend contracts mirrored deliberately and documented as such.
- Security posture is better than typical: **no service-role key anywhere** — all DB access runs as the signed-in user under RLS; Resend key server-only; proxy strips `Host`/`cookie`; open-redirect guard on `?next`; rate limiting on email.
- Failure design is deliberate — degradation chains, best-effort persistence that never blocks the UI.
- Comments explain *why*, not *what*.

**Debt.**
- No automated test suite. `smoke_test.py` and `contract_test.py` are scripts requiring a live server; no unit tests, no frontend tests, no CI.
- `rateLimit.ts` is per-instance in-memory — resets on restart, ineffective across serverless instances. Documented, but not a real control.
- No structured logging or error tracking; failures go to `console.error`.
- `mocks.py` fixtures are hardcoded Goa/HDFC content — fine for demo, unscalable.
- Empty `create_lyzr_agents.py` and orphan `project-root/`.

**Scalability.** Stateless backend scales horizontally. Real ceiling is the Groq free tier: 12,000 TPM, and one run reserves ~8,000 concurrently. Roughly one run per minute per key.

---

## 8. Bugs & Risks

### 🔴 Critical

**CR-1 — Run persistence is broken; History is permanently empty.**
*Location:* `lib/supabase/queries.ts` / Supabase data.
*Evidence:* live server log —
```
[db] persistRun failed: violates foreign key constraint "runs_user_id_fkey"
[db] ensureProfile failed: duplicate key ... "profiles_email_key"
```
*Cause:* schema **v1** was applied, seeding a profile at fixed uuid `00000000-…-0001` with `judge@lifeos.ai`. The real auth user later signed up with the same email under a different uuid. `runs.user_id` points at a non-existent profile.
*Impact:* every run silently fails to save while the UI reports success. History, action persistence and email audit are all dead.
*Fix:* re-run `supabase/schema.sql`. Section 2.10 deletes profiles with no matching auth user, adds the `auth.users` FK, installs the trigger and backfills. **Cannot be fixed in app code** — RLS correctly forbids a request handler from deleting a row it does not own.

**CR-2 — Deployed frontend cannot reach the backend.**
*Evidence:* live preflight test — origin `https://innvoahack.vercel.app/` returns **200**, `https://innvoahack.vercel.app` returns **400**. Browsers only send the latter.
*Cause:* Render `CORS_ORIGINS` has a trailing slash.
*Fix:* remove the slash **or** deploy commit `bec6bff`, which routes all browser calls same-origin and makes CORS irrelevant. `28a6cde` also makes the backend strip the slash.

### 🟡 Major

**MA-1 — Document upload is a non-functional affordance.** `ChatComposer.tsx:44-50` renders "Attach a document" with no handler. A judge will click it. *Fix:* wire it or remove it. Removing is honest and takes one minute.

**MA-2 — Life Score presented as computed, actually asserted.** `SystemPanel.tsx:7` hardcodes the idle triple; run-time values are LLM output. *Fix:* compute `life_score` server-side from domain scores, or label it as model-generated.

**MA-3 — Groq TPM ceiling causes visible degradation.** 12,000 TPM vs ~8,000 reserved per run. Two runs inside a minute fall back to fixtures mid-pipeline. *Fix:* `llama-3.1-8b-instant` for Critic/Intent/Planner, or accept and pace the demo.

**MA-4 — No automated tests or CI.** Two live-server scripts only.

### 🟢 Minor

- **MI-1** Dead `SCENARIOS` block, ~400 lines (`lib/mock/agentOutputs.ts:423`).
- **MI-2** Empty `project-root/scripts/create_lyzr_agents.py` (0 bytes).
- **MI-3** No-op `rewrites` in `vercel.json`.
- **MI-4** `/styleguide` publicly reachable and labelled "INTERNAL · DESIGN SYSTEM". No data exposure.
- **MI-5** In-memory rate limiter ineffective on serverless.
- **MI-6** `document_text` / `expenses` defined in both contracts, never sent.

---

## 9. Hackathon Assessment

**Understandable?** Yes. "One request, nine agents, one answer" plus a visible trace communicates the idea faster than most entries.

**Demonstrates Agentic AI?** Genuinely yes — and the Critic is the differentiator. Visible self-correction with the rejection reason attached ("CriticAgent rejected the first pass: the output does not provide a specific budget breakdown") is the strongest single artefact here. Most hackathon "multi-agent" projects are one prompt in a loop; this is not.

**Convincing workflows?** Mostly. The pipeline is real and timings are real. The weakness under questioning: specialists never see each other, so "collaboration" is really orchestration.

**Demo Mode effective?** Yes, and unusually honest. It states when content is canned, keyed on the serving backend rather than on prose — so editing a fixture cannot silently remove the disclosure.

**Presentation-ready UI?** Yes. The strongest dimension.

**What would impress judges most.**
1. Critic-forced retry, surfaced with its reason.
2. Activity log with real per-agent timings and attempt counts.
3. Honest degradation — "Served from scripted fixtures" instead of faking success.
4. Editorial visual design.
5. RLS-only data access with no service-role key.

**What would reduce the score.**
1. History empty because persistence is broken (CR-1).
2. Deployed app not working (CR-2).
3. Clicking the dead attach button.
4. "Where does 82 come from?" having no good answer.
5. Feature list implying Meeting/Search/Notifications that do not exist.

| Criterion | Score |
|---|---|
| Innovation | **7.5/10** |
| Technical Depth | **8.5/10** |
| UI/UX | **9/10** |
| Engineering | **8/10** |
| Real-World Impact | **6.5/10** |
| Scalability | **6/10** |
| Overall Presentation | **8.5/10** |

---

## 10. Final Verdict

**Overall completion:** ~78% of implemented scope; ~52% of the brief's feature list.
**Overall project score:** **7.9/10**
**Hackathon winning potential:** **7.5/10** — rising to ~8.5 with CR-1 and CR-2 fixed, which is roughly fifteen minutes of work.

### Top 10 strengths
1. Orchestration is real, not simulated.
2. Critic retry loop is a genuine differentiator, and visible.
3. Honesty as a design principle — degraded states name cause and fix.
4. Editorial UI well above hackathon norm.
5. No service-role key; RLS is the actual gate.
6. Provider degradation chain means the demo cannot hard-fail.
7. Backend/frontend contracts mirrored 1:1.
8. `action_log` recomputed server-side, not trusted from the model.
9. Same-origin proxy removes CORS and hides the backend host.
10. Clean layering — one HTTP module, one SQL module.

### Top 10 weaknesses
1. Persistence broken in production (CR-1).
2. Deployed frontend cannot reach backend (CR-2).
3. Document upload inert.
4. Life Score asserted, not computed.
5. No memory writeback despite "it remembers" messaging.
6. Four brief-listed features entirely absent.
7. No automated tests or CI.
8. Groq TPM ceiling degrades back-to-back runs.
9. ~400 lines of dead fixture code.
10. Specialists never see each other's output.

### Top 10 priority improvements
1. **Re-run `supabase/schema.sql`** — unblocks CR-1. *(2 min)*
2. **Deploy `bec6bff`** or drop the trailing slash — unblocks CR-2. *(5 min)*
3. **Remove or wire the attach button.** *(1 min / 2 h)*
4. **Compute `life_score` server-side** from domain scores. *(20 min)*
5. **Delete `SCENARIOS` and the empty script.** *(5 min)*
6. Downgrade Critic/Intent/Planner to an 8B model to relieve TPM. *(10 min)*
7. Write memory rows from completed runs — makes the memory claim true. *(1–2 h)*
8. Add unit tests for `_sanitise_plan`, `collectActions`, `markdownToEmailHtml`. *(2 h)*
9. Align the pitch to implemented features only.
10. Add a skip-link and focus trap for accessibility. *(30 min)*

---

# 🟡 READY WITH MINOR IMPROVEMENTS

The codebase is in better shape than the deployment. Engineering quality, honesty of the degraded states, and the visible Critic loop are all genuinely strong, and no code change is required to reach a working demo.

Both blockers are configuration: one SQL re-run and one deploy. Until they are done the live URL does not work and History stays empty — so on the current deployed state a judge would score this materially lower than the code deserves.

*Every claim above is traceable to a cited file, line, live log, or executed command. No planned or intended functionality has been credited.*
