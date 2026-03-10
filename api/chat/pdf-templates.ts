/**
 * PDF Templates — deterministic pdfmake content builders.
 *
 * Instead of asking an LLM to produce raw pdfmake JSON (fragile, error-prone),
 * we define templates here that accept simple structured data and return valid
 * pdfmake content arrays. The LLM only needs to output structured data.
 */

// ─── Shared Theme ────────────────────────────────────────────────────────────

const THEME = {
  bg: "#0b1020",
  surface: "#1a2744",
  accent: "#00d4aa",
  accentWarm: "#ffd700",
  text: "#ffffff",
  textMuted: "#cccccc",
  textDim: "#888888",
  divider: "#1a2744",
  error: "#ff6b6b",
};

function divider(marginTop = 10, marginBottom = 15): Record<string, unknown> {
  return {
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: THEME.divider },
    ],
    margin: [0, marginTop, 0, marginBottom],
  };
}

function sectionHeader(text: string, marginBottom = 10): Record<string, unknown> {
  return {
    text,
    fontSize: 14,
    bold: true,
    color: THEME.text,
    margin: [0, 5, 0, marginBottom],
  };
}

function bodyText(text: string, opts?: { color?: string; fontSize?: number; bold?: boolean; margin?: number[] }): Record<string, unknown> {
  return {
    text,
    fontSize: opts?.fontSize ?? 11,
    color: opts?.color ?? THEME.textMuted,
    bold: opts?.bold ?? false,
    lineHeight: 1.5,
    ...(opts?.margin ? { margin: opts.margin } : {}),
  };
}

// ─── Template: Profile Snapshot ──────────────────────────────────────────────

export interface ProfileSnapshotData {
  name: string;
  subtitle?: string;
  email?: string;
  summary?: string;
  skills?: { name: string; area?: string; level?: string }[];
  modulesCompleted?: number;
  totalModules?: number;
  mentorLoopsCompleted?: number;
  totalMentorLoops?: number;
  recentActivity?: { date: string; event: string; description: string }[];
  nextSteps?: string[];
}

