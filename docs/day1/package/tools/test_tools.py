#!/usr/bin/env python3
"""Regression tests for the package tools, including the attack cases from the independent review.
Usage (from the package folder): python3 tools/test_tools.py
Uses only the Python standard library plus the cryptography package for the signature test."""
import copy, json, os, subprocess, sys, tempfile, unittest, uuid
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import check_dictionary as CD, check_records as CR
DICT = os.path.join(ROOT, "T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json")
J0 = json.load(open(DICT))

PINS = json.load(open(os.path.join(ROOT, "reference", "field_definition_pins_v1.3.json")))
def codes(J): return {e.split(":")[0] for e in CD.check(J)}
def pin_codes(J): return {e.split(":")[0] for e in CD.check_pins(J, PINS)}
FIX = os.path.join(ROOT, "test", "fixtures", "events")
def load_fix(n): return json.load(open(os.path.join(FIX, n)))

class Dictionary(unittest.TestCase):
    def test_baseline_passes(self): self.assertEqual(CD.check(J0), [])
    def test_duplicate_field(self):
        J = copy.deepcopy(J0); J["fields"].append(copy.deepcopy(J["fields"][0])); self.assertIn("DUPLICATE_QUALIFIED_NAME", codes(J))
    def test_no_events(self):
        J = copy.deepcopy(J0); J["events"] = []; self.assertIn("TRIGGER_EVENT_NOT_IN_CATALOG", codes(J))
    def test_no_tests(self):
        J = copy.deepcopy(J0); J["acceptance_tests"] = []; self.assertIn("TEST_SEQUENCE", codes(J))
    def test_duplicate_test(self):
        J = copy.deepcopy(J0); J["acceptance_tests"][1]["id"] = J["acceptance_tests"][0]["id"]; self.assertIn("DUPLICATE_TEST_ID", codes(J))
    def test_duplicate_event(self):
        J = copy.deepcopy(J0); J["events"].append(copy.deepcopy(J["events"][0])); self.assertIn("DUPLICATE_EVENT", codes(J))
    def test_forbidden_value(self):
        J = copy.deepcopy(J0)
        f = next(x for x in J["fields"] if x["canonical_type"] == "enum"); f["enum_values"] = f["enum_values"] + ["readiness_score"]
        self.assertIn("FORBIDDEN_VALUE", codes(J))
    def test_forbidden_field(self):
        J = copy.deepcopy(J0); f = copy.deepcopy(J["fields"][0]); f["field"] = "skill_passport_id"; f["qualified_name"] = f["domain"] + ".skill_passport_id"
        J["fields"].append(f); self.assertIn("FORBIDDEN_IDENTIFIER", codes(J))
    def test_oversized_event(self):
        J = copy.deepcopy(J0); J["events"][0]["worst_case_payload_bytes"] = 5000; self.assertIn("EVENT_PAYLOAD_TOO_LARGE", codes(J))
    def test_state_without_capture_field(self):
        J = copy.deepcopy(J0); f = next(x for x in J["fields"] if x["if_absent"] == "STATE"); f["capture_state_field"] = None
        self.assertIn("CAPTURE_STATE_FIELD", codes(J))
    def test_pins_baseline(self): self.assertEqual(CD.check_pins(J0, PINS), [])
    def test_pins_type_change(self):
        J = copy.deepcopy(J0); f = next(x for x in J["fields"] if x["canonical_type"] == "timestamp"); f["canonical_type"] = "boolean"
        self.assertIn("DEFINITION_CHANGED", pin_codes(J))
    def test_pins_enum_change(self):
        J = copy.deepcopy(J0); f = next(x for x in J["fields"] if x["qualified_name"] == "A.role_code"); f["enum_values"] = f["enum_values"][:-1] + ["superuser"]
        self.assertIn("DEFINITION_CHANGED", pin_codes(J))
    def test_pins_new_field(self):
        J = copy.deepcopy(J0); f = copy.deepcopy(J["fields"][0]); f["field"] = "new_field"; f["qualified_name"] = f["domain"] + ".new_field"; J["fields"].append(f)
        self.assertIn("UNPINNED_FIELD", pin_codes(J))
    def test_lifecycle_audit(self):
        later = {"ended":"end","redeemed":"redeem","completed":"complet","resolved":"resolv","revoked":"revok","exit":"exit","until":"until","withdrawn":"withdr","closed":"clos"}
        allowed = {("mentor.supervision_recorded","supervised_sessions_completed")}
        bad = [(e["name"], k) for e in J0["events"] for k in e["required_payload"] for w, r in later.items()
               if w in k and r not in e["name"] and (e["name"], k) not in allowed]
        self.assertEqual(bad, [])
    def test_personal_payload_key(self):
        J = copy.deepcopy(J0); e = J["events"][0]; e["required_payload"].append("legal_name")
        self.assertTrue({"EVENT_PAYLOAD_PERSONAL_KEY"} & codes(J))

