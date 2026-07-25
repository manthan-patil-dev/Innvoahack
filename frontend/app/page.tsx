import Link from "next/link";
import { LogoLockup, LogoMark } from "@/components/brand/Logo";
import { LifeCoreOrbital } from "@/components/brand/LifeCoreOrbital";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

const PIPELINE = [
  { label: "You", role: "A request in plain language" },
  { label: "Intent", role: "Classifies the domains involved" },
  { label: "Planner", role: "Decomposes into ordered sub-tasks" },
  { label: "Router", role: "Dispatches to the right specialists" },
  { label: "Specialists", role: "Finance, Travel, Security, Document" },
  { label: "Critic", role: "Validates and forces retries" },
  { label: "Response", role: "Synthesises one unified answer" },
];

const CAPABILITIES = [
  {
    eyebrow: "FinanceAgent",
    title: "Money, read properly.",
    body: "Categorises a month of spending, finds the subscriptions you stopped using, and tells you which single cancellation is worth the most. Not a chart — a decision.",
    stat: "₹2,217",
    statLabel: "Monthly leak found in the demo account",
  },
  {
    eyebrow: "SecurityAgent",
    title: "The link you were about to open.",
    body: "Scores URLs and messages against phishing indicators — lookalike domains, registration age, certificate state, urgency language — and explains why in plain words.",
    stat: "94 / 100",
    statLabel: "Risk score on a lookalike bank domain",
  },
  {
    eyebrow: "TravelAgent · DocumentAgent",
    title: "Plans that respect a budget.",
    body: "A three-day itinerary that stays inside the cap, or an invoice reduced to what you owe and by when. When the first attempt broke the budget, the Critic sent it back.",
    stat: "₹25,000",
    statLabel: "Cap held after one automatic retry",
  },
];

const LIFECORE = [
  {
    title: "Memory",
    body: "Preferences, constraints and patterns persist between sessions. It remembers that you prefer trains under 800km.",
  },
  {
    title: "Orchestration",
    body: "Every request walks the same path. Nothing bypasses LifeCore, so nothing arrives as a disconnected tool output.",
  },
  {
    title: "Self-correction",
    body: "The Critic validates every specialist output before synthesis, and forces a retry when something is wrong.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-[clamp(20px,5vw,64px)]">
          <Link href="/" aria-label="LifeOS AI home">
            <LogoLockup markSize={24} />
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="#how" className="hidden text-ui text-ink-muted transition-colors duration-fast hover:text-ink sm:inline">
              How it works
            </Link>
            <Link href="#agents" className="hidden text-ui text-ink-muted transition-colors duration-fast hover:text-ink sm:inline">
              Agents
            </Link>
            <ThemeToggle />
            <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
              Open LifeOS
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero --------------------------------------------------------------- */}
      <section className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-20 sm:py-28 lg:py-36">
        <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-fade-blur">
            <SectionLabel className="mb-7">Agentic AI · LifeCore Engine</SectionLabel>

            <h1 className="font-display text-display-xl">
              The AI Operating System
              <br />
              for your entire digital life.
            </h1>

            <p className="mt-8 max-w-prose text-body text-ink-muted">
              Most AI tools hand you a pile of separate answers. LifeOS runs nine agents through one
              orchestrator and hands you a single decision — with the reasoning attached.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/app" className={buttonVariants({ size: "lg" })}>
                Open LifeOS
              </Link>
              <Link href="#how" className={buttonVariants({ size: "lg", variant: "outline" })}>
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[420px] lg:max-w-none">
            <LifeCoreOrbital />
          </div>
        </div>
      </section>

      {/* Pipeline ------------------------------------------------------------ */}
      <section id="how" className="border-t">
        <div className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-20 sm:py-28">
          <SectionLabel rule className="mb-10">
            One request. Nine agents. One answer.
          </SectionLabel>

          <h2 className="mb-14 max-w-[22ch] font-display text-display">
            Every request walks the same path.
          </h2>

          {/* Hairline grid — the gaps are the connectors. */}
          <ol className="grid gap-px border bg-line sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {PIPELINE.map((step, i) => (
              <li key={step.label} className="bg-bg p-5">
                <span className="eyebrow tnum">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-3 font-display text-h2">{step.label}</p>
                <p className="mt-2 text-meta leading-relaxed text-ink-muted">{step.role}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 max-w-prose text-ui text-ink-subtle">
            Nothing bypasses the orchestrator. That constraint is what makes the output feel like one
            system rather than a folder of tools.
          </p>
        </div>
      </section>

      {/* Capabilities --------------------------------------------------------- */}
      <section id="agents" className="border-t">
        <div className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-20 sm:py-28">
          <SectionLabel rule className="mb-16">
            The specialists
          </SectionLabel>

          <div className="space-y-20 sm:space-y-28">
            {CAPABILITIES.map((cap, i) => (
              <article
                key={cap.title}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <SectionLabel className="mb-5">{cap.eyebrow}</SectionLabel>
                  <h3 className="font-display text-display">{cap.title}</h3>
                  <p className="mt-6 max-w-prose text-body text-ink-muted">{cap.body}</p>
                </div>

                <div className="rounded-md border bg-surface p-10">
                  <p className="font-display text-numeric-lg tnum">{cap.stat}</p>
                  <p className="mt-3 max-w-[32ch] text-ui text-ink-muted">{cap.statLabel}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LifeCore ------------------------------------------------------------- */}
      <section className="border-t">
        <div className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-20 sm:py-28">
          <SectionLabel rule className="mb-10">
            The LifeCore engine
          </SectionLabel>

          <h2 className="mb-16 max-w-[24ch] font-display text-display">
            State, not sessions. It remembers between requests.
          </h2>

          <div className="grid gap-12 sm:grid-cols-3 sm:gap-10">
            {LIFECORE.map((item) => (
              <div key={item.title}>
                <h3 className="mb-3 font-display text-h1">{item.title}</h3>
                <p className="text-ui leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing -------------------------------------------------------------- */}
      <section className="border-t">
        <div className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-24 text-center sm:py-36">
          <h2 className="mx-auto max-w-[16ch] font-display text-display-xl">
            Stop assembling answers.
          </h2>
          <div className="mt-12">
            <Link href="/app" className={buttonVariants({ size: "lg" })}>
              Open LifeOS
            </Link>
          </div>
        </div>
      </section>

      {/* Footer --------------------------------------------------------------- */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-5 px-[clamp(20px,5vw,64px)] py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} className="text-gold" />
            <span className="text-meta text-ink-subtle">
              LifeOS AI · The AI Operating System For Your Entire Digital Life.
            </span>
          </div>
          <span className="text-meta text-ink-subtle">InnovaHack Chapter 1 · Agentic AI</span>
        </div>
      </footer>
    </div>
  );
}
