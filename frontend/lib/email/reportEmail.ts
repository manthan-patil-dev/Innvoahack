/**
 * Renders one LifeCore run as an email.
 *
 * The markdown converter below is deliberately small and hand-rolled rather
 * than a library render: email clients need inline styles (Gmail strips much of
 * a <style> block), the ResponseAgent only ever emits headings, emphasis,
 * lists and tables, and a dependency-free converter cannot fail at build time.
 * Anything it does not recognise falls through as an escaped paragraph, so an
 * unexpected construct degrades to plain text instead of breaking the email.
 */

export interface ReportEmailInput {
  /** The user's original request. */
  query: string;
  headline: string;
  /** `unified_report` — markdown from the ResponseAgent. */
  report: string;
  alerts: { level: string; message: string }[];
  actions: { text: string; source: string; due?: string }[];
  /** Which LLM backend served the run, verbatim from /api/chat. */
  backend: string;
  steps: number;
  retries: number;
}

/* --- primitives ----------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape first, then decorate — escaping never introduces `*` or a backtick,
 *  so the markers left over are genuinely the author's. */
function inline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code style="font-family:ui-monospace,Menlo,monospace;font-size:13px">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#8a6d2f">$1</a>');
}

const P = 'style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#333"';
const LI = 'style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#333"';

function tableRow(line: string, header: boolean): string {
  const cells = line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
  const tag = header ? "th" : "td";
  const style = header
    ? "padding:8px 10px;border-bottom:1px solid #d9d2c6;text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b6b"
    : "padding:8px 10px;border-bottom:1px solid #e8e3da;font-size:14px;color:#333";
  return `<tr>${cells.map((cell) => `<${tag} style="${style}">${inline(cell)}</${tag}>`).join("")}</tr>`;
}

/** A separator row (`|---|---|`) marks the line above it as the header. */
function isTableSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|?$/.test(line.trim());
}

export function markdownToEmailHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p ${P}>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const size = heading[1].length <= 2 ? 18 : 15;
      out.push(
        `<h2 style="margin:26px 0 10px;font-size:${size}px;font-weight:600;color:#111">${inline(heading[2])}</h2>`,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      out.push('<hr style="border:0;border-top:1px solid #e8e3da;margin:22px 0" />');
      continue;
    }

    if (/^\|/.test(trimmed)) {
      flushParagraph();
      const rows: string[] = [];
      let headerDone = false;
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const row = lines[i].trim();
        if (isTableSeparator(row)) {
          headerDone = true;
        } else {
          rows.push(tableRow(row, rows.length === 0 && !headerDone));
        }
        i += 1;
      }
      i -= 1;
      out.push(
        `<table style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows.join("")}</table>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li ${LI}>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      i -= 1;
      out.push(`<ul style="margin:0 0 16px;padding-left:20px">${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li ${LI}>${inline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      i -= 1;
      out.push(`<ol style="margin:0 0 16px;padding-left:20px">${items.join("")}</ol>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return out.join("");
}

/* --- the email ------------------------------------------------------------ */

/** True when any part of the run was served from scripted fixtures — the
 *  backend reports e.g. "openai+mock" for a partially degraded run. */
function servedFromFixtures(backend: string): boolean {
  return backend.includes("mock");
}

export function buildReportEmail(input: ReportEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const fixtures = servedFromFixtures(input.backend);

  const subject = `LifeOS AI — ${input.headline}`.slice(0, 180);

  const alerts = input.alerts.length
    ? `<div style="margin:0 0 22px">${input.alerts
        .map((alert) => {
          const critical = alert.level === "CRITICAL";
          return `<div style="border:1px solid ${critical ? "#8a3b3b" : "#b5965a"};background:${
            critical ? "rgba(138,59,59,.07)" : "rgba(181,150,90,.09)"
          };border-radius:4px;padding:11px 14px;margin:0 0 8px">
            <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${
              critical ? "#8a3b3b" : "#8a6d2f"
            };margin:0 0 4px">${escapeHtml(alert.level)}</div>
            <div style="font-size:14px;line-height:1.55;color:#333">${escapeHtml(alert.message)}</div>
          </div>`;
        })
        .join("")}</div>`
    : "";

  const actions = input.actions.length
    ? `<h2 style="margin:26px 0 10px;font-size:18px;font-weight:600;color:#111">What to do next</h2>
       <ul style="margin:0 0 16px;padding-left:20px">${input.actions
         .map(
           (action) =>
             `<li ${LI}>${escapeHtml(action.text)}<br /><span style="font-size:12px;color:#9a9590">${escapeHtml(
               action.source,
             )}${action.due ? ` · due ${escapeHtml(action.due)}` : ""}</span></li>`,
         )
         .join("")}</ul>`
    : "";

  const provenance = fixtures
    ? `<p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#8a6d2f">This run was served from LifeOS demo fixtures — the orchestration is real, the agent content is scripted.</p>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f4ee">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.headline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e8e3da;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
        <tr><td style="padding:26px 30px 0">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9a9590">LifeOS AI · Unified report</div>
          <h1 style="margin:14px 0 0;font-size:24px;line-height:1.25;font-weight:600;color:#111">${escapeHtml(input.headline)}</h1>
          <div style="margin:18px 0 0;padding-left:12px;border-left:2px solid #b5965a">
            <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9a9590;margin:0 0 3px">Your request</div>
            <div style="font-size:14px;line-height:1.5;color:#6b6b6b">${escapeHtml(input.query)}</div>
          </div>
        </td></tr>

        <tr><td style="padding:24px 30px 0">
          ${alerts}
          ${markdownToEmailHtml(input.report)}
          ${actions}
        </td></tr>

        <tr><td style="padding:8px 30px 26px">
          <div style="border-top:1px solid #e8e3da;padding-top:14px">
            ${provenance}
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9590">
              ${input.steps} orchestration step${input.steps === 1 ? "" : "s"} ·
              ${input.retries === 0 ? "no retries" : `${input.retries} retr${input.retries === 1 ? "y" : "ies"}`} ·
              engine: ${escapeHtml(input.backend)}
            </p>
            <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#9a9590">
              Sent because someone signed in to the LifeOS workspace asked for this report by email.
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "LifeOS AI — Unified report",
    "",
    input.headline,
    "",
    `Your request: ${input.query}`,
    "",
    ...(input.alerts.length
      ? [...input.alerts.map((a) => `[${a.level}] ${a.message}`), ""]
      : []),
    input.report,
    "",
    ...(input.actions.length
      ? [
          "WHAT TO DO NEXT",
          ...input.actions.map((a) => `- ${a.text} (${a.source}${a.due ? `, due ${a.due}` : ""})`),
          "",
        ]
      : []),
    "---",
    ...(fixtures
      ? [
          "This run was served from LifeOS demo fixtures — the orchestration is real, the agent content is scripted.",
        ]
      : []),
    `${input.steps} orchestration steps · ${
      input.retries === 0 ? "no retries" : `${input.retries} retries`
    } · engine: ${input.backend}`,
  ].join("\n");

  return { subject, html, text };
}
