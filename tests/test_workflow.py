import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
CLI = REPO / "scripts" / "career_hq.py"


class CareerHQWorkflowTests(unittest.TestCase):
    def run_cli(self, *args, cwd=None, check=True):
        return subprocess.run([sys.executable, str(CLI), *args], cwd=cwd or REPO, text=True, capture_output=True, check=check)

    def test_init_questions_and_conflict_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            self.run_cli("init", "--workspace", folder)
            questions = json.loads(self.run_cli("questions", "--workspace", folder).stdout)
            self.assertLessEqual(questions["count"], 5)
            self.run_cli("answer", "--workspace", folder, "--field", "searchDirection.targetRoles", "--value", '["Implementation Specialist"]', "--source", "user-answer:test")
            conflict = json.loads(self.run_cli("answer", "--workspace", folder, "--field", "searchDirection.targetRoles", "--value", '["Program Manager"]', "--source", "resume:test").stdout)
            self.assertFalse(conflict["saved"])
            profile = json.loads((Path(folder) / ".job-search" / "applicant-profile.json").read_text(encoding="utf-8"))
            self.assertEqual(profile["conflicts"][-1]["status"], "unresolved")

    def test_submitted_requires_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            self.run_cli("init", "--workspace", folder)
            ledger_path = Path(folder) / ".job-search" / "applications.json"
            ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
            ledger["applications"].append({
                "id": "test-app", "employer": "Fictional Employer", "role": "Fictional Role",
                "status": "research", "fit": "strong-match", "postingSnapshots": [],
                "materials": [], "nextAction": "Review", "nextActionDate": "2026-07-21",
                "submissionEvidence": None,
            })
            ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
            result = self.run_cli("update-status", "--workspace", folder, "--application-id", "test-app", "--status", "submitted", check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("requires confirmation evidence", result.stderr)


if __name__ == "__main__":
    unittest.main()
