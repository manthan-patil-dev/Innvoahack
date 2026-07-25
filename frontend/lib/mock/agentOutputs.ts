import type { Scenario } from "@/lib/types/agents";

/* ============================================================================
   Scripted runs for the three demo scenarios.

   Every object here satisfies the Phase 5 contracts in lib/types/agents.ts.
   Replacing this file with a real fetch to /api/chat is the entire backend
   integration — no component touches this module directly except lib/run.ts.
   ========================================================================== */

export const DEMO_PROMPTS = [
  "Plan my Goa trip under ₹25,000.",
  "Analyze my spending this month.",
  "Summarize this electricity bill and check if this link is safe.",
] as const;

/* --- Shared finance picture, so numbers agree across demos ---------------- */

const FINANCE = {
  summary:
    "You spent ₹42,380 this month, about 9% more than your six-month average. Rent and dining account for nearly two thirds of it, and four subscriptions are drawing ₹2,217 a month with little or no use.",
  monthly_total: 42380,
  top_categories: [
    { name: "Rent", amount: 15000, percentage: 35 },
    { name: "Food & Dining", amount: 11240, percentage: 27 },
    { name: "Shopping", amount: 5600, percentage: 13 },
    { name: "Transport", amount: 4100, percentage: 10 },
    { name: "Subscriptions", amount: 2890, percentage: 7 },
    { name: "Other", amount: 3550, percentage: 8 },
  ],
  subscription_leaks: [
    "Netflix Premium ₹649 — last opened 41 days ago",
    "Gold's Gym ₹1,200 — no check-in for 9 weeks",
    "iCloud 200GB ₹219 — 12GB of 200GB used",
    "Spotify Duo ₹149 — second seat unused",
  ],
  savings_opportunities: [
    "Downgrade Netflix Premium to Standard saves ₹250/month",
    "Cancel the unused gym membership saves ₹1,200/month",
    "Drop iCloud to the 50GB tier saves ₹144/month",
    "Move Spotify Duo to Individual saves ₹30/month",
  ],
  finance_score: 68,
  recommendations: [
    "Cancel the gym membership and redirect ₹1,200 to a recurring deposit — it is your single largest dead cost.",
    "Cap dining at ₹8,000 next month; you have crossed ₹11,000 three months running.",
    "Set a ₹3,000 auto-transfer on the 2nd, before discretionary spending starts.",
  ],
  alerts: ["Dining spend has exceeded its cap for three consecutive months."],
};

/* --- Scenario 1 — Goa trip (travel + finance, with a Critic retry) -------- */

