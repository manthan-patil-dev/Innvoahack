import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { LogoMark, LogoLockup, LogoStacked } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";

/**
 * Internal design-system proof. Verifies every token renders correctly in both
 * themes. Not linked from the product; delete before submission if desired.
 */

const SURFACES = [
  { name: "--bg", cls: "bg-bg" },
  { name: "--surface", cls: "bg-surface" },
  { name: "--surface-sunken", cls: "bg-surface-sunken" },
];

const INKS = [
  { name: "--ink", cls: "text-ink" },
  { name: "--ink-muted", cls: "text-ink-muted" },
  { name: "--ink-subtle", cls: "text-ink-subtle" },
];

const SCALE = [
  { label: "display-xl", cls: "font-display text-display-xl", sample: "Digital life" },
  { label: "display", cls: "font-display text-display", sample: "One unified answer" },
  { label: "h1", cls: "font-display text-h1", sample: "Finance analysis" },
  { label: "h2", cls: "font-ui text-h2 font-medium", sample: "Budget breakdown" },
  { label: "body", cls: "font-ui text-body", sample: "Your spending rose 12% against last month, driven mainly by dining and two subscriptions you have not opened in nine weeks." },
  { label: "ui", cls: "font-ui text-ui", sample: "Analyzed 34 transactions" },
  { label: "meta", cls: "font-ui text-meta text-ink-subtle", sample: "2 seconds ago · FinanceAgent" },
];

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-content px-[clamp(20px,5vw,64px)] py-16">
      <header className="mb-16 flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Internal · Design System</p>
          <h1 className="font-display text-display">LifeOS AI tokens</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Brand ------------------------------------------------------------ */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Logo system</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center gap-6 rounded-md border bg-surface p-8">
            <LogoMark size={72} withStar className="text-gold" />
            <p className="text-meta text-ink-subtle">Mark · 72px</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-6 rounded-md border bg-surface p-8">
            <div className="flex items-end gap-5">
              <LogoMark size={40} className="text-gold" />
              <LogoMark size={26} className="text-gold" />
              <LogoMark size={18} className="text-gold" />
            </div>
            <p className="text-meta text-ink-subtle">40 / 26 / 18px · star drops below 40</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-6 rounded-md border bg-surface p-8">
            <LogoMark size={40} className="text-ink" />
            <p className="text-meta text-ink-subtle">Monochrome</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-md border bg-surface p-10">
            <LogoLockup markSize={30} />
          </div>
          <div className="flex items-center justify-center rounded-md border bg-surface p-10">
            <LogoStacked />
          </div>
        </div>
      </section>

      {/* Type scale ------------------------------------------------------- */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Typography</p>
        <div className="space-y-8">
          {SCALE.map((s) => (
            <div key={s.label} className="grid grid-cols-[92px_1fr] items-baseline gap-6">
              <span className="text-meta text-ink-subtle">{s.label}</span>
              <p className={s.cls}>{s.sample}</p>
            </div>
          ))}
          <div className="grid grid-cols-[92px_1fr] items-baseline gap-6">
            <span className="text-meta text-ink-subtle">numeric-lg</span>
            <p className="font-display text-numeric-lg tnum">₹24,850 · 72 · 95</p>
          </div>
        </div>
      </section>

      {/* Color ------------------------------------------------------------ */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Color</p>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {SURFACES.map((s) => (
            <div key={s.name} className="rounded-md border p-5">
              <div className={`${s.cls} mb-4 h-16 rounded-sm border`} />
              <p className="text-meta text-ink-subtle">{s.name}</p>
            </div>
          ))}
        </div>

        <div className="mb-10 space-y-2">
          {INKS.map((i) => (
            <p key={i.name} className={`${i.cls} text-body`}>
              {i.name} — The quick brown fox jumps over the lazy dog
            </p>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border p-5">
            <div className="mb-4 h-16 rounded-sm bg-gold" />
            <p className="text-meta text-ink-subtle">--gold · accent only, never text</p>
          </div>
          <div className="rounded-md border p-5">
            <div className="mb-4 h-16 rounded-sm bg-success" />
            <p className="text-meta text-ink-subtle">--success</p>
          </div>
          <div className="rounded-md border p-5">
            <div className="mb-4 h-16 rounded-sm bg-danger" />
            <p className="text-meta text-ink-subtle">--danger</p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-gold bg-gold p-5">
          <p className="text-ui font-medium text-ink">
            Gold fill always carries ink text — 6.5:1. Light text on gold fails at 2.81:1.
          </p>
        </div>
      </section>

      {/* Surface & elevation ---------------------------------------------- */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Surface, radius, elevation</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border bg-surface p-6">
            <p className="eyebrow mb-2">Card</p>
            <p className="text-ui text-ink-muted">Border, no shadow. The default.</p>
          </div>
          <div className="rounded-md border bg-surface p-6 shadow-e1">
            <p className="eyebrow mb-2">Card · e1</p>
            <p className="text-ui text-ink-muted">The only shadow in the system.</p>
          </div>
          <div className="rounded-md bg-surface-sunken p-6">
            <p className="eyebrow mb-2">Sunken</p>
            <p className="text-ui text-ink-muted">Tracks, stripes, skeletons.</p>
          </div>
        </div>
      </section>

      {/* Primitives ------------------------------------------------------- */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Components</p>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button>Open LifeOS</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Dismiss</Button>
          <Button variant="link">Read the report</Button>
          <Button loading>Orchestrating</Button>
          <Button disabled>Disabled</Button>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="gold">LifeCore</Badge>
          <Badge variant="success">Validated</Badge>
          <Badge variant="danger">High risk</Badge>
          <Badge variant="outline">Retry 1</Badge>
          <Badge variant="neutral">
            <StatusDot status="running" /> FinanceAgent
          </Badge>
          <Badge variant="success">
            <StatusDot status="success" /> Complete
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <Input placeholder="Ask LifeOS anything…" />
            <Textarea rows={3} placeholder="Paste a URL, or describe what you need…" />
          </div>
          <Card>
            <CardContent>
              <p className="eyebrow mb-3">FinanceAgent</p>
              <p className="font-display text-numeric-md tnum">₹24,850</p>
              <p className="mt-2 text-ui text-ink-muted">Spent this month across 34 transactions.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Motion ----------------------------------------------------------- */}
      <section className="mb-20">
        <p className="eyebrow eyebrow-rule mb-8">Motion · 60ms stagger</p>
        <div className="stagger grid gap-3 sm:grid-cols-4">
          {["IntentAgent", "PlannerAgent", "RouterAgent", "CriticAgent"].map((a, i) => (
            <div
              key={a}
              style={{ "--i": i } as React.CSSProperties}
              className="rounded-sm border bg-surface px-4 py-3"
            >
              <p className="text-ui">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      </section>

      <footer className="hairline pt-8">
        <p className="text-meta text-ink-subtle">
          Toggle the theme above — every value here is a semantic token, so dark mode costs one file.
        </p>
      </footer>
    </main>
  );
}