def committed_event(**over):
    reg = {e["name"]: e for e in json.load(open(os.path.join(ROOT, "reference", "jsonschema", "event_payload_registry_v1.3.json")))["events"]}
    sch = reg["observation.committed"]["payload_schema"]; p = {}
    for k, pr in sch["properties"].items():
        if "enum" in pr: p[k] = pr["enum"][0]
        elif pr.get("type") == "integer": p[k] = 1
        elif pr.get("format") == "date-time": p[k] = "2026-10-18T10:00:00Z"
        elif pr.get("pattern") == "^[a-f0-9]{64}$": p[k] = "a" * 64
        elif "[0-9]+" in pr.get("pattern", ""): p[k] = "1.0.0"
        else: p[k] = str(uuid.uuid4())
    ev = {"event_id": str(uuid.uuid4()), "event_name": "observation.committed", "event_category": "OBSERVATION",
          "occurred_at": "2026-10-18T10:00:00Z", "ingested_at": "2026-10-18T10:00:01Z", "actor_type": "MENTOR",
          "actor_id": str(uuid.uuid4()), "actor_role_code": "mentor", "resource_type": "observation", "resource_id": p["observation_id"],
          "payload": p, "schema_version": "1.3.0", "dictionary_version": "1.3", "integrity_status": "ok", "integrity_hash": "b" * 64,
          "event_idempotency_key": str(uuid.uuid4()), "event_processing_state": "accepted", "record_property": "synthetic_test",
          "event_sequence_no": 0}
    ev.update(over); return ev

class Records(unittest.TestCase):
    def test_valid_event(self): self.assertEqual(CR.check_event(committed_event()), [])
    def test_oversized_payload(self):
        ev = committed_event(); ev["payload"]["observation_id"] = "x" * 5000; self.assertTrue(CR.check_event(ev))
    def test_personal_key(self):
        ev = committed_event(); ev["payload"]["participant_email"] = "a@b.c"; self.assertTrue(CR.check_event(ev))
    def test_reversed_chronology(self):
        self.assertTrue(CR.check_event(committed_event(occurred_at="2026-10-18T11:00:00Z")))
    def test_missing_previous_hash(self):
        self.assertTrue(CR.check_event(committed_event(event_sequence_no=2)))
    def test_unregistered_event(self):
        self.assertTrue(CR.check_event(committed_event(event_name="observation.score_generated")))
    @staticmethod
    def sidecar(_self, df):
        return {"sidecar_id": str(uuid.uuid4()), "observation_id": str(uuid.uuid4()), "participant_pseudonym_ref": str(uuid.uuid4()),
                "source_version_id": str(uuid.uuid4()), "source_version_hash": "c" * 64, "dormant_fields": df, "capture_state": "captured",
                "lsa_consent_state": "never_asked", "dictionary_version": "1.3", "record_property": "synthetic_test"}
    def test_valid_sidecar(self): self.assertEqual(CR.check_sidecar(self.sidecar(None, {"attempt_reason": "first", "attempt_no": 1})), [])
    def test_sidecar_rehearsal_key(self): self.assertTrue(CR.check_sidecar(self.sidecar(None, {"participant_reflection_ref": "x"})))
    def test_sidecar_sensitive_nested(self): self.assertTrue(CR.check_sidecar(self.sidecar(None, {"attempt_no": {"legal_name": "A"}})))