const goa: Scenario = {
  id: "travel",
  query: "Plan my Goa trip under ₹25,000.",
  intent: {
    domains: ["travel", "finance"],
    complexity: "multi",
    requires_file: false,
    clarification_needed: false,
    clarification_question: null,
  },
  plan: [
    { step: 1, task: "Build a 3-day Goa itinerary within ₹25,000", agent: "TravelAgent", input_key: "trip_query" },
    { step: 2, task: "Check the trip against current cash flow", agent: "FinanceAgent", input_key: "user_expenses" },
  ],
  nodes: [
    { step: 1, agent: "IntentAgent", label: "Classified as travel and finance, multi-step", status: "pending", attempts: 1 },
    { step: 2, agent: "PlannerAgent", label: "Broke the request into 2 ordered sub-tasks", status: "pending", attempts: 1 },
    { step: 3, agent: "RouterAgent", label: "Dispatched to TravelAgent and FinanceAgent", status: "pending", attempts: 1 },
    {
      step: 4,
      agent: "TravelAgent",
      label: "Built a 3-day itinerary inside the ₹25,000 cap",
      status: "pending",
      attempts: 2,
      retried: true,
      note: "First pass came back ₹1,800 over budget — retried with an explicit cap.",
    },
    { step: 5, agent: "FinanceAgent", label: "Checked the trip against your cash flow", status: "pending", attempts: 1 },
    { step: 6, agent: "CriticAgent", label: "Validated 2 outputs, triggered 1 retry", status: "pending", attempts: 1 },
    { step: 7, agent: "ResponseAgent", label: "Synthesised one unified trip plan", status: "pending", attempts: 1 },
  ],
  results: [
    {
      agent: "TravelAgent",
      output: {
        destination: "Goa",
        budget_total: 25000,
        itinerary: [
          {
            day: 1,
            activities: [
              "Overnight sleeper from Mumbai, arrive Madgaon 09:40",
              "Check in at a guesthouse in Anjuna, drop bags",
              "Scooter rental for the full trip, ₹400/day",
              "Sunset at Vagator, dinner at Thalassa",
            ],
            estimated_cost: 9200,
          },
          {
            day: 2,
            activities: [
              "Early ride to Arambol, breakfast at a beach shack",
              "Chapora Fort before the afternoon heat",
              "Saturday night market at Arpora",
            ],
            estimated_cost: 7600,
          },
          {
            day: 3,
            activities: [
              "Old Goa churches, Basilica of Bom Jesus",
              "Panjim Latin Quarter walk, lunch at Viva Panjim",
              "Evening train back, departs Madgaon 19:15",
            ],
            estimated_cost: 6200,
          },
        ],
        budget_breakdown: { transport: 6000, hotel: 8500, food: 5000, activities: 3500, buffer: 2000 },
        packing_checklist: [
          "Government photo ID — mandatory for hotel check-in",
          "Driving licence, required for the scooter rental",
          "Two changes of swimwear",
          "Reef-safe sunscreen, SPF 50",
          "Light cotton layers, one full-sleeve for evenings",
          "Flip-flops and one pair of closed shoes for the forts",
          "Power bank and a universal charger",
          "Basic medical kit — ORS, antiseptic, motion sickness tablets",
          "₹3,000 in cash; several shacks are still cash-only",
          "Dry bag for phone and wallet on beach days",
        ],
        tips: [
          "Book the sleeper at least 10 days out — Konkan Railway fills fast on weekends.",
          "Rent the scooter for the whole trip rather than per day; the daily rate drops to ₹400.",
          "Shacks north of Anjuna are roughly 30% cheaper than the Baga strip for the same food.",
        ],
        warnings: [
          "This plan assumes a non-peak weekend. Rates rise sharply from 20 December.",
        ],
        travel_score: 88,
      },
    },
    { agent: "FinanceAgent", output: FINANCE },
  ],
  critic: [
    {
      agent: "TravelAgent",
      valid: true,
      issues: ["First attempt totalled ₹26,800, exceeding the stated ₹25,000 cap."],
      retry_needed: true,
      corrected_output: null,
    },
    { agent: "FinanceAgent", valid: true, issues: [], retry_needed: false, corrected_output: null },
  ],
  response: {
    headline: "Your Goa trip fits at ₹25,000 — and cancelling one unused subscription pays for a fifth of it.",
    unified_report: `## The trip

Three days in North Goa for **₹25,000**, travelling by Konkan Railway sleeper rather than flying. That single choice is what keeps the plan inside your cap — flights on this route would have taken ₹9,000–11,000 of the budget on their own.

The itinerary is deliberately north-weighted: Anjuna as a base, Arambol and Chapora on day two, and Old Goa and Panjim on the way back to the station. Nothing in it requires a taxi.

## Where the money goes

| Category | Amount |
| --- | --- |
| Transport | ₹6,000 |
| Accommodation | ₹8,500 |
| Food | ₹5,000 |
| Activities | ₹3,500 |
| Buffer | ₹2,000 |

The ₹2,000 buffer is real, not decorative — it covers one bad-weather day or a scooter deposit without breaking the cap.

## How this sits against your money

Your current run rate is **₹42,380 a month**, roughly 9% above your six-month average. A ₹25,000 trip on top of that is affordable, but not comfortably so in the same month.

Two options:

1. **Cancel the gym membership** you have not used in nine weeks. That is ₹1,200 a month recovered, and over a two-month runway it covers ₹2,400 of this trip.
2. **Shift the trip by three weeks** so it lands after your next salary credit rather than alongside this month's rent.

Taking both would put the trip well inside your means rather than at the edge of them.

## One caution

The plan assumes a non-peak weekend. From 20 December, accommodation on this stretch roughly doubles and the ₹8,500 line will not hold.`,
    priority_alerts: [
      { level: "NORMAL", message: "Trip is affordable this month, but leaves a thin margin." },
      { level: "HIGH", message: "₹2,217/month is going to four subscriptions you are barely using." },
    ],
    action_log: [
      { step: 1, agent: "IntentAgent", action: "Classified request as travel + finance", status: "SUCCESS" },
      { step: 2, agent: "PlannerAgent", action: "Decomposed into 2 sub-tasks", status: "SUCCESS" },
      { step: 3, agent: "RouterAgent", action: "Dispatched to 2 specialist agents", status: "SUCCESS" },
      { step: 4, agent: "TravelAgent", action: "Rebuilt itinerary within budget cap", status: "RETRY" },
      { step: 5, agent: "FinanceAgent", action: "Assessed affordability against cash flow", status: "SUCCESS" },
      { step: 6, agent: "CriticAgent", action: "Validated 2 outputs, forced 1 retry", status: "SUCCESS" },
      { step: 7, agent: "ResponseAgent", action: "Synthesised unified report", status: "SUCCESS" },
    ],
    dashboard_updates: {
      finance_score: 68,
      security_score: 95,
      life_score: 84,
      reminders: [
        { id: "r1", title: "Book Konkan Railway sleeper (10-day lead time)", due: "2026-08-02", priority: "HIGH", source: "TravelAgent" },
        { id: "r2", title: "Cancel Gold's Gym membership", due: "2026-07-31", priority: "MEDIUM", source: "FinanceAgent" },
      ],
    },
  },
};