function buildProfileSnapshot(data: ProfileSnapshotData): unknown[] {
  const content: unknown[] = [];

  // Header with name and contact
  content.push({
    columns: [
      {
        width: "*",
        stack: [
          { text: data.name, fontSize: 22, bold: true, color: THEME.text, margin: [0, 0, 0, 4] },
          ...(data.subtitle ? [{ text: data.subtitle, fontSize: 12, color: THEME.accent, margin: [0, 0, 0, 3] }] : []),
          ...(data.email ? [{ text: data.email, fontSize: 10, color: THEME.textDim }] : []),
        ],
      },
    ],
    margin: [0, 0, 0, 15],
  });

  content.push(divider(5, 15));

  // Profile summary
  if (data.summary) {
    content.push(sectionHeader("Profile"));
    content.push({ text: data.summary, fontSize: 11, color: THEME.textMuted, lineHeight: 1.5, margin: [0, 0, 0, 15] });
  }

  // Skills table
  if (data.skills && data.skills.length > 0) {
    content.push(sectionHeader("Technical Skills"));
    const tableBody: unknown[][] = [
      [
        { text: "Skill", color: THEME.accent, bold: true, fontSize: 10 },
        { text: "Focus Area", color: THEME.accent, bold: true, fontSize: 10 },
        { text: "Level", color: THEME.accent, bold: true, fontSize: 10 },
      ],
    ];
    for (const skill of data.skills) {
      tableBody.push([
        { text: skill.name, color: THEME.text, fontSize: 9 },
        { text: skill.area || "—", color: THEME.textDim, fontSize: 9 },
        { text: skill.level || "—", color: THEME.textDim, fontSize: 9 },
      ]);
    }
    content.push({
      table: { headerRows: 1, widths: ["*", "*", "*"], body: tableBody },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 15],
    });
  }

  // Progress overview
  if (data.modulesCompleted != null || data.mentorLoopsCompleted != null) {
    content.push(sectionHeader("Progress Overview"));
    const progressItems: unknown[] = [];
    if (data.modulesCompleted != null) {
      const total = data.totalModules ?? "?";
      progressItems.push(
        { text: `Modules Completed: ${data.modulesCompleted} / ${total}`, fontSize: 11, color: THEME.accent, margin: [0, 0, 0, 6] },
      );
    }
    if (data.mentorLoopsCompleted != null) {
      const total = data.totalMentorLoops ?? "?";
      progressItems.push(
        { text: `Mentor Loops: ${data.mentorLoopsCompleted} / ${total}`, fontSize: 11, color: THEME.text, margin: [0, 0, 0, 6] },
      );
    }
    content.push({ stack: progressItems, margin: [0, 0, 0, 15] });
  }

  // Recent activity log
  if (data.recentActivity && data.recentActivity.length > 0) {
    content.push(sectionHeader("Recent Activity"));
    const actBody: unknown[][] = [
      [
        { text: "Date", color: THEME.accent, bold: true, fontSize: 9 },
        { text: "Event", color: THEME.accent, bold: true, fontSize: 9 },
        { text: "Description", color: THEME.accent, bold: true, fontSize: 9 },
      ],
    ];
    for (const act of data.recentActivity) {
      actBody.push([
        { text: act.date, color: THEME.textDim, fontSize: 8 },
        { text: act.event, color: THEME.accent, fontSize: 8 },
        { text: act.description, color: THEME.text, fontSize: 8 },
      ]);
    }
    content.push({
      table: { headerRows: 1, widths: [60, 70, "*"], body: actBody },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 15],
    });
  }

  // Next steps
  if (data.nextSteps && data.nextSteps.length > 0) {
    content.push(divider());
    content.push({
      columns: [
        { text: "Next steps: ", fontSize: 10, bold: true, color: THEME.text, width: "auto" },
        {
          text: data.nextSteps.join("  •  "),
          fontSize: 10,
          color: THEME.accent,
          width: "*",
        },
      ],
    });
  }

  return content;
}

// ─── Template: Report ────────────────────────────────────────────────────────