class Fixtures(unittest.TestCase):
    def test_all_event_fixtures_valid(self):
        bad = []
        for fn in sorted(os.listdir(FIX)):
            E = CR.check_event(load_fix(fn))
            if E: bad.append((fn, E))
        self.assertEqual(bad, [])
    def test_count(self): self.assertEqual(len(os.listdir(FIX)), 2 * len(J0["events"]))
    def test_stage1_without_actor_ok(self):
        ev = load_fix("observation.stage_entered.minimal.json"); self.assertEqual(ev["payload"]["stage_code"], "S1"); self.assertEqual(CR.check_event(ev), [])
    def test_stage2_without_actor_refused(self):
        ev = load_fix("observation.stage_entered.minimal.json"); ev["payload"]["stage_code"] = "S2"; self.assertTrue(CR.check_event(ev))
    def test_mentor_grant_without_pseudonym_ok(self): self.assertEqual(CR.check_event(load_fix("account.role_granted.minimal.json")), [])
    def test_participant_grant_without_pseudonym_refused(self):
        ev = load_fix("account.role_granted.minimal.json"); ev["payload"]["role_code"] = "participant"; self.assertTrue(CR.check_event(ev))
    def test_mentor_grant_with_pseudonym_refused(self):
        ev = load_fix("account.role_granted.json"); ev["payload"]["role_code"] = "mentor"; self.assertTrue(CR.check_event(ev))
    def test_session_started_needs_no_end(self):
        self.assertNotIn("session_ended_at", load_fix("observation.session_started.json")["payload"])

class Hardening(unittest.TestCase):
    def test_invalid_identifier(self):
        ev = committed_event(); ev["payload"]["observation_id"] = "not an id"; self.assertTrue(CR.check_event(ev))
    def test_wrong_version(self): self.assertTrue(CR.check_event(committed_event(dictionary_version="1.2")))
    def test_bad_semver(self): self.assertTrue(CR.check_event(committed_event(schema_version="v1")))
    def test_naive_timestamp_no_crash(self):
        self.assertTrue(CR.check_event(committed_event(occurred_at="2026-10-18T10:00:00")))
    def test_malformed_timestamp_no_crash(self):
        self.assertTrue(CR.check_event(committed_event(occurred_at=12345)))
    def test_null_value_refused(self):
        ev = committed_event(); ev["payload"]["attempt_no"] = None; self.assertTrue(CR.check_event(ev))
    def test_bad_actor(self): self.assertTrue(CR.check_event(committed_event(actor_type="MENTOR", actor_id="svc_platform")))
    def test_sidecar_bad_value(self):
        row = Records.sidecar(None, {"attempt_reason": "first", "prior_progression_decision_ref": "jane.doe@example.com"})
        self.assertTrue(CR.check_sidecar(row))

