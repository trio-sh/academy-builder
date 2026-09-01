# T3A D1 Observation Pathway — Auto-Close Register v0.2

**Status:** appended on 1 September 2026 to record the INS-012 (Stage 1 administration) auto-closes. v0.1 stands as-is.

## New rows added for INS-012

| # | Question | Auto-close disposition |
| --- | --- | --- |
| 011 | INS-012 provenance depth — how much of the model, prompt, admin config and safety config is captured? | ALL FOUR are captured as separate `content_object` references, each versioned via `t3a_d1_content_version`. The `t3a_d1_ai_administration_run` row carries one FK per family. A registration of any of the four uses the standard content-registry approval flow — no shortcut. |
| 012 | Which surface presents the confirmation control? | `t3a_d1_confirm_stage1_run(run_id, note)` — a `SECURITY DEFINER` RPC callable by any authenticated actor. Authorization is enforced inside the function against `t3a_role_authorization` with authority `confirm` for the run's dimension. The mentor surface for this call ships with the next Cockpit wiring pass. |
| 013 | Withdrawal semantics for a confirmation | NO in-place withdrawal. The trigger `t3a_d1_ai_administration_confirmation_immutable` rejects UPDATE and DELETE. A withdrawal moves through the governed correction path (INS-006), which produces a new state; the confirmation row remains as the historical fact. |
| 014 | FD-D1-09 language scan scope | Ran only against the run's `rendered_body` at confirmation time and at every render. The scanner considers a verb-in-scope only if the verb appears within an 8-word window of the word "route" in either direction. This narrows the check so idiomatic use elsewhere in a rendered body doesn't false-positive. |
| 015 | Environment refusal at render | `t3a_d1_render_stage1_note` refuses under `design_only` and `observation_capable_inactive` with `ENV_CAPABILITY`. Under `synthetic_test_only`, `pilot_active` and `production_active` the render proceeds subject to the other checks. |

## Standing follow-ups now expanded

- The Cockpit UI's Session Control Strip needs a `Confirm S1 Observation` button that invokes `t3a_d1_confirm_stage1_run(...)`. Ships in the next UI wiring pass.
- The Stage 1 renderer's output surface (participant-facing view of the note) is not yet built. When it lands it renders only via `t3a_d1_render_stage1_note` and never composes text of its own.
- A future admin UI (out of scope here) exposes the four provenance references so a coordinator can inspect what the participant saw.

*This is v0.2 of the register. v0.3 will land when the next auto-close batch is recorded.*