export interface ReportSection {
  heading: string;
  body?: string;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface ReportData {
  subtitle?: string;
  date?: string;
  sections: ReportSection[];
  footer?: string;
}

function buildReport(data: ReportData): unknown[] {
  const content: unknown[] = [];

  if (data.subtitle) {
    content.push({ text: data.subtitle, fontSize: 12, color: THEME.accent, margin: [0, 0, 0, 4] });
  }
  if (data.date) {
    content.push({ text: data.date, fontSize: 10, color: THEME.textDim, margin: [0, 0, 0, 10] });
  }

  content.push(divider(5, 15));

  for (const section of data.sections) {
    content.push(sectionHeader(section.heading));

    if (section.body) {
      content.push({ text: section.body, fontSize: 11, color: THEME.textMuted, lineHeight: 1.5, margin: [0, 0, 0, 10] });
    }

    if (section.bullets && section.bullets.length > 0) {
      content.push({
        ul: section.bullets.map((b) => ({ text: b, color: THEME.textMuted, fontSize: 10 })),
        margin: [10, 0, 0, 10],
      });
    }

    if (section.table) {
      const headers = section.table.headers.map((h) => ({
        text: h, color: THEME.accent, bold: true, fontSize: 10,
      }));
      const rows = section.table.rows.map((row) =>
        row.map((cell) => ({ text: cell, color: THEME.text, fontSize: 9 }))
      );
      content.push({
        table: {
          headerRows: 1,
          widths: section.table.headers.map(() => "*"),
          body: [headers, ...rows],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10],
      });
    }

    content.push({ text: "", margin: [0, 0, 0, 5] });
  }

  if (data.footer) {
    content.push(divider());
    content.push({ text: data.footer, fontSize: 9, color: THEME.textDim, italics: true });
  }

  return content;
}

// ─── Template: Certificate ───────────────────────────────────────────────────

export interface CertificateData {
  recipientName: string;
  achievement: string;
  description?: string;
  date?: string;
  issuer?: string;
  issuerTitle?: string;
}

function buildCertificate(data: CertificateData): unknown[] {
  return [
    { text: "", margin: [0, 0, 0, 40] },
    {
      canvas: [
        { type: "rect", x: 20, y: 0, w: 475, h: 2, color: THEME.accent },
      ],
      margin: [0, 0, 0, 30],
    },
    { text: "CERTIFICATE OF ACHIEVEMENT", fontSize: 12, color: THEME.accent, alignment: "center", letterSpacing: 4, margin: [0, 0, 0, 20] },
    { text: data.recipientName, fontSize: 28, bold: true, color: THEME.text, alignment: "center", margin: [0, 0, 0, 15] },
    { text: data.achievement, fontSize: 16, color: THEME.accentWarm, alignment: "center", margin: [0, 0, 0, 20] },
    ...(data.description
      ? [{ text: data.description, fontSize: 11, color: THEME.textMuted, alignment: "center", lineHeight: 1.6, margin: [40, 0, 40, 30] }]
      : [{ text: "", margin: [0, 0, 0, 30] }]),
    {
      canvas: [
        { type: "rect", x: 20, y: 0, w: 475, h: 2, color: THEME.accent },
      ],
      margin: [0, 0, 0, 25],
    },
    {
      columns: [
        {
          width: "*",
          stack: [
            ...(data.date ? [{ text: data.date, fontSize: 10, color: THEME.textDim, alignment: "center" }] : []),
          ],
        },
        {
          width: "*",
          stack: [
            ...(data.issuer ? [{ text: data.issuer, fontSize: 11, bold: true, color: THEME.text, alignment: "center" }] : []),
            ...(data.issuerTitle ? [{ text: data.issuerTitle, fontSize: 9, color: THEME.textDim, alignment: "center" }] : []),
          ],
        },
      ],
    },
  ];
}

// ─── Template: Table Report ──────────────────────────────────────────────────

export interface TableReportData {
  subtitle?: string;
  description?: string;
  columns: string[];
  rows: string[][];
  footer?: string;
}

function buildTableReport(data: TableReportData): unknown[] {
  const content: unknown[] = [];

  if (data.subtitle) {
    content.push({ text: data.subtitle, fontSize: 12, color: THEME.accent, margin: [0, 0, 0, 5] });
  }
  if (data.description) {
    content.push({ text: data.description, fontSize: 11, color: THEME.textMuted, lineHeight: 1.4, margin: [0, 0, 0, 12] });
  }

  content.push(divider(5, 12));

  const headers = data.columns.map((h) => ({
    text: h, color: THEME.accent, bold: true, fontSize: 10,
  }));
  const rows = data.rows.map((row) =>
    row.map((cell) => ({ text: cell, color: THEME.text, fontSize: 9 }))
  );

  content.push({
    table: {
      headerRows: 1,
      widths: data.columns.map(() => "*"),
      body: [headers, ...rows],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 15],
  });

  if (data.footer) {
    content.push({ text: data.footer, fontSize: 9, color: THEME.textDim, italics: true, margin: [0, 5, 0, 0] });
  }

  return content;
}

// ─── Template: Generic (fallback) ────────────────────────────────────────────

export interface GenericSection {
  heading?: string;
  body?: string;
  bullets?: string[];
}

export interface GenericData {
  subtitle?: string;
  sections: GenericSection[];
}

function buildGeneric(data: GenericData): unknown[] {
  const content: unknown[] = [];

  if (data.subtitle) {
    content.push({ text: data.subtitle, fontSize: 12, color: THEME.accent, margin: [0, 0, 0, 10] });
  }

  content.push(divider(5, 12));

  for (const section of data.sections) {
    if (section.heading) {
      content.push(sectionHeader(section.heading));
    }
    if (section.body) {
      content.push(bodyText(section.body, { margin: [0, 0, 0, 10] }));
    }
    if (section.bullets && section.bullets.length > 0) {
      content.push({
        ul: section.bullets.map((b) => ({ text: b, color: THEME.textMuted, fontSize: 10 })),
        margin: [10, 0, 0, 10],
      });
    }
  }

  return content;
}

// ─── Template Registry ───────────────────────────────────────────────────────

export type TemplateName = "profile_snapshot" | "report" | "certificate" | "table_report" | "generic";

export type TemplateData =
  | { template: "profile_snapshot"; data: ProfileSnapshotData }
  | { template: "report"; data: ReportData }
  | { template: "certificate"; data: CertificateData }
  | { template: "table_report"; data: TableReportData }
  | { template: "generic"; data: GenericData };

export function buildPdfContent(input: TemplateData): unknown[] {
  switch (input.template) {
    case "profile_snapshot":
      return buildProfileSnapshot(input.data);
    case "report":
      return buildReport(input.data);
    case "certificate":
      return buildCertificate(input.data);
    case "table_report":
      return buildTableReport(input.data);
    case "generic":
      return buildGeneric(input.data);
    default:
      return [bodyText("Unknown template type.")];
  }
}

/**
 * Returns the Kilo system prompt and user prompt for structured PDF data extraction.
 * The LLM outputs simple JSON matching a template schema — no pdfmake syntax.
 */
export function buildKiloPrompt(title: string, description: string): { system: string; user: string } {
  const system = `You are a structured data extractor for PDF generation. You output ONLY valid JSON — no markdown, no code fences, no explanation.

Your output must be a JSON object with exactly two keys:
- "template": one of "profile_snapshot", "report", "certificate", "table_report", "generic"
- "data": an object matching the schema for the chosen template

Choose the template that best fits the document description. Use "generic" if none of the specific templates fit well.`;

  const user = `Generate structured data for a PDF document.

Title: "${title}"
Description: ${description}

## Template Schemas

### profile_snapshot
Use for: candidate profiles, user snapshots, progress reports for individuals.
{
  "name": "Full Name",
  "subtitle": "Role or tagline",
  "email": "email@example.com",
  "summary": "Brief profile paragraph",
  "skills": [{ "name": "Skill", "area": "Category", "level": "Beginner / 2 yrs" }],
  "modulesCompleted": 3,
  "totalModules": 10,
  "mentorLoopsCompleted": 0,
  "totalMentorLoops": 3,
  "recentActivity": [{ "date": "3/9/2026", "event": "training", "description": "Completed Module X" }],
  "nextSteps": ["Find a Mentor", "Continue modules"]
}

### report
Use for: general reports, summaries, analyses, multi-section documents.
{
  "subtitle": "Report subtitle",
  "date": "March 10, 2026",
  "sections": [
    {
      "heading": "Section Title",
      "body": "Paragraph text...",
      "bullets": ["Point 1", "Point 2"],
      "table": { "headers": ["Col1", "Col2"], "rows": [["val1", "val2"]] }
    }
  ],
  "footer": "Optional footer note"
}

### certificate
Use for: certificates, awards, achievements, completions.
{
  "recipientName": "Full Name",
  "achievement": "What they achieved",
  "description": "Longer description of the achievement",
  "date": "March 10, 2026",
  "issuer": "Issuer Name",
  "issuerTitle": "Director of Programs"
}

### table_report
Use for: data tables, listings, comparisons, spreadsheet-style documents.
{
  "subtitle": "Table subtitle",
  "description": "Brief intro paragraph",
  "columns": ["Name", "Status", "Score"],
  "rows": [["Alice", "Active", "92"], ["Bob", "Pending", "85"]],
  "footer": "Optional footnote"
}

### generic
Use for: anything that doesn't fit the above templates.
{
  "subtitle": "Document subtitle",
  "sections": [
    { "heading": "Section Title", "body": "Paragraph text", "bullets": ["Point 1"] }
  ]
}

Respond with ONLY the JSON object. No markdown, no explanation.`;

  return { system, user };
}