class Scanner(unittest.TestCase):
    def run_scan(self, files, *args):
        d = tempfile.mkdtemp()
        for rel, txt in files.items():
            os.makedirs(os.path.join(d, os.path.dirname(rel)), exist_ok=True); open(os.path.join(d, rel), "w").write(txt)
        return subprocess.run([sys.executable, os.path.join(HERE, "check_forbidden_identifiers.py"), d, *args], capture_output=True, text=True)
    def test_mjs_detected(self): self.assertEqual(self.run_scan({"src/a.mjs": "const skillPassport = 1"}).returncode, 1)
    def test_exact_directory_exclusion(self):
        r = self.run_scan({"tools/a.py": "user_score = 1", "toolsX/b.py": "user_score = 1"}, "--exclude", "tools/")
        self.assertEqual(r.returncode, 1); self.assertIn("toolsX/b.py", r.stdout); self.assertNotIn("HIT tools/a.py", r.stdout)
    def test_exact_file_exclusion(self):
        r = self.run_scan({"docs/dict.json": "\"readiness_score\"", "docs/dict.json.bak.json": "\"readiness_score\""}, "--exclude", "docs/dict.json")
        self.assertEqual(r.returncode, 1); self.assertIn("dict.json.bak.json", r.stdout)
    def test_mdx_detected(self): self.assertEqual(self.run_scan({"docs/a.mdx": "export const skillPassport = 1"}).returncode, 1)
    def test_allowance_marker(self):
        r = self.run_scan({"src/copy.js": "const line = 'The 3rd Academy does not validate people. It governs evidence.' // t3a-allow:contains_validate"})
        self.assertEqual(r.returncode, 0); self.assertIn("ALLOWED", r.stdout)
    def test_unmarked_prose_flagged(self):
        self.assertEqual(self.run_scan({"src/copy.js": "const line = 'we validate people'"}).returncode, 1)
    def test_clean_repo_passes(self): self.assertEqual(self.run_scan({"src/a.py": "observed_at = 1"}).returncode, 0)

class Signature(unittest.TestCase):
    def v(self, m):
        return subprocess.run([sys.executable, os.path.join(HERE, "verify_manifest.py"), os.path.join(ROOT, "test", "fixtures", m),
            os.path.join(ROOT, "test", "fixtures", "signed_test_manifest.sig.b64"), os.path.join(ROOT, "test", "keys", "test_public_key.pem")], capture_output=True).returncode
    def test_valid(self): self.assertEqual(self.v("signed_test_manifest.json"), 0)
    def test_tampered(self): self.assertEqual(self.v("tampered_test_manifest.json"), 1)
    def test_malformed_signature(self):
        r = subprocess.run([sys.executable, os.path.join(HERE, "verify_manifest.py"), os.path.join(ROOT, "test", "fixtures", "signed_test_manifest.json"),
            os.path.join(ROOT, "test", "fixtures", "malformed_signature.b64"), os.path.join(ROOT, "test", "keys", "test_public_key.pem")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1); self.assertIn("REFUSED", r.stdout); self.assertNotIn("Traceback", r.stderr)

class Acceptance(unittest.TestCase):
    def test_shared_empty_evidence_refused(self):
        d = tempfile.mkdtemp(); open(os.path.join(d, "e.txt"), "w").close()
        import hashlib
        h = hashlib.sha256(b"").hexdigest()
        ids = [t["id"] for t in json.load(open(os.path.join(ROOT, "tests", "acceptance_manifest.json")))["tests"]]
        json.dump({"build_id": "build-123456", "run_at": "2026-10-18T10:00:00Z", "tests": [{"id": i, "result": "PASS", "evidence_path": "e.txt", "evidence_sha256": h} for i in ids]}, open(os.path.join(d, "r.json"), "w"))
        r = subprocess.run([sys.executable, os.path.join(HERE, "acceptance_report.py"), os.path.join(d, "r.json")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1); self.assertIn("NOT COMPLETE", r.stdout)
    def test_unrun_not_pass(self):
        d = tempfile.mkdtemp(); p = os.path.join(d, "r.json")
        json.dump({"tests": [{"id": "DT-01", "result": "UNRUN", "reason": "no repository"}]}, open(p, "w"))
        r = subprocess.run([sys.executable, os.path.join(HERE, "acceptance_report.py"), p], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1); self.assertIn("NOT COMPLETE", r.stdout)

if __name__ == "__main__": unittest.main(verbosity=1)
