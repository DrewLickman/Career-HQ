const SUMMARY_MAX_CHARACTERS = 440;
const SUMMARY_MAX_SENTENCES = 3;
const SUMMARY_MAX_BULLETS = 4;
const SUMMARY_MAX_BULLET_CHARACTERS = 220;

const RESPONSIBILITY_SECTION = /^(?:what you(?:['\u2019]?ll| will| would)(?: do| be doing| be responsible for)|the work you(?:['\u2019]?ll| will| would) do|how you(?:['\u2019]?ll| will| would) contribute|how you(?:['\u2019]?ll| will| would) make an impact|your impact|day[- ]to[- ]day(?: responsibilities)?|(?:your|job|key|core|primary|essential|major|main)?\s*(?:roles? and responsibilities|responsibilities(?: and duties)?|duties(?: and responsibilities)?))(?:\s*[:\-])?$/i;
const ROLE_OVERVIEW_SECTION = /^(?:about the role|job summary|position summary|role summary|role overview|the role|the opportunity)(?:\s*[:\-])?$/i;
const ACTION_LANGUAGE = /\b(?:this role|you(?:'|’)?ll|you will|responsible for|day[- ]to[- ]day|work with|manage|coordinate|support|build|lead|own|help)\b/i;
const BOILERPLATE = /^(?:apply now|job description|about (?:us|the company)|who we are|equal opportunity|benefits|qualifications|requirements|preferred qualifications|salary|compensation)(?:\s*[:\-])?$/i;
const BULLET_PREFIX = /^\s*(?:[-*•◦▪]|\d+[.)])\s+/;
const DEDUPLICATION_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "into", "is", "of", "on", "or", "the", "to", "with", "you", "your",
]);

export type JobSummaryDetails = {
  summary: string;
  bullets: string[];
};

type SummaryLine = {
  text: string;
  bullet: boolean;
};

function cleanLine(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(BULLET_PREFIX, "")
    .replace(/\s+/g, " ")
    .trim();
}

function summaryLines(value: string): SummaryLine[] {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => ({
      text: cleanLine(line),
      bullet: BULLET_PREFIX.test(line) || /<li\b/i.test(line),
    }))
    .filter((line) => Boolean(line.text));
}

function looksLikeHeading(value: string): boolean {
  const line = value.replace(/:\s*$/, "").trim();
  if (!line || line.length > 72) return false;
  if (RESPONSIBILITY_SECTION.test(line) || ROLE_OVERVIEW_SECTION.test(line) || BOILERPLATE.test(line)) return true;
  if (/[.!?]/.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length <= 9 && (line === line.toUpperCase() || /^[A-Z][\w &/'’()-]+$/.test(line));
}

function shorten(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";

  const sentences = compact.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  let result = "";
  for (const sentence of sentences.slice(0, SUMMARY_MAX_SENTENCES)) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length > SUMMARY_MAX_CHARACTERS) break;
    result = candidate;
  }

  if (!result) result = compact.slice(0, SUMMARY_MAX_CHARACTERS);
  if (result.length < compact.length && result.length >= SUMMARY_MAX_CHARACTERS - 40) {
    result = `${result.slice(0, SUMMARY_MAX_CHARACTERS - 1).replace(/\s+\S*$/, "")}\u2026`;
  }
  return result;
}

function shortenBullet(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= SUMMARY_MAX_BULLET_CHARACTERS) return compact;
  return `${compact.slice(0, SUMMARY_MAX_BULLET_CHARACTERS - 1).replace(/\s+\S*$/, "")}…`;
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !DEDUPLICATION_STOP_WORDS.has(token)),
  );
}

function substantiallyRepeats(value: string, reference: string): boolean {
  const candidate = meaningfulTokens(value);
  const existing = meaningfulTokens(reference);
  if (!candidate.size || !existing.size) return false;
  let shared = 0;
  for (const token of candidate) {
    if (existing.has(token)) shared += 1;
  }
  return shared / Math.min(candidate.size, existing.size) >= 0.7;
}

function distinctBullets(values: string[], summary: string): string[] {
  const bullets: string[] = [];
  for (const value of values) {
    const bullet = shortenBullet(value);
    if (bullet.length < 20 || substantiallyRepeats(bullet, summary)) continue;
    if (bullets.some((existing) => substantiallyRepeats(bullet, existing))) continue;
    bullets.push(bullet);
    if (bullets.length >= SUMMARY_MAX_BULLETS) break;
  }
  return bullets;
}

function detailsFromBody(body: SummaryLine[]): JobSummaryDetails | null {
  const prose = body.filter((line) => !line.bullet).map((line) => line.text);
  const bulletLines = body.filter((line) => line.bullet).map((line) => line.text);
  let summarySource = prose.join(" ");

  if (summarySource.length < 40 && bulletLines.length) {
    summarySource = [summarySource, bulletLines.shift()].filter(Boolean).join(" ");
  }

  const summary = shorten(summarySource || body.map((line) => line.text).join(" "));
  if (summary.length < 40) return null;
  return { summary, bullets: distinctBullets(bulletLines, summary) };
}

function sectionSummary(lines: SummaryLine[], headingPattern: RegExp): JobSummaryDetails | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (!headingPattern.test(lines[index].text)) continue;

    const body: SummaryLine[] = [];
    for (const line of lines.slice(index + 1)) {
      if (body.length && looksLikeHeading(line.text)) break;
      if (!line.text || BOILERPLATE.test(line.text)) continue;
      body.push(line);
      if (body.map((item) => item.text).join(" ").length >= 1_200 || body.length >= 12) break;
    }
    const details = detailsFromBody(body);
    if (details) return details;
  }
  return null;
}

export function summarizeJobPostingDetails(content: string, role: string, employer: string): JobSummaryDetails {
  const lines = summaryLines(content);

  const fromResponsibilities = sectionSummary(lines, RESPONSIBILITY_SECTION);
  if (fromResponsibilities) return fromResponsibilities;

  const fromRoleOverview = sectionSummary(lines, ROLE_OVERVIEW_SECTION);
  if (fromRoleOverview) return fromRoleOverview;

  const paragraphs = content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split("\n").map(cleanLine).filter(Boolean).join(" "))
    .filter((paragraph) => paragraph.length >= 50 && !BOILERPLATE.test(paragraph));
  const actionParagraph = paragraphs.find((paragraph) => ACTION_LANGUAGE.test(paragraph));
  const fromParagraph = shorten(actionParagraph ?? paragraphs[0] ?? "");
  if (fromParagraph) return { summary: fromParagraph, bullets: [] };

  const identity = [role, employer ? `at ${employer}` : ""].filter(Boolean).join(" ");
  return {
    summary: `${identity || "This role"}. Career HQ does not have enough saved job-description text to explain the day-to-day work yet.`,
    bullets: [],
  };
}

export function summarizeJobPosting(content: string, role: string, employer: string): string {
  return summarizeJobPostingDetails(content, role, employer).summary;
}

export function normalizeJobSummaryDetails(value: string): JobSummaryDetails {
  const lines = summaryLines(value);
  const details = detailsFromBody(lines);
  if (details) return details;
  return { summary: shorten(value), bullets: [] };
}

export function normalizeJobSummary(value: string): string {
  return normalizeJobSummaryDetails(value).summary;
}
