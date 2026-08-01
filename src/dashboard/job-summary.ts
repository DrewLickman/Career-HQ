const SUMMARY_MAX_CHARACTERS = 440;
const SUMMARY_MAX_SENTENCES = 3;

const SUMMARY_SECTION = /^(?:about the role|job summary|position summary|role summary|role overview|the role|the opportunity|what you(?:'|’)?ll do|what you will do|what you(?:'|’)?ll be doing|responsibilities|key responsibilities|your responsibilities|your impact|day[- ]to[- ]day)(?:\s*[:\-])?$/i;
const ACTION_LANGUAGE = /\b(?:this role|you(?:'|’)?ll|you will|responsible for|day[- ]to[- ]day|work with|manage|coordinate|support|build|lead|own|help)\b/i;
const BOILERPLATE = /^(?:apply now|job description|about (?:us|the company)|who we are|equal opportunity|benefits|qualifications|requirements|preferred qualifications|salary|compensation)(?:\s*[:\-])?$/i;

function cleanLine(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s*(?:[-*•◦▪]|\d+[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHeading(value: string): boolean {
  const line = value.replace(/:\s*$/, "").trim();
  if (!line || line.length > 72) return false;
  if (SUMMARY_SECTION.test(line) || BOILERPLATE.test(line)) return true;
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

function sectionSummary(lines: string[]): string {
  for (let index = 0; index < lines.length; index += 1) {
    if (!SUMMARY_SECTION.test(lines[index])) continue;

    const body: string[] = [];
    for (const line of lines.slice(index + 1)) {
      if (body.length && looksLikeHeading(line)) break;
      if (!line || BOILERPLATE.test(line)) continue;
      body.push(line);
      if (body.join(" ").length >= SUMMARY_MAX_CHARACTERS || body.length >= 6) break;
    }
    const summary = shorten(body.join(" "));
    if (summary.length >= 40) return summary;
  }
  return "";
}

export function summarizeJobPosting(content: string, role: string, employer: string): string {
  const lines = content
    .replace(/\r/g, "")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  const fromSection = sectionSummary(lines);
  if (fromSection) return fromSection;

  const paragraphs = content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split("\n").map(cleanLine).filter(Boolean).join(" "))
    .filter((paragraph) => paragraph.length >= 50 && !BOILERPLATE.test(paragraph));
  const actionParagraph = paragraphs.find((paragraph) => ACTION_LANGUAGE.test(paragraph));
  const fromParagraph = shorten(actionParagraph ?? paragraphs[0] ?? "");
  if (fromParagraph) return fromParagraph;

  const identity = [role, employer ? `at ${employer}` : ""].filter(Boolean).join(" ");
  return `${identity || "This role"}. Career HQ does not have enough saved job-description text to explain the day-to-day work yet.`;
}

export function normalizeJobSummary(value: string): string {
  return shorten(value);
}
