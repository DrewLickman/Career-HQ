import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
import procedural as tools

POSTING = """Responsibilities
- Coordinate customer onboarding plans and document cross-functional handoffs.
- Investigate customer support requests with Microsoft Excel.
Required qualifications
- Customer onboarding and technical support documentation experience.
- Five years of Active Directory administration.
Preferred qualifications
- Experience with Microsoft 365.
Benefits
Comprehensive benefits and remote working arrangements.
"""


class ProceduralTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name)
        self.root = self.workspace / ".job-search"
        (self.root / "postings").mkdir(parents=True)
        self.profile = json.loads((REPO / "sample-data/applicant-profile.json").read_text())
        (self.root / "postings/job.txt").write_bytes(POSTING.encode("utf-8"))
        self.app = dict(id="fixture", employer="Fictional Harbor", role="Implementation Specialist", status="research", fit="reasonable-stretch", nextAction="Review", materials=[], postingSnapshots=[dict(path="postings/job.txt", sha256=hashlib.sha256(POSTING.encode()).hexdigest())])
        self.save()

    def save(self):
        (self.root / "applicant-profile.json").write_text(json.dumps(self.profile), encoding="utf-8")
        (self.root / "applications.json").write_text(json.dumps(dict(applications=[self.app])), encoding="utf-8")

    def run_tool(self, command):
        return tools.run(command, str(self.workspace), "fixture")

    def test_source_spans_and_judgment_boundary(self):
        report = self.run_tool("analyze-job")
        self.assertEqual(report["status"], "needs-ai")
        section = report["data"]["analysis"]["sections"]["required"]
        self.assertEqual(section[1]["line"], 6)
        self.assertIn("Five years", section[1]["text"])
        self.assertNotIn("fit", report["data"])
        self.assertEqual(self.app["fit"], "reasonable-stretch")

    def test_cache_invalidates_with_profile_and_posting(self):
        self.assertFalse(self.run_tool("analyze-job")["data"]["cacheHit"])
        self.assertTrue(self.run_tool("analyze-job")["data"]["cacheHit"])
        self.profile["updatedAt"] = "fictional-change"
        self.save()
        self.assertFalse(self.run_tool("analyze-job")["data"]["cacheHit"])
        (self.root / "postings/job.txt").write_text("changed")
        self.assertEqual(self.run_tool("analyze-job")["status"], "blocked")

    def test_exclusions_unverified_and_contact_values_do_not_enter_context(self):
        self.profile["identity"]["email"] = dict(value="private-sentinel@example.test", verified=True)
        self.profile["skills"].append(dict(value="Unsupported sentinel", verified=False))
        self.profile["projects"] = [dict(name="Excluded Project", claims=[dict(value="Excluded project sentinel", verified=True, source="fixture", verifiedAt="2026-09-05")])]
        self.profile["resumePreferences"] = dict(excludedProjects=[dict(value="Excluded Project", verified=True)])
        self.save()
        encoded = json.dumps(self.run_tool("ai-context"))
        for value in ("private-sentinel", "Unsupported sentinel", "Excluded project sentinel"):
            self.assertNotIn(value, encoded)

    def test_conflicts_require_user_and_traversal_is_rejected(self):
        self.profile["conflicts"] = [dict(status="unresolved")]
        self.save()
        self.assertEqual(self.run_tool("analyze-job")["status"], "needs-user")
        with self.assertRaises(ValueError): tools.private_path(self.root, "../outside.txt")

    def test_context_budget_and_deterministic_selection(self):
        report = self.run_tool("ai-context")
        self.assertLessEqual(report["data"]["estimatedTokens"], 1500)
        self.assertEqual(self.run_tool("build-tailoring-plan"), self.run_tool("build-tailoring-plan"))

    def test_cli_and_engine_share_contract(self):
        output = subprocess.run([sys.executable, str(REPO / "scripts/career_hq.py"), "next-actions", "--workspace", str(self.workspace)], capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(output.stdout), self.run_tool("next-actions"))

    def test_canonical_generation_and_preflight(self):
        result = self.run_tool("prepare-materials")
        self.assertEqual(result["status"], "complete")
        check = self.run_tool("material-preflight")
        self.assertEqual(check["status"], "needs-ai", check)
        self.assertTrue(all(item["passed"] for item in check["data"]["checks"]))
        ledger = tools.read(self.root / "applications.json")
        self.assertIsNone(ledger["applications"][0].get("approval"))

if __name__ == "__main__": unittest.main()