/* --- Scenario 2 — spending analysis (finance only) ------------------------ */

const finance: Scenario = {
  id: "finance",
  query: "Analyze my spending this month.",
  intent: {
    domains: ["finance"],
    complexity: "single",
    requires_file: false,
    clarification_needed: false,
    clarification_question: null,
  },
  plan: [
    { step: 1, task: "Analyse this month's transactions and surface leaks", agent: "FinanceAgent", input_key: "user_expenses" },
  ],
  nodes: [
    { step: 1, agent: "IntentAgent", label: "Classified as finance, single-domain", status: "pending", attempts: 1 },
    { step: 2, agent: "PlannerAgent", label: "Reduced to a single analysis task", status: "pending", attempts: 1 },
    { step: 3, agent: "RouterAgent", label: "Dispatched to FinanceAgent", status: "pending", attempts: 1 },
    { step: 4, agent: "FinanceAgent", label: "Analysed 34 transactions across 6 categories", status: "pending", attempts: 1 },
    { step: 5, agent: "CriticAgent", label: "Validated output, no retry needed", status: "pending", attempts: 1 },
    { step: 6, agent: "ResponseAgent", label: "Synthesised the budget report", status: "pending", attempts: 1 },
  ],
  results: [{ agent: "FinanceAgent", output: FINANCE }],
  critic: [{ agent: "FinanceAgent", valid: true, issues: [], retry_needed: false, corrected_output: null }],
  response: {
    headline: "₹42,380 spent this month — ₹2,217 of it on subscriptions you are not using.",
    unified_report: `## The month in one line

You spent **₹42,380**, about 9% above your six-month average. Nothing here is alarming, but three things are quietly leaking money.

## Where it went

Rent and dining are 62% of the total between them. That ratio is not unusual, but dining at **₹11,240** is the third consecutive month above your own ₹8,000 cap — this is now a pattern rather than a bad month.

## The leaks

Four subscriptions are drawing **₹2,217 every month**:

- Netflix Premium, ₹649 — last opened 41 days ago
- Gold's Gym, ₹1,200 — no check-in for 9 weeks
- iCloud 200GB, ₹219 — you are using 12GB of it
- Spotify Duo, ₹149 — the second seat is unused

Acting on all four recovers **₹1,624 a month**, or ₹19,488 a year, with no change to how you actually live.

## What I would do first

1. **Cancel the gym.** It is the single largest dead cost and the easiest decision on this list.
2. **Cap dining at ₹8,000** next month. You have crossed it three times running, so a cap is worth more than an intention.
3. **Auto-transfer ₹3,000 on the 2nd**, before discretionary spending starts. Saving what is left over has not worked for you; saving first will.

Your finance score is **68 of 100** — healthy, held back mostly by the subscription drag and the dining trend rather than by anything structural.`,
    priority_alerts: [
      { level: "HIGH", message: "₹2,217/month going to four barely-used subscriptions." },
      { level: "NORMAL", message: "Dining has exceeded its cap three months running." },
    ],
    action_log: [
      { step: 1, agent: "IntentAgent", action: "Classified request as finance", status: "SUCCESS" },
      { step: 2, agent: "PlannerAgent", action: "Reduced to 1 analysis task", status: "SUCCESS" },
      { step: 3, agent: "RouterAgent", action: "Dispatched to FinanceAgent", status: "SUCCESS" },
      { step: 4, agent: "FinanceAgent", action: "Analysed 34 transactions", status: "SUCCESS" },
      { step: 5, agent: "CriticAgent", action: "Validated output", status: "SUCCESS" },
      { step: 6, agent: "ResponseAgent", action: "Synthesised budget report", status: "SUCCESS" },
    ],
    dashboard_updates: {
      finance_score: 68,
      security_score: 95,
      life_score: 82,
      reminders: [
        { id: "r3", title: "Cancel Gold's Gym membership", due: "2026-07-31", priority: "HIGH", source: "FinanceAgent" },
        { id: "r4", title: "Review Netflix tier before next billing date", due: "2026-08-04", priority: "MEDIUM", source: "FinanceAgent" },
      ],
    },
  },
};

