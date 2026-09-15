"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const actions = [
  ["analyze-job", "Find relevant evidence"],
  ["build-tailoring-plan", "Plan resume content"],
  ["prepare-materials", "Generate verified resume"],
  ["material-preflight", "Check resume files"],
  ["review-packet", "Create review packet"],
] as const;

export function WorkflowTools({ applicationId, employer, role }: { applicationId: string; employer: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [handoff, setHandoff] = useState("");
  const [findings, setFindings] = useState<string[]>([]);
  async function run(action: string) {
    setBusy(true); setHandoff(""); setFindings([]);
    try {
      const response = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, applicationId }) });
      const result = await response.json();
      setMessage(result.summary ?? "Action completed.");
      setFindings(result.uncertainties ?? []);
      if (result.status === "needs-ai") {
        setHandoff(`Use $career-hq for ${employer} — ${role}. Start with inspect-workspace to resolve this application, then ${action === "material-preflight" ? "inspect every rendered resume page" : "ai-context for its focused evidence packet"}. Use procedural findings to support your judgment. Do not submit.`);
      }
      router.refresh();
    } catch { setMessage("The local action could not finish. Try again or continue in Codex."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Reusable workflow tools" style={{ display: "grid", gap: 12 }}>
    <strong>Local workflow tools</strong>
    <p>Run routine steps here. Codex can use the same tools and help with judgment, wording, and the next decision.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {actions.map(([action, label]) => <button type="button" key={action} disabled={busy} onClick={() => void run(action)}>{label}</button>)}
    </div>
    <p role="status">{busy ? "Working locally…" : message}</p>
    {findings.length > 0 && <ul>{findings.map((item, i) => <li key={i}>{item}</li>)}</ul>}
    {handoff && <label>Continue with Codex<textarea readOnly value={handoff} rows={5} style={{ width: "100%" }} onFocus={event => event.currentTarget.select()} /></label>}
  </section>;
}
