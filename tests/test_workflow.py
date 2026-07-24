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
            self.assertEqual(questions["questions"][0]["field"], "identity.mailingAddress")
            mailing_address = {
                "addressLine1": "100 Fictional Way",
                "city": "Madison",
                "region": "WI",
                "postalCode": "00000",
                "country": "United States",
            }
            self.run_cli(
                "answer",
                "--workspace",
                folder,
                "--field",
                "identity.mailingAddress",
                "--value",
                json.dumps(mailing_address),
                "--source",
                "fictional-test",
            )
            self.run_cli("answer", "--workspace", folder, "--field", "searchDirection.targetRoles", "--value", '["Implementation Specialist"]', "--source", "user-answer:test")
            conflict = json.loads(self.run_cli("answer", "--workspace", folder, "--field", "searchDirection.targetRoles", "--value", '["Program Manager"]', "--source", "resume:test").stdout)
            self.assertFalse(conflict["saved"])
            profile = json.loads((Path(folder) / ".job-search" / "applicant-profile.json").read_text(encoding="utf-8"))
            self.assertEqual(
                profile["identity"]["mailingAddress"]["value"],
                mailing_address,
            )
            self.assertEqual(profile["conflicts"][-1]["status"], "unresolved")

    def test_mailing_address_requires_structured_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            self.run_cli("init", "--workspace", folder)
            result = self.run_cli(
                "answer",
                "--workspace",
                folder,
                "--field",
                "identity.mailingAddress",
                "--value",
                '"100 Fictional Way"',
                "--source",
                "fictional-test",
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("must be a JSON object", result.stderr)

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

    def test_review_and_approval_use_employer_and_job_title(self):
        with tempfile.TemporaryDirectory() as folder:
            self.run_cli("init", "--workspace", folder)
            ledger_path = Path(folder) / ".job-search" / "applications.json"
            ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
            ledger["applications"].append({
                "id": "app-random1234",
                "employer": "Fictional Employer",
                "role": "Customer Support Engineer",
                "status": "ready",
                "fit": "strong-match",
                "postingSnapshots": [],
                "materials": [{
                    "version": 1,
                    "files": [{
                        "kind": "pdf",
                        "filename": "app-random1234-resume-v001.pdf",
                        "path": "materials/app-random1234/app-random1234-resume-v001.pdf",
                        "sha256": "fictional",
                    }],
                    "visualVerification": {"status": "passed"},
                }],
                "unresolvedQuestions": [],
                "nextAction": "Review",
                "nextActionDate": "2026-07-21",
                "submissionEvidence": None,
            })
            ledger_path.write_text(json.dumps(ledger), encoding="utf-8")

            review = json.loads(self.run_cli(
                "review",
                "--workspace",
                folder,
                "--application-id",
                "app-random1234",
            ).stdout)
            expected = "I authorize submission to Fictional Employer for Customer Support Engineer"
            self.assertEqual(review["displayName"], "Fictional Employer \u2014 Customer Support Engineer")
            self.assertEqual(review["requiredApproval"], expected)
            self.assertNotIn("app-random1234", review["requiredApproval"])

            old_confirmation = self.run_cli(
                "approve",
                "--workspace",
                folder,
                "--application-id",
                "app-random1234",
                "--confirmation",
                "I authorize submission for app-random1234",
                check=False,
            )
            self.assertNotEqual(old_confirmation.returncode, 0)
            self.assertIn(expected, old_confirmation.stderr)

            approved = json.loads(self.run_cli(
                "approve",
                "--workspace",
                folder,
                "--application-id",
                "app-random1234",
                "--confirmation",
                expected,
            ).stdout)
            self.assertEqual(approved["confirmation"], expected)
            self.assertEqual(approved["scope"], "app-random1234")


if __name__ == "__main__":
    unittest.main()