/* --- Scenario 3 — document + security ------------------------------------ */

const combined: Scenario = {
  id: "security",
  query: "Summarize this electricity bill and check if this link is safe.",
  intent: {
    domains: ["document", "security"],
    complexity: "multi",
    requires_file: true,
    clarification_needed: false,
    clarification_question: null,
  },
  plan: [
    { step: 1, task: "Extract key data from the uploaded bill", agent: "DocumentAgent", input_key: "uploaded_file" },
    { step: 2, task: "Assess the supplied URL for phishing indicators", agent: "SecurityAgent", input_key: "url_input" },
  ],
  nodes: [
    { step: 1, agent: "IntentAgent", label: "Classified as document and security, file attached", status: "pending", attempts: 1 },
    { step: 2, agent: "PlannerAgent", label: "Broke the request into 2 parallel sub-tasks", status: "pending", attempts: 1 },
    { step: 3, agent: "RouterAgent", label: "Dispatched to DocumentAgent and SecurityAgent", status: "pending", attempts: 1 },
    { step: 4, agent: "DocumentAgent", label: "Extracted amount, due date and account number", status: "pending", attempts: 1 },
    { step: 5, agent: "SecurityAgent", label: "Scored the URL against phishing indicators", status: "pending", attempts: 1 },
    { step: 6, agent: "CriticAgent", label: "Validated 2 outputs, no retry needed", status: "pending", attempts: 1 },
    { step: 7, agent: "ResponseAgent", label: "Synthesised one combined report", status: "pending", attempts: 1 },
  ],
  results: [
    {
      agent: "DocumentAgent",
      output: {
        document_type: "Electricity Bill",
        summary:
          "A Maharashtra State Electricity Board bill for the June–July 2026 cycle totalling ₹12,480, due 1 August 2026. Consumption is 412 units, roughly 18% above the same cycle last year.",
        key_information: {
          Issuer: "MSEB — Maharashtra State Electricity Board",
          "Consumer number": "170024881933",
          "Billing period": "18 Jun 2026 – 17 Jul 2026",
          "Units consumed": "412 kWh",
          "Amount due": "₹12,480",
          "Due date": "2026-08-01",
          "Late payment penalty": "₹186 after due date",
        },
        expiry_dates: ["2026-08-01"],
        action_items: [
          "Pay ₹12,480 before 1 August 2026 to avoid the ₹186 late fee.",
          "Consumption is 18% above last year's same cycle — worth checking the water heater and AC usage.",
        ],
        importance_level: "HIGH",
      },
    },
    {
      agent: "SecurityAgent",
      output: {
        input_type: "url",
        risk_score: 94,
        risk_level: "CRITICAL",
        threat_type: "Credential phishing",
        explanation:
          "This link imitates HDFC Bank's login page using a lookalike domain. The real bank uses hdfcbank.com; this address is hdfcbank-secure-verify.in, which is registered to an unrelated party and was created 11 days ago. Legitimate banks do not move their login to a new domain, and they never ask you to re-verify through a link in a message.",
        red_flags: [
          "Lookalike domain — hdfcbank-secure-verify.in is not hdfcbank.com",
          "Domain registered 11 days ago",
          "No valid extended-validation certificate",
          "Page requests both your PIN and full card number",
          "Message uses account-suspension urgency to force a fast decision",
        ],
        recommendation:
          "Do not open this link and do not enter anything on it. If you have already entered details, call HDFC on the number printed on your card and block the card now. Report the message to your bank's fraud line.",
        safe_alternative: "https://www.hdfcbank.com",
      },
    },
  ],
  critic: [
    { agent: "DocumentAgent", valid: true, issues: [], retry_needed: false, corrected_output: null },
    { agent: "SecurityAgent", valid: true, issues: [], retry_needed: false, corrected_output: null },
  ],
  response: {
    headline: "The bill is routine. The link is a credential-phishing page — do not open it.",
    unified_report: `## Deal with the link first

The URL you sent is a **credential-phishing page**, scored 94 out of 100 for risk. It imitates HDFC Bank's login screen on the lookalike domain \`hdfcbank-secure-verify.in\`, which was registered eleven days ago and has no connection to the bank.

Five things give it away:

- The domain is not \`hdfcbank.com\`
- It was registered 11 days ago
- It has no extended-validation certificate
- It asks for your PIN *and* full card number on one screen
- The message uses account-suspension urgency to rush you

**Do not open it.** If you have already entered anything, call HDFC on the number printed on your card and block the card now. Your bank's real site is \`https://www.hdfcbank.com\` — reach it by typing it, not by following a link.

## The bill is straightforward

Your MSEB electricity bill for 18 June – 17 July is **₹12,480**, due **1 August 2026**. Paying after that adds a ₹186 late fee.

| Field | Value |
| --- | --- |
| Consumer number | 170024881933 |
| Units consumed | 412 kWh |
| Amount due | ₹12,480 |
| Due date | 1 August 2026 |

One thing worth noting: consumption is **18% higher** than the same cycle last year. That is a large enough jump to be worth checking your water heater and AC settings rather than writing off as a rate change.

I have set a reminder for 30 July, two days before the due date.`,
    priority_alerts: [
      { level: "CRITICAL", message: "Phishing link detected — do not open. Block your card if details were entered." },
      { level: "NORMAL", message: "Electricity bill of ₹12,480 due 1 August." },
    ],
    action_log: [
      { step: 1, agent: "IntentAgent", action: "Classified as document + security", status: "SUCCESS" },
      { step: 2, agent: "PlannerAgent", action: "Decomposed into 2 sub-tasks", status: "SUCCESS" },
      { step: 3, agent: "RouterAgent", action: "Dispatched to 2 specialist agents", status: "SUCCESS" },
      { step: 4, agent: "DocumentAgent", action: "Extracted 7 fields from the bill", status: "SUCCESS" },
      { step: 5, agent: "SecurityAgent", action: "Scored URL — CRITICAL, 94/100", status: "SUCCESS" },
      { step: 6, agent: "CriticAgent", action: "Validated 2 outputs", status: "SUCCESS" },
      { step: 7, agent: "ResponseAgent", action: "Synthesised combined report", status: "SUCCESS" },
    ],
    dashboard_updates: {
      finance_score: 68,
      security_score: 45,
      life_score: 57,
      reminders: [
        { id: "r5", title: "Pay MSEB electricity bill — ₹12,480", due: "2026-07-30", priority: "HIGH", source: "DocumentAgent" },
        { id: "r6", title: "Report phishing message to HDFC fraud line", due: "2026-07-26", priority: "HIGH", source: "SecurityAgent" },
      ],
    },
  },
};

export const SCENARIOS: Scenario[] = [goa, finance, combined];

/** Keyword routing so a judge can type freely and still land on a demo path. */
export function matchScenario(query: string): Scenario {
  const q = query.toLowerCase();
  const hasUrl = /https?:\/\/|www\.|\.(in|com|net|org)\b/.test(q);

  if (/goa|trip|travel|itinerar|vacation|holiday/.test(q)) return { ...goa, query };
  if (/phish|scam|safe|link|url|bill|invoice|document|pdf|summar/.test(q) || hasUrl) {
    return { ...combined, query };
  }
  return { ...finance, query };
}
