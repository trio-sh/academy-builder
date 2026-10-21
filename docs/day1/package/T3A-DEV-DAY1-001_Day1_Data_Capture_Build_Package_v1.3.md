# The 3rd Academy Inc.

# Day 1 Data Capture Build Package

**Complete field dictionary, data separation, event logging, controls, reconciliation and acceptance tests**


**Table 0.1. Document control**

| No. | Item | Value |
|---|---|---|
| 0.1.1 | Identifier | T3A-DEV-DAY1-001 |
| 0.1.2 | Version | 1.3 |
| 0.1.3 | Date | 18 October 2026 |
| 0.1.4 | To | Hans Ade, Lead Platform Developer, Pixelways Solutions Inc., and any build session acting for him |
| 0.1.5 | From | Dr. Tony Mofoke, Founder and Chief Executive Officer |
| 0.1.6 | Instruction status | IMPLEMENT AS SPECIFIED |
| 0.1.7 | Classification | Trade secret. Founder and developer only |
| 0.1.8 | Companion file | T3A-DEV-DAY1-001_Field_Dictionary_v1.3.json, generated from the same source as this file. Where the two differ, this file governs and the difference is a documentation defect to record |


## 0. How to Run This Package

0.1. This file, the companion files in its package folder (the JSON dictionary, the mapping template, the reference scripts and schemas, and the check tools) and the existing T3X platform repository together form the execution package. No other document is required and no reply from The 3rd Academy will be sent during execution. The companion files add no rule; where any of them differs from this file, this file governs.

0.2. Work inside the existing repository. Discover the language, framework, database, migration tool and test runner from it and match them. Introduce no new stack. If no repository is present, build nothing and record no_codebase_present.

0.3. Nothing in this package asks for approval, confirmation or clarification. Where a matter cannot be decided from this file, the affected route fails closed, the matter is written to the conflict register with the default applied, and every unaffected part of the build continues. The conflict register is an output, not a conversation.

0.4. Precedence. This package governs which data is captured, how it is named, typed, stored, logged and protected. It changes no pathway rule: no gate, sufficiency rule, release rule, issuance rule or Stage behavior is altered by it. Each dimension build package governs that dimension's construct content (questions, answer options, conduct elements, Recorded Conduct Entries, recurrence keys, determination missing states). Where this package and an earlier instruction name the same field differently, build to this package and keep the earlier name resolvable through the mapping table in Section 9.

0.5. Schemas are yours to derive. This file fixes the fields that must exist and the behavior that must hold. Table shapes, indexes and service boundaries are delivered by you in the entity relationship diagram listed in Section 14.

0.6. Implementation is not activation. Building a DORMANT or SOCKET item never enables it. Enabling any of them requires a later instruction that names the item.


## 1. Purpose

1.1. The 3rd Academy must capture from the first participant every data point that any current or planned product will need, because a value that was never captured cannot be recreated later. Planned products include the Behavioral Trajectory Report (code identifier lsa, interface label Session Archive), institutional trends and licensing, Mentor Decision Patterns, the Longitudinal Behavioral Pattern Methodology, subscription commerce and outcome research.

1.2. Capturing everything is not the same as using everything. The rule is: capture now, keep the consumer dormant, enable only by later instruction. Where a data point is unlawful, retired or contrary to doctrine it is not captured at all, and Section 5 lists it so it is never reintroduced.

1.3. The code identifier lsa and the label Session Archive are the only names the dormant longitudinal module may carry in code, routes, interface strings, logs and analytics. The product name does not appear in any of them.


## 2. How to Read the Dictionary


**Table 2.1. Status values**

| No. | Status | Meaning | Build action |
|---|---|---|---|
| 2.1.1 | ACTIVE | Captured and used now | Build, capture and enforce |
| 2.1.2 | DORMANT | Captured now; its consumer is inactive | Build and capture; consumer disabled |
| 2.1.3 | SOCKET | Structure exists; capture and read routes disabled | Build schema, interface and refusal; capture nothing |
| 2.1.4 | PROHIBITED | Must not exist in any form | Build nothing; CI check enforces absence |
| 2.1.5 | LEGACY | An existing column or field that is not in this dictionary (reconciliation class M7) | Leave existing writes unchanged; add no new reader or consumer; list it in the reconciliation report |


**Table 2.2. If absent behaviors**

| No. | Code | Behavior |
|---|---|---|
| 2.2.1 | REFUSE | The write or action refuses, states the reason, and logs the refusal. Never defaults |
| 2.2.2 | STATE | The write proceeds. The typed field stays null and its companion capture_state field (named in the JSON as capture_state_field) stores a code from Table 2.3 |
| 2.2.3 | NONE | The field is legitimately empty until its trigger fires |


**Table 2.3. Field level capture_state codes**

| No. | Code | Meaning |
|---|---|---|
| 2.3.1 | captured | A value was collected and stored |
| 2.3.2 | not_captured | The collection trigger did not fire for this record (also used for rows that existed before this package) |
| 2.3.3 | never_asked | The question or prompt was never presented |
| 2.3.4 | declined | The person was asked and explicitly declined |
| 2.3.5 | no_response | The person was asked and did not respond within the window |
| 2.3.6 | not_applicable | The field does not apply to this record (for example observer_id at S1) |
| 2.3.7 | technical_failure | Capture should have occurred and a failure prevented it; writes system.error_detected |
| 2.3.8 | withdrawn | Consent covering the field was withdrawn; the earlier value stays in history |
| 2.3.9 | not_authored | A registry field whose content has not been authored for this source |
| 2.3.10 | not_served | The question or element was not served to the participant |

2.4. Every field marked STATE has a companion field named <field>_capture_state holding a code from Table 2.3. The typed field holds a value only when its capture_state is captured, and is null otherwise; a code is never written into a typed field. Enforce this with a check constraint or an equivalent rule. A generic capture state table keyed by record type, record id and field name is an acceptable alternative where a companion column is impractical. These field level codes are separate from the determination missing states of each dimension package; the two registers are never merged.

2.5. Irr. means irreversible: the value cannot be reconstructed after the event. An irreversible field missing at go live permanently degrades every record created before it exists.

2.6. Store codes are logical stores. You map each to physical storage in your entity relationship diagram. A field in one store is not readable from another except as Table 3.2 allows.


**Table 2.4. Logical stores**

| No. | Code | Store |
|---|---|---|
| 2.4.1 | IDN | Identity and account |
| 2.4.2 | CNS | Consent and permissions |
| 2.4.3 | EVD | Observation evidence |
| 2.4.4 | REG | Registries and configuration |
| 2.4.5 | MNT | Mentor and assurance |
| 2.4.6 | BER | Report, release and challenge |
| 2.4.7 | EMP | Employer organization and exchange |
| 2.4.8 | GLG | Growth Log |
| 2.4.9 | REH | Rehearsal (WorkRehearsal and BridgeFast) |
| 2.4.10 | TEL | Aggregate telemetry sink |
| 2.4.11 | CMR | Commercial |
| 2.4.12 | LSA | Dormant longitudinal module |
| 2.4.13 | EVL | Event log |
| 2.4.14 | AUD | Audit, retention and security |
| 2.4.15 | LIC | Institutional licensing (socket) |
| 2.4.16 | RSC | Research (socket) |
| 2.4.17 | PRG | Programs, cohorts and partner organizations |


**Table 2.5. Controlled vocabularies settled for this build**

| No. | Vocabulary | Values | Where |
|---|---|---|---|
| 2.5.1 | identity_link_status | unverified, verified, challenged, deactivated | Domain A |
| 2.5.2 | account_state | active, restricted, suspended, closed | Domain A |
| 2.5.3 | module_completion_state | complete, partial, abandoned | Domain K |
| 2.5.4 | response_modality | text, voice, accessible_alternative | Domain K |
| 2.5.5 | exposure kind (rehearsal) | Recorded as the rehearsal event name itself (content_displayed, feedback_displayed, retention_check_changed) | Domain K and Table 7.1 |
| 2.5.6 | exposure completion state | Use module_completion_state | Domain K |
| 2.5.7 | feedback_source_type | canned_reference, self_reflection, human_developmental | Domain K |
| 2.5.8 | retention_check_status | pending, served, completed, declined, expired | Domain K |
| 2.5.9 | session_serving_state | not_served, served, aborted, completed | Domain E |
| 2.5.10 | session_admin_state | normal, disrupted, withdrawn, welfare_stopped, corrected | Domain E |
| 2.5.11 | missing state reason | Field level capture_state (Table 2.3); determination missing states from each dimension package | Section 2 |
| 2.5.12 | prior_exposure_known_state | known_exposure, no_known_exposure, not_collected | Domain E |
| 2.5.13 | observer_independence_state and reviewer_independence_state | independent, conflict_declared, excluded_by_rule | Domain E |
| 2.5.14 | authorization_basis_type | consent, contract_necessity, legal_obligation | Domain B |
| 2.5.15 | authorization method | consent_method values | Domain B |
| 2.5.16 | historical_reuse_scope | future_only, includes_prior_records | Domain B |
| 2.5.17 | participant review state | participant_review_opened_at and completed_at, with challenge cases in Domain H | Domains G and H |
| 2.5.18 | report_type | ber, lsa (lsa never served while dormant) | Domain G |
| 2.5.19 | report standing | ber_status values | Domain G |
| 2.5.20 | event_name | Table 7.1 catalog | Section 7 |
| 2.5.21 | event_category | Domain N values | Domain N |
| 2.5.22 | event resource type | resource_type values in Domain N | Domain N |
| 2.5.23 | event_processing_state | accepted, quarantined, rejected, corrected | Domain N |
| 2.5.24 | organization_type | employer, workforce_agency, settlement_agency, professional_association, education_provider, community_organization, other | Domain R |
| 2.5.25 | Any further vocabulary | Where a needed value list is not in this file, the field stores capture_state not_authored and its dependent route stays closed | Paragraph 12.1.9 |


## 3. Separation of the Data Families

3.1. Five data families exist. They are separated by store, by access path and by event subscription, not by convention.


**Table 3.1. The five families**

| No. | Family | What it holds | Who reads it | What it feeds |
|---|---|---|---|---|
| 3.1.1 | Rehearsal (REH, TEL) | Private practice in WorkRehearsal and BridgeFast | The participant only; aggregate counts to TEL when enabled | Nothing in evidence. Never a mentor context, never a report |
| 3.1.2 | Growth Log (GLG) | Participant practice notes and rehearsal references; observation entries regenerated from the canonical record | The participant only | Nothing |
| 3.1.3 | Observation evidence (EVD, BER) | The canonical observation records and everything built on them | Per the role and authorization matrix; employers only through release | The Behavioral Evidence Report; the dormant consumers below |
| 3.1.4 | Longitudinal compatibility (LSA) | Dormant comparison snapshots built from observation events | Nobody while dormant | Nothing while dormant |
| 3.1.5 | Institutional intelligence and licensing (LIC, RSC, TEL) | Aggregates and research data, separately approved | Nobody while dormant | Nothing while dormant |


**Table 3.2. Permitted read paths**

| No. | Reader | May read | May never read |
|---|---|---|---|
| 3.2.1 | Growth Log service | GLG; EVD observation records for participant display | REH internals, LSA, LIC |
| 3.2.2 | lsa consumer | Observation events and the canonical EVD records they reference; REG | GLG, REH, TEL, CMR |
| 3.2.3 | Report service | EVD, REG, CNS, MNT snapshots | GLG, REH, TEL, CMR, LSA |
| 3.2.4 | Mentor surfaces | Minimum observation context for the assigned Stage instance | Profile, GLG, REH, CMR, other participants |
| 3.2.5 | Employer surfaces | Released report versions, verification status, stated profile fields of available participants | EVD raw records, determinations, GLG, REH, any conduct derived index |
| 3.2.6 | Oversight administrator | Everything except REH and GLG rehearsal entries, with every read logged | Write access to any observation, correction, outcome or report |
| 3.2.7 | Telemetry sink | Nothing (write only) | Everything |
| 3.2.8 | Licensing and research | Nothing while SOCKET | Everything |

3.3. The longitudinal module is built on the observation event stream and never reads the Growth Log store. Both may display observation history, but each regenerates it from the canonical record.

3.4. The DORMANT fields may be stored on the canonical observation record or in an append only lsa sidecar row keyed to observation_id. Either pattern is permitted. In both, the observation commit completes first and a failed dormant write never rolls it back; the failure is logged with capture_state technical_failure. The sidecar carries the pseudonymous key, never a name or address, and may hold only the DORMANT fields allowlisted in reference/jsonschema/lsa_observation_sidecar_v1.3.schema.json; a row with any other key is refused and quarantined without touching the observation. Capture of these fields is covered by the observation consents; any longitudinal use requires lsa consent. A reference pattern is in reference/001_reference_patterns_postgresql.sql.

3.5. Growth Log observation history is a read only view, not stored data. When the participant opens the Growth Log, observation entries are regenerated from the canonical observation record and shown beside the participant's own entries. Nothing is written into the Growth Log store by the platform, so it can never become a second source of truth.

3.6. An employer commissioned competence record, if ever built, is a different product. It shares no table, template, name or data path with the Behavioral Evidence Report and is not part of this build.


## 4. Day 1 Field Dictionary

4.1. Every row is one field. Its registry key is the qualified name, domain code plus field (for example L.account_id). The same field name may appear in more than one domain where that store holds its own copy or reference (for example account_id in Commercial); each qualified name is one registry row and one physical mapping. Owner and store apply to every row of a domain table and are stated per field in the JSON.


### 4.2. Domain A. Identity, account and role

4.2.0. The shared identity root for every account class. Profile data is context, never evidence, and is never shown to a mentor. Owner: Identity Service. Store: IDN.


**Table 4.2. Domain A fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.2.1 | `account_id` | UUID v4, immutable | identifier | System | account.created | ACTIVE | Y | REFUSE |
| 4.2.2 | `account_created_at` | Timestamp UTC, server generated | timestamp | System | account.created | ACTIVE | Y | REFUSE |
| 4.2.3 | `account_creation_route` | public_signup \| mentor_invitation \| employer_application \| administrator_provisioned \| legacy_unknown | enum | System | account.created | ACTIVE | Y | STATE |
| 4.2.4 | `role_assignment_id` | UUID v4, one row per account per role | identifier | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.5 | `role_code` | participant \| mentor \| employer_user \| coordinator \| oversight_administrator \| commercial \| system_service. Set server side only | enum | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.6 | `role_grant_basis` | self_serve_individual \| invitation_redeemed \| employer_application_approved \| administrator_grant | enum | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.7 | `role_granted_by` | Account id of the granting person | identifier | Administrator or System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.8 | `role_granted_at` | timestamp UTC | timestamp | Administrator or System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.9 | `role_revoked_by` | Account id | identifier | Administrator | account.role_revoked | ACTIVE | Y | NONE |
| 4.2.10 | `role_revoked_at` | timestamp UTC | timestamp | Administrator | account.role_revoked | ACTIVE | Y | NONE |
| 4.2.11 | `role_revocation_basis` | controlled reason code | text | Administrator | account.role_revoked | ACTIVE | Y | NONE |
| 4.2.12 | `email_address` | Normalized address used for sign in | email | Participant | account.created | ACTIVE | N | REFUSE |
| 4.2.13 | `email_verification_state` | unverified \| verified | enum | System | account.email_verified | ACTIVE | Y | REFUSE |
| 4.2.14 | `email_verification_sent_at` | Timestamp UTC | timestamp | System | account.verification_sent, account.email_verified | ACTIVE | Y | STATE |
| 4.2.15 | `email_verified_at` | Timestamp UTC | timestamp | System | account.verification_sent, account.email_verified | ACTIVE | Y | STATE |
| 4.2.16 | `legal_name` | Text as stated by the participant | text | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.17 | `display_name` | Text | text | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.18 | `identity_assurance_method` | account_authentication (only permitted value today) | enum | System | account.created | ACTIVE | Y | REFUSE |
| 4.2.19 | `identity_assurance_provider_ref` | Provider adapter reference | identifier | Identity provider | identity.assurance_completed | SOCKET | Y | NONE |
| 4.2.20 | `identity_assurance_evidence_ref` | pointer to secured store | identifier | Identity provider | identity.assurance_completed | SOCKET | Y | NONE |
| 4.2.21 | `age_eligibility_attestation` | attested_18_or_over \| attested_under_18. Date of birth is never stored | enum | Participant | account.created | ACTIVE | Y | REFUSE |
| 4.2.22 | `country_of_residence` | ISO 3166 alpha 2 | code | Participant | participant.profile_updated | ACTIVE | Y | STATE |
| 4.2.23 | `subdivision_of_residence` | ISO 3166 subdivision code (province or state) | code | Participant | participant.profile_updated | ACTIVE | Y | STATE |
| 4.2.24 | `city_of_residence` | Text from a controlled place list | text | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.25 | `privacy_jurisdiction_code` | Derived regime code from country and subdivision | code | System | participant.profile_updated | ACTIVE | Y | STATE |
| 4.2.26 | `preferred_language` | BCP 47 tag | code | Participant | participant.profile_updated | ACTIVE | Y | STATE |
| 4.2.27 | `timezone` | IANA zone name | code | Participant or System | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.28 | `occupation_interest` | Multi select of codes from the pinned occupational classification. No free text | array | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.29 | `occupational_classification_version` | Pinned version string, default NOC 2021 Version 1.0 | version_string | Configuration | participant.profile_updated | ACTIVE | Y | REFUSE |
| 4.2.30 | `profile_field_source` | Per profile field: stated_by_participant \| imported_document \| administrator_entered | enum | System | participant.profile_updated | ACTIVE | Y | STATE |
| 4.2.31 | `profile_document_ref` | Pointer to secured store for a document the participant uploads. Never evidence; no mentor read path | identifier | Participant | participant.document_uploaded | ACTIVE | N | NONE |
| 4.2.32 | `notification_channel_preference` | email \| in_platform | enum | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.33 | `record_property` | real \| synthetic_test \| demonstration. Set by the server at creation, immutable, inherited at write time by every child record | enum | System | account.created | ACTIVE | Y | REFUSE |
| 4.2.34 | `pilot_cohort_id` | UUID of a pilot cohort, nullable | identifier | Administrator | pilot.cohort_assigned | ACTIVE | Y | STATE |
| 4.2.35 | `account_state` | active \| restricted \| suspended \| closed | enum | Administrator or System | account.state_changed | ACTIVE | Y | REFUSE |
| 4.2.36 | `identity_link_status` | unverified \| verified \| challenged \| deactivated | enum | System | account.identity_link_changed | ACTIVE | Y | REFUSE |
| 4.2.37 | `role_effective_from` | Timestamp UTC | timestamp | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.38 | `role_rules_version` | semantic version of the authorization rules attached to the role | version_string | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.39 | `role_effective_until` | Timestamp UTC; empty while the role is open ended | timestamp | System | account.role_granted | ACTIVE | Y | NONE |
| 4.2.40 | `participant_pseudonym_ref` | UUID v4 generated when the participant role is granted; the only participant key any analytic or dormant consumer may hold; never displayed; never derived from name or address; absent for accounts without the participant role | identifier | System | account.role_granted | ACTIVE | Y | REFUSE |
| 4.2.41 | `participant_lifecycle_state` | registered \| onboarding \| active \| inactive \| closed, derived from events | enum | System | account.lifecycle_changed | ACTIVE | N | STATE |
| 4.2.42 | `enrollment_event_id` | UUID | identifier | System | participant.enrolled | ACTIVE | Y | NONE |
| 4.2.43 | `enrollment_scope` | rehearsal_product \| observation_pathway \| program | enum | System | participant.enrolled | ACTIVE | Y | NONE |
| 4.2.44 | `enrolled_at` | timestamp | timestamp | System | participant.enrolled | ACTIVE | Y | NONE |
| 4.2.45 | `target_industry_code` | Optional; NAICS Canada 2022 two digit sector code | code | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.46 | `role_seniority_context_code` | Optional; entry \| early_career \| experienced \| supervisory \| executive | enum | Participant | participant.profile_updated | ACTIVE | N | STATE |
| 4.2.47 | `recruitment_channel_code` | Optional; search \| social_media \| referral \| employer \| community_organization \| job_fair \| partner_program \| other | enum | Participant | participant.profile_updated | ACTIVE | Y | STATE |


### 4.3. Domain B. Consent and permissions

4.3.0. Consent is a versioned, contextual, revocable object stored alongside the data it governs. One interaction never writes two consent types. Withdrawal stops future capture only and deletes nothing. Owner: Consent Service. Store: CNS.


**Table 4.3. Domain B fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.3.1 | `consent_id` | UUID v4 | identifier | System | consent.granted \| consent.declined \| consent.withdrawn | ACTIVE | Y | REFUSE |
| 4.3.2 | `consent_type` | scenario_logging \| mentor_observation \| followup_contact \| employer_share \| aggregate_regional \| research_participation. Routes for followup_contact, aggregate_regional and research_participation are disabled: capture refused and logged | enum | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.3 | `consent_status` | granted \| declined \| withdrawn | enum | Participant | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.4 | `consent_timestamp` | Timestamp UTC, contemporaneous | timestamp | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.5 | `consent_copy_version` | Semantic version | version_string | Registry | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.6 | `consent_copy_hash` | SHA 256 of the exact text shown | sha256_hex | Registry | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.7 | `consent_method` | checkbox \| e_signature \| in_session_confirmation \| verbal_confirmed_accessibility | enum | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.8 | `consent_language` | BCP 47 tag of the text shown | code | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.9 | `consent_scope_dimension_id` | D1 to D14 | enum | System | each consent interaction | ACTIVE | Y | STATE |
| 4.3.10 | `consent_scope_stage_code` | S1 to S4. Consent is never inherited across dimensions | enum | System | each consent interaction | ACTIVE | Y | STATE |
| 4.3.11 | `consequence_displayed` | Boolean; true required before a withdrawal is processed | boolean | System | consent.withdrawn | ACTIVE | Y | REFUSE |
| 4.3.12 | `ip_address_hash` | SHA 256 of the network address; the raw address is never stored | sha256_hex | System | each consent interaction | ACTIVE | Y | STATE |
| 4.3.13 | `superseded_by` | consent_id of the later record, nullable | identifier | System | each later consent interaction | ACTIVE | Y | NONE |
| 4.3.14 | `consent_state_ref` | Pointer to the consent records current at capture, stamped on every capture record | identifier | System | every capture | ACTIVE | Y | REFUSE |
| 4.3.15 | `privacy_notice_version` | Semantic version | version_string | Registry | participant.notice_acknowledged | ACTIVE | Y | REFUSE |
| 4.3.16 | `privacy_notice_hash` | SHA 256 | sha256_hex | Registry | participant.notice_acknowledged | ACTIVE | Y | REFUSE |
| 4.3.17 | `contact_consent_status` | granted \| declined \| withdrawn | enum | Participant | consent.contact_changed | ACTIVE | Y | STATE |
| 4.3.18 | `contact_consent_at` | timestamp. Separate from report availability | timestamp | Participant | consent.contact_changed | ACTIVE | Y | STATE |
| 4.3.19 | `group_participation_record_id` | Separate Stage 4 permission object with its own notice version, hash and timestamp. Not a consent_type value | identifier | Participant | permission.group_participation_recorded | SOCKET | Y | REFUSE |
| 4.3.20 | `lsa_consent_state` | never_asked \| granted \| declined \| withdrawn. Default never_asked while no consent text is loaded | enum | Participant | consent.lsa_changed | DORMANT | Y | STATE |
| 4.3.21 | `lsa_consent_text_version` | Semantic version; timestamps UTC | version_string | Registry and System | consent.lsa_changed | DORMANT | Y | STATE |
| 4.3.22 | `lsa_consent_timestamp` | Semantic version; timestamps UTC | timestamp | Registry and System | consent.lsa_changed | DORMANT | Y | STATE |
| 4.3.23 | `lsa_withdrawal_timestamp` | Semantic version; timestamps UTC | timestamp | Registry and System | consent.lsa_changed | DORMANT | Y | STATE |
| 4.3.24 | `processing_purpose_id` | rehearsal \| observation \| longitudinal_comparison \| report_release \| contact \| research \| institutional_aggregate \| followup, one per consent record | identifier | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.25 | `authorization_basis_type` | consent \| contract_necessity \| legal_obligation. Every evidence and longitudinal purpose uses consent | enum | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.26 | `consent_actor_id` | Account id of the person who performed the action | identifier | System | each consent interaction | ACTIVE | Y | REFUSE |
| 4.3.27 | `consent_effective_at` | Timestamps UTC | timestamp | System | each consent interaction | ACTIVE | Y | STATE |
| 4.3.28 | `consent_expires_at` | expiry nullable | timestamp | System | each consent interaction | ACTIVE | Y | STATE |
| 4.3.29 | `historical_reuse_scope` | future_only \| includes_prior_records. Default future_only; a later grant never reaches earlier records unless includes_prior_records was shown and granted | enum | Participant | each consent interaction | ACTIVE | Y | REFUSE |


### 4.4. Domain C. Observation path, Stage entry and attempts

4.4.0. The gateway is the only valid transition from private rehearsal into observation. A Stage instance cannot begin without its Stage entry event, created at the Stage entry action immediately before observation begins. Owner: Observation Service. Store: EVD.


**Table 4.4. Domain C fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.4.1 | `observation_path_gateway_id` | UUID v4; one per participant per observation path; carries no dimension or Stage key | identifier | System | observation.path_opened | ACTIVE | Y | REFUSE |
| 4.4.2 | `gateway_opened_at` | Timestamps UTC | timestamp | System | observation.path_opened | ACTIVE | Y | REFUSE |
| 4.4.3 | `coaching_terminated_at` | Timestamps UTC | timestamp | System | observation.path_opened | ACTIVE | Y | REFUSE |
| 4.4.4 | `stage_entry_event_id` | UUID v4; one per Stage instance | identifier | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.5 | `stage_instance_id` | UUID v4 | identifier | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.6 | `stage_code` | S1 \| S2 \| S3 \| S4 | enum | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.7 | `dimensions_in_play` | Array of D1 to D14 | array | Registry | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.8 | `session_id` | UUID v4 | identifier | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.9 | `session_identity_method` | account_authentication (identity rests on account authentication only) | enum | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.10 | `assistance_rules_version` | Semantic version | version_string | Registry | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.11 | `administration_conditions` | Structured object: environment code, interruption codes, prompts given codes | object | System or Mentor | observation.stage_entered, observation.committed | ACTIVE | Y | STATE |
| 4.4.12 | `entry_authority_actor_id` | Account id; null at S1 by design | identifier | System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.13 | `observation_mode` | s1_deterministic_engine \| s2_live_video \| s3_asynchronous_submission \| s4_live_group | enum | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.14 | `live_media_provider` | Provider code (default google_meet); media_persisted is always false | text | Configuration | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.15 | `attempt_no` | Positive integer, lifetime monotonic per participant, dimension and Stage; never resets | integer | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.16 | `attempt_counted` | Boolean, derived from attempt_event_class | boolean | System | observation.attempt_closed | ACTIVE | Y | REFUSE |
| 4.4.17 | `attempt_event_class` | completed_observation \| technical_failure \| accommodation_interruption \| administration_failure \| cancelled_before_start \| identity_verification_failure \| participant_no_show \| withdrawal_after_start_before_commit \| welfare_stop | enum | System or Mentor | observation.attempt_closed | ACTIVE | Y | REFUSE |
| 4.4.18 | `attempt_rules_version` | Semantic version of the loaded attempt and cooldown rule set | version_string | Registry | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.19 | `cooldown_class` | none \| specification_cooldown \| rescheduling_cooldown | enum | System | observation.attempt_closed | ACTIVE | Y | STATE |
| 4.4.20 | `cooldown_ends_at` | timestamp UTC | timestamp | System | observation.attempt_closed | ACTIVE | Y | STATE |
| 4.4.21 | `attempt_reason` | first \| retake_after_redirect \| retake_after_pause \| retake_elected_after_proceed | enum | System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.22 | `prior_progression_decision_ref` | progression_decision_id | identifier | System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.23 | `cooldown_completed_at` | timestamp UTC | timestamp | System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.24 | `s1_not_required_ruleset_id` | Ruleset id; empty ruleset means every path begins at S1 | identifier | Registry | observation.path_opened | ACTIVE | Y | STATE |
| 4.4.25 | `mentor_assignment_id` | UUID | identifier | System or Coordinator | mentor.assigned | ACTIVE | Y | REFUSE |
| 4.4.26 | `assignment_method` | automatic \| coordinator | enum | System or Coordinator | mentor.assigned | ACTIVE | Y | REFUSE |
| 4.4.27 | `prior_allocation_count` | integer | integer | System or Coordinator | mentor.assigned | ACTIVE | Y | REFUSE |
| 4.4.28 | `guidance_between_stages_received` | Boolean | boolean | Mentor or System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.29 | `guide_account_id` | account id (internal, for independence rules only) | identifier | Mentor or System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.30 | `accommodation_applied` | Boolean | boolean | Coordinator | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.31 | `accommodation_class` | access_preserving \| demand_modifying. The reason is never stored | enum | Coordinator | observation.stage_entered | ACTIVE | Y | STATE |
| 4.4.32 | `assistance_declaration` | Controlled declaration code; at S3 AI_USE_ALLOWED \| AI_USE_DISALLOWED \| AI_USE_DECLARATION_REQUIRED | enum | Participant | observation.response_submitted | ACTIVE | Y | STATE |
| 4.4.33 | `abandonment_state` | none \| timeout \| user_exit \| connection_lost | enum | System | observation.session_abandoned | ACTIVE | Y | STATE |
| 4.4.34 | `observation_notification_timestamp` | Timestamp UTC when the participant was told the event may contribute to a report | timestamp | System | observation.stage_entered | ACTIVE | Y | REFUSE |
| 4.4.35 | `stage_entry_hold_expires_at` | Timestamp from the stage_entry_hold_ttl configuration | timestamp | System | observation.stage_entered | ACTIVE | N | REFUSE |
| 4.4.36 | `observation_path_completed_at` | Per dimension; timestamp when the last required Stage closes | timestamp | System | observation.path_completed | ACTIVE | Y | NONE |


### 4.5. Domain D. Sources, served instances and content registries

4.5.0. A source version used in a live observation is immutable. A change creates a new version id. Each dimension package supplies its construct content; this package fixes only the fields every source and served instance must carry. Owner: Registry Service. Store: REG.


**Table 4.5. Domain D fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.5.1 | `source_id` | Stable identifier | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.2 | `source_version_id` | UUID v4 per version | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.3 | `source_version_hash` | SHA 256 of the canonical approved content | sha256_hex | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.4 | `source_status` | authored_not_approved \| approved \| suspended \| retired | enum | Registry | registry.status_changed | ACTIVE | Y | REFUSE |
| 4.5.5 | `approval_record_id` | UUID | identifier | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.5.6 | `approval_authority` | account id | text | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.5.7 | `approved_at` | timestamp | timestamp | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.5.8 | `version_change_reason` | controlled reason code | text | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.5.9 | `scenario_class` | instructional \| private_rehearsal \| observation_ready \| work_sample \| team_simulation | enum | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.10 | `relevant_conduct` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.11 | `irrelevant_conduct` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.12 | `stated_standard` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.13 | `permitted_administration_variance` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.14 | `unsupported_inferences` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.15 | `cross_context_map` | Structured authored fields per version | object | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.16 | `min_seconds` | Integer bounds | integer | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.17 | `max_seconds` | null permitted for asynchronous S3 | integer | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.18 | `compatibility_class` | A \| B \| C, assigned at release | enum | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.19 | `situation_class` | Dimension controlled codes | code | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.20 | `secondary_situation_class` | Dimension controlled codes | code | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.21 | `interaction_pattern_family_id` | Dimension scoped controlled code, derived from situation_class | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.22 | `administration_form_id` | Controlled code; crosses dimensions | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.23 | `name_clearance_status` | CLEARED \| PENDING | enum | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.24 | `serving_eligible` | Boolean, derived; false without an approval record | boolean | Registry | registry.status_changed | ACTIVE | Y | REFUSE |
| 4.5.25 | `content_sensitivity` | standard \| SENSITIVE_CONTENT | enum | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.26 | `atlas_moment_id` | Pressure Moments Atlas entry id the source derives from, nullable | identifier | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.27 | `beat_sequence` | Ordered list of beat_code with a decision_point marker | object | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.28 | `comparison_family_id` | Authored codes for longitudinal comparison | identifier | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.29 | `comparison_demand_id` | Authored codes for longitudinal comparison | identifier | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.30 | `observation_opportunity_id` | Authored codes for longitudinal comparison | identifier | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.31 | `demand_conditions_version` | Version of the six demand conditions: information known, authority to act, routes available, point of direct question, time pressure, consequence | version_string | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.32 | `form_relationship_id` | Authored codes | identifier | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.33 | `variation_intent` | Authored codes | text | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.34 | `longitudinal_use_status` | eligible \| not_eligible; not_eligible where comparison fields are not authored | enum | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.35 | `served_instance_id` | UUID v4 | identifier | System | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.36 | `served_at` | Timestamp UTC | timestamp | System | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.37 | `randomization_seed` | seed | text | System | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.38 | `presentation_variant_values` | structured values | object | System | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.39 | `rendered_instance_hash` | SHA 256 of what the participant actually saw | sha256_hex | System | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.40 | `question_set_version` | Semantic versions | version_string | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.5.41 | `statement_library_version` | Semantic versions | version_string | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.5.42 | `answer_key_version` | Semantic versions | version_string | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.5.43 | `recurrence_key_version` | Semantic versions | version_string | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.5.44 | `template_register_version` | Semantic versions | version_string | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.5.45 | `stage1_engine_version` | Semantic versions of the deterministic delivery engine and script | version_string | Registry | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.46 | `stage1_script_version` | Semantic versions of the deterministic delivery engine and script | version_string | Registry | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.47 | `ai_model_deployment_id` | Model registry entries. The registry is empty and every route that needs it refuses | identifier | Registry | none while empty | SOCKET | Y | NONE |
| 4.5.48 | `ai_prompt_hash` | Model registry entries. The registry is empty and every route that needs it refuses | sha256_hex | Registry | none while empty | SOCKET | Y | NONE |
| 4.5.49 | `ai_system_message_version` | Model registry entries. The registry is empty and every route that needs it refuses | version_string | Registry | none while empty | SOCKET | Y | NONE |
| 4.5.50 | `ai_output_schema_version` | Model registry entries. The registry is empty and every route that needs it refuses | version_string | Registry | none while empty | SOCKET | Y | NONE |
| 4.5.51 | `source_bank_id` | One canonical bank shared by the observation pathway and the dormant longitudinal module. A second bank is refused | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.52 | `source_display_title` | Participant visible label of the version; preserved per version | text | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.53 | `source_created_at` | Timestamp | timestamp | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.54 | `source_created_by` | account id of the author | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.55 | `source_effective_from` | Start of the approval standing window | timestamp | Registry | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.5.56 | `source_effective_until` | End of the approval standing window; empty while open ended | timestamp | Registry | registry.status_changed | ACTIVE | Y | NONE |
| 4.5.57 | `source_material_manifest_ref` | Inventory of every participant material in the version | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.5.58 | `capture_catalog_version` | Semantic versions; delivery_script_version applies to every Stage | version_string | Registry | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.59 | `resolution_rule_version` | Semantic versions; delivery_script_version applies to every Stage | version_string | Registry | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.60 | `delivery_script_version` | Semantic versions; delivery_script_version applies to every Stage | version_string | Registry | observation.source_served | ACTIVE | Y | REFUSE |
| 4.5.61 | `atlas_terrain_id` | Pressure Moments Atlas terrain code, nullable | identifier | Registry | registry.version_registered | ACTIVE | Y | STATE |
| 4.5.62 | `situation_context` | Structured object authored per version: participant role context, authority, information state, timing, relationship, consequence, available response routes, opportunity map | object | Registry | registry.version_registered | DORMANT | Y | STATE |
| 4.5.63 | `served_language` | BCP 47 tag of the language actually served | code | System | observation.source_served | ACTIVE | Y | REFUSE |


### 4.6. Domain E. Observation record, determinations and progression

4.6.0. The append only factual record. One observation per participant, dimension and Stage instance. Amendments supersede; both states are retained. Mentors answer controlled questions; they never write report text. Owner: Observation Service. Store: EVD.


**Table 4.6. Domain E fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.6.1 | `observation_id` | UUID v4 | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.2 | `participant_id` | Keys | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.3 | `dimension_id` | Keys | enum | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.4 | `stage_code` | Keys | enum | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.5 | `stage_instance_id` | Keys | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.6 | `served_instance_id` | Keys | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.7 | `source_version_id` | Keys | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.8 | `observed_at` | Timestamps UTC, server generated | timestamp | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.9 | `captured_at` | Timestamps UTC, server generated | timestamp | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.10 | `committed_at` | Timestamps UTC, server generated | timestamp | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.11 | `contemporaneity` | contemporaneous \| late_entered | enum | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.12 | `capture_delay_seconds` | integer | integer | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.13 | `observer_id` | Account id; required at S2, S3 and S4; never set at S1 | identifier | Mentor | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.14 | `observer_role` | primary_observer \| second_independent_observer \| silent_supervisor \| facilitator_observer | enum | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.15 | `observer_authorization_snapshot_ref` | Snapshot of authorization valid on the observation date | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.16 | `s1_human_confirmation_actor_id` | S1 only | identifier | Mentor | observation.s1_confirmed | ACTIVE | Y | REFUSE |
| 4.6.17 | `s1_human_confirmation_at` | S1 only | timestamp | Mentor | observation.s1_confirmed | ACTIVE | Y | REFUSE |
| 4.6.18 | `confirmation_role` | S1 only | code | Mentor | observation.s1_confirmed | ACTIVE | Y | REFUSE |
| 4.6.19 | `authorization_snapshot_ref` | S1 only | identifier | Mentor | observation.s1_confirmed | ACTIVE | Y | REFUSE |
| 4.6.20 | `s1_outcome_delivered_to_mentor_at` | Timestamp; required before S2 entry | timestamp | System | observation.s1_outcome_delivered | ACTIVE | Y | REFUSE |
| 4.6.21 | `response_artifact_ref` | Pointer to the verbatim response or submission in secured store | identifier | Participant | observation.response_submitted | ACTIVE | Y | STATE |
| 4.6.22 | `response_sequence_number` | Integer | integer | System | observation.response_submitted | ACTIVE | Y | STATE |
| 4.6.23 | `response_submitted_at` | timestamp per response | timestamp | System | observation.response_submitted | ACTIVE | Y | STATE |
| 4.6.24 | `submission_origin` | web \| mobile \| upload | enum | System | observation.response_submitted | ACTIVE | Y | STATE |
| 4.6.25 | `s3_submission_provenance` | The required Stage 3 provenance fields defined in the dimension package, plus prior_version_ref on a resubmission only | object | Participant | observation.response_submitted | ACTIVE | Y | REFUSE |
| 4.6.26 | `beat_code` | Per beat of the controlled script | code | Mentor or System | observation.beat_marked | ACTIVE | Y | STATE |
| 4.6.27 | `beat_started_at` | Per beat of the controlled script | timestamp | Mentor or System | observation.beat_marked | ACTIVE | Y | STATE |
| 4.6.28 | `s2_determinations_locked_at` | Timestamps | timestamp | System | observation.determinations_locked | ACTIVE | Y | REFUSE |
| 4.6.29 | `s1_output_unmasked_at` | unmasking after the lock only | timestamp | System | observation.determinations_locked | ACTIVE | Y | REFUSE |
| 4.6.30 | `determination_id` | Per question object; source bound list selections | identifier | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.31 | `question_id` | Per question object; source bound list selections | identifier | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.32 | `answer_option_id` | Per question object; source bound list selections | identifier | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.33 | `list_selection_ids` | Per question object; source bound list selections | array | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.34 | `determination_missing_state` | The determination missing state codes of the dimension package, held as field metadata, never as an answer | text | Mentor | observation.determination_recorded | ACTIVE | Y | STATE |
| 4.6.35 | `determined_by` | Account id | identifier | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.36 | `determined_at` | timestamp | timestamp | Mentor | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.37 | `clause_instance_id` | observation_id + conduct_element_id + recurrence_equivalence_key_id + state_code | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.38 | `conduct_element_id` | Codes from the dimension library; statement_id keeps the ST prefix | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.39 | `recurrence_equivalence_key_id` | Codes from the dimension library; statement_id keeps the ST prefix | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.40 | `state_code` | Codes from the dimension library; statement_id keeps the ST prefix | code | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.41 | `statement_id` | Codes from the dimension library; statement_id keeps the ST prefix | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.42 | `evidence_class` | portable_core \| employer_linked | enum | Registry | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.43 | `administration_variance` | Structured codes, recorded whether permitted or not | object | Mentor or System | observation.committed | ACTIVE | Y | STATE |
| 4.6.44 | `technical_issue_codes` | connectivity \| audio \| video \| platform \| none | enum | Mentor or System | observation.committed | ACTIVE | Y | STATE |
| 4.6.45 | `comparability_class` | directly_comparable \| interpret_individually, derived | enum | System | observation.committed | ACTIVE | N | STATE |
| 4.6.46 | `data_source` | observed \| stated_by_participant \| mentor_entered \| system_derived \| employer_reported | enum | System | every record write | ACTIVE | Y | REFUSE |
| 4.6.47 | `integrity_status` | ok \| missing_keys \| invalid_bounds \| suspected_duplicate \| manual_review | enum | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.48 | `supersedes` | observation_id, nullable | identifier | System | observation.corrected | ACTIVE | Y | NONE |
| 4.6.49 | `superseded_by` | observation_id, nullable | identifier | System | observation.corrected | ACTIVE | Y | NONE |
| 4.6.50 | `record_snapshot_hash` | SHA 256 of the canonical serialized observation record at commit, carried by observation.committed | sha256_hex | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.51 | `evidence_currency_expires_at` | committed_at plus the configured currency period (18 months) | timestamp | System | observation.committed | ACTIVE | N | REFUSE |
| 4.6.52 | `progression_decision_id` | UUID | identifier | Mentor | observation.progression_recorded | ACTIVE | Y | REFUSE |
| 4.6.53 | `decision` | proceed \| redirect \| pause | enum | Mentor | observation.progression_recorded | ACTIVE | Y | REFUSE |
| 4.6.54 | `decided_by` | Account id | identifier | Mentor | observation.progression_recorded | ACTIVE | Y | REFUSE |
| 4.6.55 | `decided_at` | timestamp | timestamp | Mentor | observation.progression_recorded | ACTIVE | Y | REFUSE |
| 4.6.56 | `decision_scope` | dimension and Stage | object | Mentor | observation.progression_recorded | ACTIVE | Y | REFUSE |
| 4.6.57 | `decision_rationale_code` | Controlled reason code list. No free text | code | Mentor | observation.progression_recorded | ACTIVE | Y | STATE |
| 4.6.58 | `corrected_decision_ref` | For a corrected progression decision | identifier | System | observation.progression_corrected | ACTIVE | Y | NONE |
| 4.6.59 | `original_decision_date` | For a corrected progression decision | timestamp | System | observation.progression_corrected | ACTIVE | Y | NONE |
| 4.6.60 | `correction_effective_date` | For a corrected progression decision | timestamp | System | observation.progression_corrected | ACTIVE | Y | NONE |
| 4.6.61 | `welfare_stop_ref` | Session reference; no attempt counted; no automatic cooldown | identifier | Mentor | observation.welfare_stop_recorded | ACTIVE | Y | NONE |
| 4.6.62 | `session_started_at` | Runtime start and end, independent of commit time | timestamp | System | observation.session_started, observation.session_ended | ACTIVE | Y | STATE |
| 4.6.63 | `session_ended_at` | Runtime start and end, independent of commit time | timestamp | System | observation.session_started, observation.session_ended | ACTIVE | Y | STATE |
| 4.6.64 | `session_serving_state` | not_served \| served \| aborted \| completed | enum | System | observation.session_ended | ACTIVE | Y | REFUSE |
| 4.6.65 | `session_admin_state` | normal \| disrupted \| withdrawn \| welfare_stopped \| corrected | enum | System or Mentor | observation.session_ended | ACTIVE | Y | REFUSE |
| 4.6.66 | `question_serving_state` | direct \| conditional \| not_served | enum | System | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.67 | `branch_trigger_ref` | parent answer id. A not_served question has no answer row | identifier | System | observation.determination_recorded | ACTIVE | Y | REFUSE |
| 4.6.68 | `prompt_material_sequence` | Ordered list of prompts and materials shown, with timestamps | object | System | observation.response_submitted | ACTIVE | Y | STATE |
| 4.6.69 | `observed_opportunity_ref` | Which opportunity in the source opportunity map applied | identifier | Mentor or System | observation.committed | DORMANT | Y | STATE |
| 4.6.70 | `statement_version` | Version and SHA 256 of the exact Recorded Conduct Entry wording | version_string | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.71 | `statement_digest` | Version and SHA 256 of the exact Recorded Conduct Entry wording | sha256_hex | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.72 | `observation_authorization_ref` | Snapshot of the purpose, consent and source eligibility checks passed at commit | identifier | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.73 | `prior_exposure_known_state` | known_exposure \| no_known_exposure \| not_collected | enum | System | observation.stage_entered | ACTIVE | Y | STATE |
| 4.6.74 | `observer_calibration_version` | Calibration record version current for the session | version_string | System | observation.committed | ACTIVE | Y | REFUSE |
| 4.6.75 | `observer_independence_state` | independent \| conflict_declared \| excluded_by_rule | enum | System | observation.committed, report.review_completed | ACTIVE | Y | REFUSE |
| 4.6.76 | `reviewer_independence_state` | independent \| conflict_declared \| excluded_by_rule | enum | System | observation.committed, report.review_completed | ACTIVE | Y | REFUSE |
| 4.6.77 | `capture_edit_history_ref` | Pointer to before and after values for any determination changed before commit; after commit only supersession | identifier | System | observation.determination_recorded | ACTIVE | Y | NONE |
| 4.6.78 | `observer_disagreement_refs` | Links between records of the same session made by a second independent observer | array | System | observation.committed | ACTIVE | Y | NONE |


### 4.7. Domain F. Mentor, MentorLink and assurance

4.7.0. A role is granted, never chosen. Authorization is per dimension and the authorization valid on the observation date governs. An action belongs to a person, not to an account. Owner: Mentor Service. Store: MNT.


**Table 4.7. Domain F fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.7.1 | `mentor_invitation_id` | Single use, expiring | identifier | Coordinator | mentor.invited, mentor.invitation_redeemed | ACTIVE | Y | REFUSE |
| 4.7.2 | `invited_by` | Single use, expiring | identifier | Coordinator | mentor.invited, mentor.invitation_redeemed | ACTIVE | Y | REFUSE |
| 4.7.3 | `invitation_sent_at` | Single use, expiring | timestamp | Coordinator | mentor.invited, mentor.invitation_redeemed | ACTIVE | Y | REFUSE |
| 4.7.4 | `invitation_expires_at` | Single use, expiring | timestamp | Coordinator | mentor.invited, mentor.invitation_redeemed | ACTIVE | Y | REFUSE |
| 4.7.5 | `invitation_redeemed_at` | Single use, expiring | timestamp | Coordinator | mentor.invited, mentor.invitation_redeemed | ACTIVE | Y | REFUSE |
| 4.7.6 | `mentor_agreement_version` | Semantic version | version_string | Mentor | mentor.agreement_signed | ACTIVE | Y | REFUSE |
| 4.7.7 | `mentor_agreement_signed_at` | timestamp | timestamp | Mentor | mentor.agreement_signed | ACTIVE | Y | REFUSE |
| 4.7.8 | `conflict_declaration_id` | UUID | identifier | Mentor | mentor.conflict_declared | ACTIVE | Y | REFUSE |
| 4.7.9 | `declared_at` | timestamp | timestamp | Mentor | mentor.conflict_declared | ACTIVE | Y | REFUSE |
| 4.7.10 | `declared_entity_refs` | employer or participant references | array | Mentor | mentor.conflict_declared | ACTIVE | Y | REFUSE |
| 4.7.11 | `calibration_record_id` | UUID | identifier | Coordinator | mentor.calibration_recorded | ACTIVE | Y | REFUSE |
| 4.7.12 | `calibration_status` | controlled status | text | Coordinator | mentor.calibration_recorded | ACTIVE | Y | REFUSE |
| 4.7.13 | `authorization_id` | UUID | identifier | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.14 | `authorized_dimension_id` | D1 to D14 | enum | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.15 | `authorization_status` | authorized \| supervised \| suspended \| lapsed \| withdrawn | enum | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.16 | `effective_from` | timestamp UTC | timestamp | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.17 | `effective_to` | Timestamp UTC; empty while the authorization is open ended | timestamp | Coordinator | mentor.authorization_changed | ACTIVE | Y | NONE |
| 4.7.18 | `reviewer_authorization` | Authorizations on eligible mentor accounts, never account types | boolean | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.19 | `issuer_authorization` | Authorizations on eligible mentor accounts, never account types | boolean | Coordinator | mentor.authorization_changed | ACTIVE | Y | REFUSE |
| 4.7.20 | `supervised_sessions_completed` | Integer (first three live sessions) | integer | System | mentor.supervision_recorded | ACTIVE | Y | STATE |
| 4.7.21 | `supervised_status_started_at` | timestamp (maximum 60 days) | timestamp | System | mentor.supervision_recorded | ACTIVE | Y | STATE |
| 4.7.22 | `supervision_finding_code` | Controlled codes, never a number; not_corroborated where unwitnessed | code | Supervisor | mentor.supervision_recorded | ACTIVE | Y | STATE |
| 4.7.23 | `suspension_started_at` | Maximum 90 days, 30 day extensions, 180 day cap | timestamp | Coordinator | mentor.suspension_changed | ACTIVE | Y | NONE |
| 4.7.24 | `suspension_extension_count` | Maximum 90 days, 30 day extensions, 180 day cap | integer | Coordinator | mentor.suspension_changed | ACTIVE | Y | NONE |
| 4.7.25 | `independent_approver_id` | Maximum 90 days, 30 day extensions, 180 day cap | identifier | Coordinator | mentor.suspension_changed | ACTIVE | Y | NONE |
| 4.7.26 | `observations_per_month_commitment` | Integer from configuration | integer | Coordinator | mentor.engagement_recorded | ACTIVE | N | STATE |
| 4.7.27 | `engagement_started_at` | timestamp | timestamp | Coordinator | mentor.engagement_recorded | ACTIVE | N | STATE |
| 4.7.28 | `sourcing_channel` | primary_contributor_network \| professional_network \| professional_association \| retiring_employee_channel \| other | enum | Coordinator | mentor.invited | ACTIVE | Y | STATE |
| 4.7.29 | `sourcing_employer_ref` | employer reference for the conflict bar | identifier | Coordinator | mentor.invited | ACTIVE | Y | STATE |
| 4.7.30 | `evidence_cycle_id` | Per participant and dimension | identifier | System | mentor.function_recorded | ACTIVE | Y | REFUSE |
| 4.7.31 | `cycle_function` | guide \| observer \| evidence_reviewer | enum | System | mentor.function_recorded | ACTIVE | Y | REFUSE |
| 4.7.32 | `involvement_id` | One row per person, record and role; anyone acting in a session is involved | identifier | System | every session action | ACTIVE | Y | REFUSE |
| 4.7.33 | `s1_exposure_flag` | Mentor has seen this participant's S1 on this dimension | boolean | System | observation.s1_confirmed | ACTIVE | Y | REFUSE |
| 4.7.34 | `recusal_id` | One row per person, decision and reason code | identifier | Administrator | governance.recusal_recorded | ACTIVE | Y | NONE |
| 4.7.35 | `stimulus_unit_id` | Calibration study common units and paired determinations per dimension | identifier | Coordinator | calibration.pair_recorded | ACTIVE | Y | STATE |
| 4.7.36 | `paired_determination_set_id` | Calibration study common units and paired determinations per dimension | identifier | Coordinator | calibration.pair_recorded | ACTIVE | Y | STATE |
| 4.7.37 | `agreement_statistic_inputs` | Paired determinations per dimension | object | System | calibration.pair_recorded | ACTIVE | Y | STATE |
| 4.7.38 | `agreement_threshold_version` | configuration version | version_string | System | calibration.pair_recorded | ACTIVE | Y | STATE |
| 4.7.39 | `moderation_sample_flag` | Boolean | boolean | System | calibration.sample_drawn | ACTIVE | Y | STATE |
| 4.7.40 | `sampling_plan_version` | semantic version | version_string | System | calibration.sample_drawn | ACTIVE | Y | STATE |
| 4.7.41 | `reference_set_version` | Semantic version | version_string | Registry | calibration.reference_loaded | ACTIVE | Y | STATE |
| 4.7.42 | `mentor_appeal_id` | 15 business day decision window | identifier | Mentor | mentor.appeal_changed | ACTIVE | Y | NONE |
| 4.7.43 | `opened_at` | 15 business day decision window | timestamp | Mentor | mentor.appeal_changed | ACTIVE | Y | NONE |
| 4.7.44 | `decided_at` | 15 business day decision window | timestamp | Mentor | mentor.appeal_changed | ACTIVE | Y | NONE |
| 4.7.45 | `mentor_confidence_per_determination` | high \| moderate \| low. No control is served in the cockpit | enum | Mentor | none while disabled | SOCKET | Y | NONE |
| 4.7.46 | `observer_qualification_record_ref` | Qualification evidence | identifier | Coordinator | mentor.qualification_recorded | ACTIVE | Y | STATE |
| 4.7.47 | `observer_specialty_domain_codes` | codes from the pinned occupational classification | array | Coordinator | mentor.qualification_recorded | ACTIVE | Y | STATE |
| 4.7.48 | `qualification_reviewed_at` | timestamp | timestamp | Coordinator | mentor.qualification_recorded | ACTIVE | Y | STATE |


### 4.8. Domain G. Evidence review, Behavioral Evidence Report and release

4.8.0. Sufficiency states are derived by rule and never set by hand. Rendering a report and issuing it are separate acts. The participant controls availability, not content. Owner: Report Service. Store: BER.


**Table 4.8. Domain G fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.8.1 | `dimension_evidence_state` | The four states defined by the BER Standard; cross cutting conditions are flags, never a fifth state | code | System | report.assembled | ACTIVE | N | REFUSE |
| 4.8.2 | `cross_cutting_condition_flags` | stage1_only \| mixed_divergent \| single_observer \| conditions_compromised \| earlier_attempt_differs \| evidence_expired | enum | System | report.assembled | ACTIVE | N | STATE |
| 4.8.3 | `insufficiency_reason` | Controlled code | text | System | report.assembled | ACTIVE | N | STATE |
| 4.8.4 | `evidence_review_id` | Review of one exact version set | identifier | Mentor (reviewer) | report.review_completed | ACTIVE | Y | REFUSE |
| 4.8.5 | `reviewer_id` | Review of one exact version set | identifier | Mentor (reviewer) | report.review_completed | ACTIVE | Y | REFUSE |
| 4.8.6 | `review_completed_at` | Review of one exact version set | timestamp | Mentor (reviewer) | report.review_completed | ACTIVE | Y | REFUSE |
| 4.8.7 | `version_set_hash` | Review of one exact version set | sha256_hex | Mentor (reviewer) | report.review_completed | ACTIVE | Y | REFUSE |
| 4.8.8 | `review_checklist_results` | Item code and result per checklist item | object | Mentor (reviewer) | report.review_completed | ACTIVE | Y | REFUSE |
| 4.8.9 | `ber_report_id` | UUID; integer; earlier versions superseded, never deleted | identifier | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.10 | `ber_version` | UUID; integer; earlier versions superseded, never deleted | version_string | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.11 | `issued_by` | Issuer account id, distinct from reviewer_id | identifier | Mentor (issuer) | report.issued | ACTIVE | Y | REFUSE |
| 4.8.12 | `issued_at` | timestamp | timestamp | Mentor (issuer) | report.issued | ACTIVE | Y | REFUSE |
| 4.8.13 | `ber_standard_version` | Semantic versions in force at issue | version_string | Registry | report.issued | ACTIVE | Y | REFUSE |
| 4.8.14 | `sufficiency_rules_version` | Semantic versions in force at issue | version_string | Registry | report.issued | ACTIVE | Y | REFUSE |
| 4.8.15 | `permitted_use_version` | Semantic versions in force at issue | version_string | Registry | report.issued | ACTIVE | Y | REFUSE |
| 4.8.16 | `represented_dimension_ids` | Array; one dimension is permitted | array | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.17 | `observer_multiplicity_statement_code` | Controlled code; no names and no precise count on the report face | code | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.18 | `source_link` | Entry to observation references for every rendered entry | object | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.19 | `verification_code` | Random code, not derived from the report id | code | System | report.issued | ACTIVE | Y | REFUSE |
| 4.8.20 | `ber_status` | not_eligible \| assembling \| reviewer_review \| participant_review \| challenge_open \| ready_to_issue \| issued \| amended \| withdrawn \| expired \| evidence_expired | enum | System | report.status_changed | ACTIVE | Y | REFUSE |
| 4.8.21 | `participant_review_opened_at` | Timestamps | timestamp | Participant | report.participant_review_changed | ACTIVE | Y | STATE |
| 4.8.22 | `participant_review_completed_at` | Timestamps | timestamp | Participant | report.participant_review_changed | ACTIVE | Y | STATE |
| 4.8.23 | `specimen_render_flag` | Boolean; demonstration renders carry the watermark and can never be issued | boolean | System | report.rendered | ACTIVE | Y | REFUSE |
| 4.8.24 | `release_mode` | named_pilot_recipient \| approved_employer_pool | enum | Participant | release.changed | ACTIVE | Y | REFUSE |
| 4.8.25 | `employer_visibility_state` | available_to_approved_employers \| not_available \| future_availability_withdrawn | enum | Participant | release.changed | ACTIVE | Y | REFUSE |
| 4.8.26 | `availability_changed_at` | timestamp | timestamp | Participant | release.changed | ACTIVE | Y | REFUSE |
| 4.8.27 | `recipient_release_id` | UUID or controlled identifier | identifier | Participant | release.recipient_created | ACTIVE | Y | REFUSE |
| 4.8.28 | `recipient_address_hash` | SHA 256 hex | sha256_hex | Participant | release.recipient_created | ACTIVE | Y | REFUSE |
| 4.8.29 | `token_state` | Pilot named recipient; active \| revoked \| expired \| superseded | enum | Participant | release.recipient_created | ACTIVE | Y | REFUSE |
| 4.8.30 | `talentvisa_active` | Boolean, derived; two states only | boolean | System | release.changed | ACTIVE | N | STATE |
| 4.8.31 | `report_access_id` | One row per access: employer organization, user, report version, accessed_at | identifier | System | employer.report_accessed | ACTIVE | Y | REFUSE |
| 4.8.32 | `verification_check_id` | One row per check: code checked, result (status only), timestamp | identifier | System | report.verification_checked | ACTIVE | Y | REFUSE |
| 4.8.33 | `job_family` | Exists and stays empty | text | System | none | SOCKET | N | NONE |
| 4.8.34 | `report_type` | ber (lsa exists and is never served while dormant) | enum | System | report.assembled | ACTIVE | Y | REFUSE |
| 4.8.35 | `report_preview_digest` | SHA 256 of the exact preview shown for participant review | sha256_hex | System | report.participant_review_changed | ACTIVE | Y | REFUSE |
| 4.8.36 | `preview_state` | current \| stale | enum | System | report.participant_review_changed | ACTIVE | Y | REFUSE |
| 4.8.37 | `report_content_digest` | SHA 256 of the issued report content | sha256_hex | System | report.issued | ACTIVE | Y | REFUSE |


### 4.9. Domain H. Challenge, correction and reconsideration

4.9.0. The participant may review and challenge every committed observation. Records are never deleted. The second check of every reconsideration is permanent. Owner: Report Service. Store: BER.


**Table 4.9. Domain H fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.9.1 | `challenge_case_id` | UUID | identifier | Participant | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.2 | `opened_by` | participant account | identifier | Participant | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.3 | `opened_at` | timestamp | timestamp | Participant | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.4 | `challenge_target_ref` | observation_id, clause_instance_id or progression_decision_id | identifier | Participant | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.5 | `challenge_ground` | factual_error \| mistaken_identity \| procedural_failure \| observer_conflict \| inaccurate_description \| compromised_conditions | enum | Participant | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.6 | `evidence_disclosed_at` | Timestamp | timestamp | System | challenge.evidence_disclosed | ACTIVE | Y | STATE |
| 4.9.7 | `reconsiderer_id` | Uninvolved authorized people | identifier | Coordinator | challenge.assigned | ACTIVE | Y | REFUSE |
| 4.9.8 | `second_check_actor_id` | Uninvolved authorized people | identifier | Coordinator | challenge.assigned | ACTIVE | Y | REFUSE |
| 4.9.9 | `challenge_outcome` | upheld \| amended \| clause_withdrawn \| not_upheld | enum | Reconsiderer | challenge.resolved | ACTIVE | Y | REFUSE |
| 4.9.10 | `outcome_reason_code` | controlled reason | code | Reconsiderer | challenge.resolved | ACTIVE | Y | REFUSE |
| 4.9.11 | `resolved_at` | timestamp | timestamp | Reconsiderer | challenge.resolved | ACTIVE | Y | REFUSE |
| 4.9.12 | `response_time_committed_version` | Configuration version in force for the case | version_string | Configuration | challenge.opened | ACTIVE | Y | REFUSE |
| 4.9.13 | `issuance_hold` | Boolean, true while any challenge is open on a contributing record | boolean | System | challenge.opened | ACTIVE | N | REFUSE |
| 4.9.14 | `correction_request_id` | Participant correction of a factual record | identifier | Participant | correction.changed | ACTIVE | Y | NONE |
| 4.9.15 | `correction_outcome` | Participant correction of a factual record | text | Participant | correction.changed | ACTIVE | Y | NONE |
| 4.9.16 | `complaint_id` | Acknowledged within two business days | identifier | Participant | complaint.changed | ACTIVE | Y | NONE |
| 4.9.17 | `complaint_acknowledged_at` | Acknowledged within two business days | timestamp | Participant | complaint.changed | ACTIVE | Y | NONE |


### 4.10. Domain I. Employer organization and exchange

4.10.0. Approval is not access. An approved organization may be present; it reads nothing about any individual except what the release rules allow. Owner: Employer Service. Store: EMP.


**Table 4.10. Domain I fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.10.1 | `employer_application_id` | UUID | identifier | Employer | employer.application_changed | ACTIVE | Y | REFUSE |
| 4.10.2 | `application_status` | pending \| approved \| declined \| withdrawn | enum | Employer | employer.application_changed | ACTIVE | Y | REFUSE |
| 4.10.3 | `work_email` | Verification inputs | text | Employer | employer.application_submitted | ACTIVE | Y | REFUSE |
| 4.10.4 | `legal_entity_name` | Verification inputs | text | Employer | employer.application_submitted | ACTIVE | Y | REFUSE |
| 4.10.5 | `business_registry_id` | Verification inputs | identifier | Employer | employer.application_submitted | ACTIVE | Y | REFUSE |
| 4.10.6 | `organization_domain` | Verification inputs | text | Employer | employer.application_submitted | ACTIVE | Y | REFUSE |
| 4.10.7 | `free_provider_refused` | Booleans | boolean | System | employer.application_submitted | ACTIVE | Y | STATE |
| 4.10.8 | `domain_age_flag` | domain registered within 90 days flags for review | boolean | System | employer.application_submitted | ACTIVE | Y | STATE |
| 4.10.9 | `accepting_person_name` | Person accepting the record use terms | text | Employer | employer.terms_accepted | ACTIVE | Y | REFUSE |
| 4.10.10 | `accepting_person_title` | Person accepting the record use terms | text | Employer | employer.terms_accepted | ACTIVE | Y | REFUSE |
| 4.10.11 | `record_use_terms_version` | Person accepting the record use terms | version_string | Employer | employer.terms_accepted | ACTIVE | Y | REFUSE |
| 4.10.12 | `terms_accepted_at` | Person accepting the record use terms | timestamp | Employer | employer.terms_accepted | ACTIVE | Y | REFUSE |
| 4.10.13 | `approval_decision` | approved \| declined | enum | Administrator | employer.application_decided | ACTIVE | Y | REFUSE |
| 4.10.14 | `approver_id` | account id | identifier | Administrator | employer.application_decided | ACTIVE | Y | REFUSE |
| 4.10.15 | `decided_at` | timestamp | timestamp | Administrator | employer.application_decided | ACTIVE | Y | REFUSE |
| 4.10.16 | `decision_basis` | controlled basis | text | Administrator | employer.application_decided | ACTIVE | Y | REFUSE |
| 4.10.17 | `organization_id` | UUID | identifier | System | employer.verification_changed | ACTIVE | Y | REFUSE |
| 4.10.18 | `verification_status` | pending \| verified \| not_verified (one value, two renderings) | enum | System | employer.verification_changed | ACTIVE | Y | REFUSE |
| 4.10.19 | `pool_query_id` | One row per query: filter criteria (participant stated fields only), result band before and after, user, timestamp | identifier | System | employer.pool_queried | ACTIVE | Y | REFUSE |
| 4.10.20 | `contact_request_id` | Gated by contact consent | identifier | Employer | employer.contact_requested | ACTIVE | Y | REFUSE |
| 4.10.21 | `contact_request_state` | Gated by contact consent | text | Employer | employer.contact_requested | ACTIVE | Y | REFUSE |
| 4.10.22 | `hire_recorded_id` | Employer entered row with timestamp; carries no participant or report link | identifier | Employer | employer.hire_recorded | ACTIVE | Y | NONE |
| 4.10.23 | `employer_attestation_id` | "This record informed our decision", attached to one record interaction; never counted as a hire | identifier | Employer | employer.attestation_recorded | ACTIVE | Y | NONE |
| 4.10.24 | `workspace_note_id` | Constrained organization note; never conduct derived | identifier | Employer | employer.note_changed | ACTIVE | N | NONE |
| 4.10.25 | `liveworks_activation_state` | not_activated \| activated, with actor and timestamp | enum | Configuration | system.configuration_changed | ACTIVE | Y | STATE |
| 4.10.26 | `design_partner_flag` | Boolean | boolean | Administrator | employer.design_partner_changed | ACTIVE | Y | STATE |
| 4.10.27 | `employment_linkage_id` | Entity exists; capture and read disabled | identifier | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.28 | `linked_participant_id` | Entity exists; capture and read disabled | identifier | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.29 | `linked_organization_id` | Entity exists; capture and read disabled | identifier | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.30 | `linked_role_code` | Entity exists; capture and read disabled | code | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.31 | `employment_start_date` | Entity exists; capture and read disabled | timestamp | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.32 | `employer_respondent_id` | Entity exists | identifier | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.33 | `respondent_role` | disabled | text | Employer | none while disabled | SOCKET | Y | NONE |
| 4.10.34 | `ats_hris_integration_ref` | Adapter socket; disabled | identifier | Employer | none while disabled | SOCKET | N | NONE |


### 4.11. Domain J. Growth Log

4.11.0. The Growth Log is live from day 1, visible to the participant only, and feeds nothing. It stores only entries the participant creates; observation history is shown through a read only view (paragraph 3.5). Owner: Growth Log Service. Store: GLG.


**Table 4.11. Domain J fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.11.1 | `entry_id` | UUID v4 | identifier | System | growthlog.entry_created | ACTIVE | N | REFUSE |
| 4.11.2 | `created_by` | Always the participant | identifier | Participant | growthlog.entry_created | ACTIVE | N | REFUSE |
| 4.11.3 | `entry_kind` | practice_note \| rehearsal_reference | enum | Participant | growthlog.entry_created | ACTIVE | N | REFUSE |
| 4.11.4 | `text` | Participant's own words | text | Participant | growthlog.entry_created | ACTIVE | N | STATE |
| 4.11.5 | `module_reference` | Participant facing title only, optional | text | Participant | growthlog.entry_created | ACTIVE | N | STATE |
| 4.11.6 | `created_at` | Timestamps; semantic version | timestamp | System | growthlog.entry_changed | ACTIVE | N | REFUSE |
| 4.11.7 | `updated_at` | Timestamps; semantic version | timestamp | System | growthlog.entry_changed | ACTIVE | N | REFUSE |
| 4.11.8 | `schema_version` | Timestamps; semantic version | version_string | System | growthlog.entry_changed | ACTIVE | N | REFUSE |


### 4.12. Domain K. Rehearsal domain and aggregate telemetry

4.12.0. Rehearsal records stay in the rehearsal store, private to the participant. Only aggregate counts may ever leave it, into a write only sink with no identity and no join key. Owner: Rehearsal Service. Store: REH / TEL.


**Table 4.12. Domain K fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.12.1 | `rehearsal_session_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.2 | `module_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.3 | `module_version` | Rehearsal store only | version_string | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.4 | `workplace_moment_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.5 | `rehearsal_started_at` | Rehearsal store only | timestamp | System | rehearsal.session_completed | ACTIVE | N | STATE |
| 4.12.6 | `rehearsal_completed_at` | Rehearsal store only | timestamp | System | rehearsal.session_completed | ACTIVE | N | STATE |
| 4.12.7 | `rehearsal_completion_state` | Rehearsal store only | enum | System | rehearsal.session_completed | ACTIVE | N | STATE |
| 4.12.8 | `rehearsal_choice_record_id` | Rehearsal store only; impact indicators never reach evidence or a report | identifier | Participant | rehearsal.choice_made | ACTIVE | N | NONE |
| 4.12.9 | `cohort_period` | Telemetry sink; a period below the suppression floor writes no row | code | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.10 | `sessions_started` | Telemetry sink; a period below the suppression floor writes no row | integer | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.11 | `sessions_completed` | Telemetry sink; a period below the suppression floor writes no row | integer | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.12 | `feedback_generated_count` | Telemetry sink; bucketed counts only | integer | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.13 | `feedback_acknowledged_count` | Telemetry sink; bucketed counts only | integer | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.14 | `retake_within_window_count` | Telemetry sink; bucketed counts only | integer | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.15 | `duration_distribution` | Telemetry sink; bucketed counts only | object | System | telemetry.period_closed | SOCKET | Y | NONE |
| 4.12.16 | `module_dimension_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | STATE |
| 4.12.17 | `module_segment_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | STATE |
| 4.12.18 | `private_scenario_id` | Rehearsal situation and the sector and audience overlay actually served | identifier | System | rehearsal.session_started | ACTIVE | N | STATE |
| 4.12.19 | `private_scenario_version` | Rehearsal situation and the sector and audience overlay actually served | version_string | System | rehearsal.session_started | ACTIVE | N | STATE |
| 4.12.20 | `variant_tuple` | Rehearsal situation and the sector and audience overlay actually served | object | System | rehearsal.session_started | ACTIVE | N | STATE |
| 4.12.21 | `rehearsal_attempt_id` | Rehearsal store only | identifier | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.22 | `rehearsal_attempt_no` | independent of observation attempts | integer | System | rehearsal.session_started | ACTIVE | N | REFUSE |
| 4.12.23 | `module_completion_state` | complete \| partial \| abandoned | enum | System | rehearsal.session_completed | ACTIVE | N | STATE |
| 4.12.24 | `module_completion_at` | timestamp | timestamp | System | rehearsal.session_completed | ACTIVE | N | STATE |
| 4.12.25 | `rehearsal_decision_path_ref` | Pointer to choices selected, rehearsal store only | identifier | Participant | rehearsal.choice_made | ACTIVE | N | NONE |
| 4.12.26 | `participant_artifact_ref` | Pointer to the participant's rehearsal output | identifier | Participant | rehearsal.artifact_saved | ACTIVE | N | NONE |
| 4.12.27 | `participant_artifact_version` | Pointer to the participant's rehearsal output | version_string | Participant | rehearsal.artifact_saved | ACTIVE | N | NONE |
| 4.12.28 | `participant_reflection_ref` | Participant's own words and the exact prompt shown | identifier | Participant | rehearsal.reflection_saved | ACTIVE | N | NONE |
| 4.12.29 | `reflection_prompt_id` | Participant's own words and the exact prompt shown | identifier | Participant | rehearsal.reflection_saved | ACTIVE | N | NONE |
| 4.12.30 | `reflection_prompt_version` | Participant's own words and the exact prompt shown | version_string | Participant | rehearsal.reflection_saved | ACTIVE | N | NONE |
| 4.12.31 | `final_personal_sentence_ref` | Participant's closing sentence for module callbacks | identifier | Participant | rehearsal.reflection_saved | ACTIVE | N | NONE |
| 4.12.32 | `reference_examples_viewed_refs` | What sample material and consequence horizons were shown | array | System | rehearsal.content_displayed | ACTIVE | N | NONE |
| 4.12.33 | `consequence_horizons_displayed` | What sample material and consequence horizons were shown | array | System | rehearsal.content_displayed | ACTIVE | N | NONE |
| 4.12.34 | `response_modality` | text \| voice \| accessible_alternative | enum | Participant | rehearsal.choice_made | ACTIVE | N | STATE |
| 4.12.35 | `voice_transcript_ref` | pointer, only if the participant submitted voice | identifier | Participant | rehearsal.choice_made | ACTIVE | N | STATE |
| 4.12.36 | `feedback_source_type` | canned_reference \| self_reflection \| human_developmental; timestamps | enum | System | rehearsal.feedback_displayed | ACTIVE | N | STATE |
| 4.12.37 | `feedback_viewed_at` | Timestamp UTC | timestamp | System | rehearsal.feedback_displayed | ACTIVE | N | STATE |
| 4.12.38 | `feedback_acknowledged_at` | Timestamp UTC | timestamp | System | rehearsal.feedback_displayed | ACTIVE | N | STATE |
| 4.12.39 | `retention_check_instance_id` | UUID | identifier | System | rehearsal.retention_check_changed | ACTIVE | N | STATE |
| 4.12.40 | `retention_check_status` | pending \| served \| completed \| declined \| expired | enum | System | rehearsal.retention_check_changed | ACTIVE | N | STATE |


### 4.13. Domain L. Commercial

4.13.0. Commercial records never enter evidence composition. Packages may vary observation engagements, mentor hour allocation or access duration only. A Stage or a dimension is never a commercial lever. Owner: Commercial Service. Store: CMR.


**Table 4.13. Domain L fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.13.1 | `order_id` | UUID; codes | identifier | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.2 | `account_id` | UUID; codes | identifier | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.3 | `product_code` | UUID; codes | code | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.4 | `package_code` | UUID; codes | code | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.5 | `package_entitlements` | observation_engagements \| mentor_hour_allocation \| access_duration only | enum | Registry | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.6 | `purchased_at` | Timestamps UTC | timestamp | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.7 | `access_starts_at` | Timestamps UTC | timestamp | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.8 | `access_ends_at` | Timestamps UTC | timestamp | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.9 | `price_amount` | Decimal | decimal | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.10 | `currency` | ISO 4217 | code | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.11 | `tax_jurisdiction` | code | code | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.12 | `founding_member_flag` | boolean | boolean | System | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.13 | `payment_provider_ref` | Provider token only; card data never stored | identifier | Payment provider | commerce.order_completed | ACTIVE | Y | REFUSE |
| 4.13.14 | `refund_id` | One row per refund: amount, timestamp, controlled reason | identifier | Commercial | commerce.refund_issued | ACTIVE | Y | NONE |
| 4.13.15 | `subscription_plan` | Structure exists; disabled until a subscription product is loaded | text | System | none while disabled | SOCKET | Y | NONE |
| 4.13.16 | `renewal_at` | Structure exists; disabled until a subscription product is loaded | timestamp | System | none while disabled | SOCKET | Y | NONE |
| 4.13.17 | `cancellation_reason_code` | Structure exists; disabled until a subscription product is loaded | code | System | none while disabled | SOCKET | Y | NONE |


### 4.14. Domain M. Dormant longitudinal module (lsa)

4.14.0. The fields in Domain C, D and E marked DORMANT plus the lsa tables below. A dormant consumer subscribes to observation events and writes only to lsa tables. It never reads the Growth Log store or any rehearsal store. Owner: lsa Consumer. Store: LSA.


**Table 4.14. Domain M fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.14.1 | `lsa_snapshot_id` | Frozen inputs for one comparison | identifier | lsa Consumer | lsa.snapshot_built | SOCKET | Y | NONE |
| 4.14.2 | `snapshot_at` | Frozen inputs for one comparison | timestamp | lsa Consumer | lsa.snapshot_built | SOCKET | Y | NONE |
| 4.14.3 | `pinned_version_set` | Frozen inputs for one comparison | object | lsa Consumer | lsa.snapshot_built | SOCKET | Y | NONE |
| 4.14.4 | `lsa_comparison_result` | Per conduct element: direction code from approved entries only, exclusion codes EX01 to EX07, refusal codes LSA R01 to R10 | object | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.5 | `lsa_report_id` | UUID | identifier | lsa Consumer | lsa.report_issued | SOCKET | Y | NONE |
| 4.14.6 | `lsa_verification_code` | random code | code | lsa Consumer | lsa.report_issued | SOCKET | Y | NONE |
| 4.14.7 | `session_archive_tab_state` | frozen (only value while dormant) | enum | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.14.8 | `longitudinal_case_id` | Case identity and the bounded proposition compared | identifier | lsa Consumer | lsa.snapshot_built | SOCKET | Y | NONE |
| 4.14.9 | `comparison_scope_id` | Case identity and the bounded proposition compared | identifier | lsa Consumer | lsa.snapshot_built | SOCKET | Y | NONE |
| 4.14.10 | `included_observation_refs` | Complete evidence window, every exclusion with its reason, every contrary observation | array | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.11 | `excluded_observation_refs` | Complete evidence window, every exclusion with its reason, every contrary observation | array | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.12 | `exclusion_reason_codes` | Complete evidence window, every exclusion with its reason, every contrary observation | array | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.13 | `counterevidence_refs` | Complete evidence window, every exclusion with its reason, every contrary observation | array | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.14 | `transition_rule_version` | Versions and the deterministic trace of each resolution or refusal | version_string | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.15 | `lsa_sufficiency_rule_version` | Versions and the deterministic trace of each resolution or refusal | version_string | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.16 | `resolution_trace_ref` | Versions and the deterministic trace of each resolution or refusal | identifier | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.17 | `finding_code` | progression \| regression \| consistency \| mixed \| descriptive_only \| insufficient \| incomparable | enum | lsa Consumer | lsa.comparison_built | SOCKET | Y | NONE |
| 4.14.18 | `lsa_sidecar_id` | Optional storage pattern for the DORMANT fields: an append only row per observation_id; a failed write never rolls back the observation commit | identifier | lsa Consumer | observation.committed | DORMANT | Y | STATE |


### 4.15. Domain N. Event log envelope

4.15.0. Every meaningful action emits one structured record under a canonical name. Append only: no update, no delete. A correction is a new event that references the original. Owner: Event Log. Store: EVL.


**Table 4.15. Domain N fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.15.1 | `event_id` | UUID v4 | identifier | System | every event | ACTIVE | Y | REFUSE |
| 4.15.2 | `event_name` | Canonical category.action name from the event registry | text | System | every event | ACTIVE | Y | REFUSE |
| 4.15.3 | `event_category` | OBSERVATION \| MENTOR \| PARTICIPANT \| EMPLOYER \| REPORT \| CONSENT \| GOVERNANCE \| SYSTEM \| COMMERCIAL \| REHEARSAL | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.4 | `occurred_at` | Timestamps UTC, millisecond precision | timestamp | System | every event | ACTIVE | Y | REFUSE |
| 4.15.5 | `ingested_at` | Timestamps UTC, millisecond precision | timestamp | System | every event | ACTIVE | Y | REFUSE |
| 4.15.6 | `actor_type` | PARTICIPANT \| MENTOR \| EMPLOYER_USER \| ADMINISTRATOR \| SYSTEM_SERVICE | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.7 | `actor_id` | account or process id | identifier | System | every event | ACTIVE | Y | REFUSE |
| 4.15.8 | `subject_id` | Account whose record is affected | identifier | System | every event | ACTIVE | Y | STATE |
| 4.15.9 | `session_id` | UUID | identifier | System | every event | ACTIVE | Y | STATE |
| 4.15.10 | `correlation_id` | UUID nullable | identifier | System | every event | ACTIVE | Y | STATE |
| 4.15.11 | `resource_type` | Resource enum | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.12 | `resource_id` | UUID | identifier | System | every event | ACTIVE | Y | REFUSE |
| 4.15.13 | `payload` | JSON validated against the per event schema; maximum 4 KB; no names, addresses or free text | object | System | every event | ACTIVE | Y | REFUSE |
| 4.15.14 | `artifact_ref_id` | Pointer to secured store; content is never embedded | identifier | System | events with artifacts | ACTIVE | Y | NONE |
| 4.15.15 | `schema_version` | Semantic versions | version_string | System | every event | ACTIVE | Y | REFUSE |
| 4.15.16 | `dictionary_version` | Semantic versions | version_string | System | every event | ACTIVE | Y | REFUSE |
| 4.15.17 | `integrity_status` | ok \| missing_keys \| invalid_bounds \| suspected_duplicate \| manual_review | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.18 | `integrity_hash` | SHA 256 over core fields | sha256_hex | System | every event | ACTIVE | Y | REFUSE |
| 4.15.19 | `previous_hash` | hash of the previous event in the same stream | sha256_hex | System | every event | ACTIVE | Y | REFUSE |
| 4.15.20 | `supersedes_event_id` | UUID nullable | identifier | System | correction events | ACTIVE | Y | NONE |
| 4.15.21 | `source_system` | web \| mobile \| api \| internal_job | enum | System | every event | ACTIVE | N | STATE |
| 4.15.22 | `record_property` | real \| synthetic_test \| demonstration, inherited | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.23 | `event_idempotency_key` | Unique key per logical action; a replay returns the first accepted event | text | System | every event | ACTIVE | Y | REFUSE |
| 4.15.24 | `event_sequence_no` | Integer order within one stream | integer | System | every event | ACTIVE | Y | STATE |
| 4.15.25 | `event_processing_state` | accepted \| quarantined \| rejected \| corrected | enum | System | every event | ACTIVE | Y | REFUSE |
| 4.15.26 | `actor_role_code` | Role held by the actor at the instant of the event | code | System | every event | ACTIVE | Y | REFUSE |
| 4.15.27 | `policy_decision_ref` | Authorization decision id | identifier | System | every event | ACTIVE | N | STATE |
| 4.15.28 | `change_request_ref` | registry change that introduced the behavior | identifier | System | every event | ACTIVE | N | STATE |
| 4.15.29 | `application_session_id` | Sign in session, distinct from workflow session_id and correlation_id | identifier | System | every event | ACTIVE | N | STATE |


### 4.16. Domain O. Registries, configuration and versioning

4.16.0. Every versioned asset lives in a registry entry. The registry, not code comments, is the source of truth for what version is active. Owner: Registry Service. Store: REG.


**Table 4.16. Domain O fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.16.1 | `asset_id` | Asset types listed in paragraph 6.4 | identifier | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.2 | `asset_type` | Asset types listed in paragraph 6.4 | text | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.3 | `current_version` | Asset types listed in paragraph 6.4 | version_string | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.4 | `previous_version` | Asset types listed in paragraph 6.4 | version_string | Registry | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.5 | `change_request_id` | Change record | identifier | Administrator | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.6 | `changed_by` | Change record | identifier | Administrator | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.7 | `changed_at` | Change record | timestamp | Administrator | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.8 | `compatibility_class` | Change record | code | Administrator | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.9 | `deployment_status` | Change record | text | Administrator | registry.version_registered | ACTIVE | Y | REFUSE |
| 4.16.10 | `version_hash` | SHA 256 | sha256_hex | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.16.11 | `version_change_reason` | reason code | text | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.16.12 | `approval_authority` | account id | text | Administrator | registry.version_approved | ACTIVE | Y | REFUSE |
| 4.16.13 | `configuration_key` | Every runtime value; an unset value refuses and never defaults | text | Administrator | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.16.14 | `configuration_value` | Every runtime value; an unset value refuses and never defaults | text | Administrator | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.16.15 | `configuration_version` | Every runtime value; an unset value refuses and never defaults | version_string | Administrator | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.16.16 | `set_by` | Every runtime value; an unset value refuses and never defaults | identifier | Administrator | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.16.17 | `set_at` | Every runtime value; an unset value refuses and never defaults | timestamp | Administrator | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.16.18 | `manifest_signature` | Signature by the founder's private key | text | System | system.manifest_verified | ACTIVE | Y | REFUSE |
| 4.16.19 | `manifest_verified_at` | public key read only in the repository | timestamp | System | system.manifest_verified | ACTIVE | Y | REFUSE |
| 4.16.20 | `dimension_schema_version` | Semantic version per dimension definition | version_string | Registry | registry.version_registered | ACTIVE | Y | REFUSE |


### 4.17. Domain P. Retention, security, privacy and audit

4.17.0. Visibility is not authorship. Every privileged action and every read of observation or message content is logged with person, time, subject and basis. Owner: Assurance. Store: AUD.


**Table 4.17. Domain P fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.17.1 | `retention_class` | issued_report \| underlying_evidence \| identity_evidence \| audit_log \| challenge_record \| verification_metadata \| anonymized_research | enum | System | every record write | ACTIVE | Y | REFUSE |
| 4.17.2 | `retention_period_value` | Configuration per class | integer | Configuration | system.configuration_changed | ACTIVE | Y | STATE |
| 4.17.3 | `counsel_ratified_at` | destruction runs stay disabled while counsel_ratified_at is null | timestamp | Configuration | system.configuration_changed | ACTIVE | Y | STATE |
| 4.17.4 | `destruction_run_id` | UUID; UUID. Timestamped, logged; disabled in this build | identifier | System | retention.run_completed | SOCKET | Y | NONE |
| 4.17.5 | `anonymization_run_id` | UUID; UUID. Timestamped, logged; disabled in this build | identifier | System | retention.run_completed | SOCKET | Y | NONE |
| 4.17.6 | `privileged_access_id` | One row per action: person, target, timestamp, basis | identifier | System | governance.privileged_access | ACTIVE | Y | REFUSE |
| 4.17.7 | `content_read_id` | One row per read: person, record or message read, timestamp, basis | identifier | System | governance.content_read | ACTIVE | Y | REFUSE |
| 4.17.8 | `control_run_id` | One row per run: control id, run, result; exportable | identifier | System | governance.control_operated | ACTIVE | Y | REFUSE |
| 4.17.9 | `suppression_id` | UUID | identifier | System | governance.suppression_applied | ACTIVE | Y | REFUSE |
| 4.17.10 | `suppression_reason` | small_n \| dominance \| integrity_low \| gate_not_met | enum | System | governance.suppression_applied | ACTIVE | Y | REFUSE |
| 4.17.11 | `data_access_request_id` | Received, acknowledged, fulfilled timestamps | identifier | Participant | privacy.request_changed | ACTIVE | Y | NONE |
| 4.17.12 | `data_correction_request_id` | Received, acknowledged, fulfilled timestamps | identifier | Participant | privacy.request_changed | ACTIVE | Y | NONE |
| 4.17.13 | `incident_id` | Security or privacy incident | identifier | Administrator | governance.incident_changed | ACTIVE | Y | NONE |
| 4.17.14 | `severity` | Security or privacy incident | enum | Administrator | governance.incident_changed | ACTIVE | Y | NONE |
| 4.17.15 | `affected_record_count` | Security or privacy incident | integer | Administrator | governance.incident_changed | ACTIVE | Y | NONE |
| 4.17.16 | `notified_at` | Security or privacy incident | timestamp | Administrator | governance.incident_changed | ACTIVE | Y | NONE |
| 4.17.17 | `hosting_region` | ca only | enum | Configuration | system.deployment_verified | ACTIVE | Y | REFUSE |
| 4.17.18 | `backup_region` | ca only | enum | Configuration | system.deployment_verified | ACTIVE | Y | REFUSE |
| 4.17.19 | `verification_link_ttl` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.20 | `verification_resend_cooldown` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.21 | `mentor_invitation_ttl` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.22 | `recipient_release_token_ttl` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.23 | `recipient_passcode_ttl` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.24 | `stage_entry_hold_ttl` | Duration in seconds; integer; each one | integer | Configuration | system.configuration_changed | ACTIVE | Y | REFUSE |
| 4.17.25 | `retention_policy_version` | Schedule version applied to the record | version_string | System | every record write | ACTIVE | Y | REFUSE |
| 4.17.26 | `retention_review_at` | next review date | timestamp | System | every record write | ACTIVE | Y | REFUSE |
| 4.17.27 | `error_journal_id` | Independent durable journal entry written when an event cannot be written; reconciled into the event log later | identifier | System | event write failure | ACTIVE | Y | NONE |
| 4.17.28 | `error_journal_written_at` | Independent durable journal entry written when an event cannot be written; reconciled into the event log later | timestamp | System | event write failure | ACTIVE | Y | NONE |
| 4.17.29 | `reconciled_event_id` | Independent durable journal entry written when an event cannot be written; reconciled into the event log later | identifier | System | event write failure | ACTIVE | Y | NONE |
| 4.17.30 | `legal_hold_ref` | Hold record that suspends destruction for named records | identifier | Administrator | governance.legal_hold_changed | ACTIVE | Y | NONE |


### 4.18. Domain Q. Institutional intelligence, licensing and research

4.18.0. Inactive until separately approved. Structure is built now so nothing must be retrofitted. No route is enabled by this package. Owner: Assurance. Store: LIC / RSC.


**Table 4.18. Domain Q fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.18.1 | `aggregate_dataset_definition_id` | Definitions and the minimum cell size | identifier | Configuration | none while disabled | SOCKET | Y | NONE |
| 4.18.2 | `suppression_floor_k` | Definitions and the minimum cell size | integer | Configuration | none while disabled | SOCKET | Y | NONE |
| 4.18.3 | `licensee_id` | Licensing records | identifier | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.4 | `license_terms_version` | Licensing records | version_string | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.5 | `output_id` | Licensing records | identifier | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.6 | `framing_disclaimer_version` | Licensing records | version_string | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.7 | `delivered_at` | Licensing records | timestamp | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.8 | `misuse_termination_at` | Licensing records | timestamp | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.9 | `public_trend_count_series` | Counts computed from the event log only | object | System | none while disabled | SOCKET | Y | NONE |
| 4.18.10 | `research_protocol_id` | Separate store; never joined to operational data | identifier | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.11 | `ethics_approval_ref` | Separate store; never joined to operational data | identifier | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.12 | `consented_attribute_record` | Separate store; never joined to operational data | object | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.13 | `followup_window` | 30, 60 and 90 day follow up structure; disabled | enum | System | none while disabled | SOCKET | Y | NONE |
| 4.18.14 | `followup_sent_at` | 30, 60 and 90 day follow up structure; disabled | timestamp | System | none while disabled | SOCKET | Y | NONE |
| 4.18.15 | `followup_response_status` | 30, 60 and 90 day follow up structure; disabled | enum | System | none while disabled | SOCKET | Y | NONE |
| 4.18.16 | `question_set_version` | 30, 60 and 90 day follow up structure; disabled | version_string | System | none while disabled | SOCKET | Y | NONE |
| 4.18.17 | `verification_level` | 30, 60 and 90 day follow up structure; disabled | enum | System | none while disabled | SOCKET | Y | NONE |
| 4.18.18 | `delivery_channel` | 30, 60 and 90 day follow up structure; disabled | enum | System | none while disabled | SOCKET | Y | NONE |
| 4.18.19 | `metric_definition_id` | Sanctioned metric definitions | identifier | Configuration | none while disabled | SOCKET | Y | NONE |
| 4.18.20 | `metric_definition_version` | Sanctioned metric definitions | version_string | Configuration | none while disabled | SOCKET | Y | NONE |
| 4.18.21 | `metric_allowed_use_ref` | Sanctioned metric definitions | identifier | Configuration | none while disabled | SOCKET | Y | NONE |
| 4.18.22 | `analysis_population_rule_ref` | Inputs of any aggregate | identifier | System | none while disabled | SOCKET | Y | NONE |
| 4.18.23 | `analysis_time_window_ref` | Inputs of any aggregate | identifier | System | none while disabled | SOCKET | Y | NONE |
| 4.18.24 | `aggregate_source_snapshot_digest` | Inputs of any aggregate | sha256_hex | System | none while disabled | SOCKET | Y | NONE |
| 4.18.25 | `aggregate_denominator_count` | Every aggregate carries its denominator, its unknowns and its version and Stage mix | integer | System | none while disabled | SOCKET | Y | NONE |
| 4.18.26 | `aggregate_unknown_count` | Every aggregate carries its denominator, its unknowns and its version and Stage mix | integer | System | none while disabled | SOCKET | Y | NONE |
| 4.18.27 | `source_version_mix_ref` | Every aggregate carries its denominator, its unknowns and its version and Stage mix | identifier | System | none while disabled | SOCKET | Y | NONE |
| 4.18.28 | `stage_mix_ref` | Every aggregate carries its denominator, its unknowns and its version and Stage mix | identifier | System | none while disabled | SOCKET | Y | NONE |
| 4.18.29 | `concentration_risk_result` | Disclosure control records per output | object | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.30 | `reidentification_review_ref` | Disclosure control records per output | identifier | Administrator | none while disabled | SOCKET | Y | NONE |
| 4.18.31 | `publication_authorization_ref` | Disclosure control records per output | identifier | Administrator | none while disabled | SOCKET | Y | NONE |


### 4.19. Domain R. Programs, cohorts and partner organizations

4.19.0. Real delivery programs, pilots and partner relationships. A record exists only where a real program exists; nothing is inferred and no placeholder tenant is created. Owner: Program Service. Store: PRG.


**Table 4.19. Domain R fields**

| No. | Field | Type and permitted values | Canonical type | Source | Trigger | Status | Irr. | If absent |
|---|---|---|---|---|---|---|---|---|
| 4.19.1 | `organization_type` | employer \| workforce_agency \| settlement_agency \| professional_association \| education_provider \| community_organization \| other | enum | Administrator | program.organization_registered | ACTIVE | Y | REFUSE |
| 4.19.2 | `organization_industry_code` | NAICS Canada 2022 two digit sector code | code | Administrator | program.organization_registered | ACTIVE | N | STATE |
| 4.19.3 | `partner_relationship_effective_at` | Agreement window and pointer | timestamp | Administrator | program.agreement_changed | ACTIVE | Y | NONE |
| 4.19.4 | `partner_relationship_ended_at` | Agreement window and pointer | timestamp | Administrator | program.agreement_changed | ACTIVE | Y | NONE |
| 4.19.5 | `data_use_agreement_ref` | Agreement window and pointer | identifier | Administrator | program.agreement_changed | ACTIVE | Y | NONE |
| 4.19.6 | `organization_program_id` | Program identity and its terms version | identifier | Administrator | program.created | ACTIVE | Y | REFUSE |
| 4.19.7 | `program_version` | Program identity and its terms version | version_string | Administrator | program.created | ACTIVE | Y | REFUSE |
| 4.19.8 | `program_membership_id` | Participant, program, dates and the record that establishes membership | identifier | Administrator | program.membership_changed | ACTIVE | Y | NONE |
| 4.19.9 | `program_enrolled_at` | Participant, program, dates and the record that establishes membership | timestamp | Administrator | program.membership_changed | ACTIVE | Y | NONE |
| 4.19.10 | `program_exit_at` | Participant, program, dates and the record that establishes membership | timestamp | Administrator | program.membership_changed | ACTIVE | Y | NONE |
| 4.19.11 | `membership_basis_ref` | Participant, program, dates and the record that establishes membership | identifier | Administrator | program.membership_changed | ACTIVE | Y | NONE |
| 4.19.12 | `cohort_id` | UUID | identifier | Administrator | program.cohort_created | ACTIVE | Y | REFUSE |
| 4.19.13 | `cohort_type` | pilot \| program \| design_partner | enum | Administrator | program.cohort_created | ACTIVE | Y | REFUSE |
| 4.19.14 | `cohort_definition_version` | version. pilot_cohort_id in Domain A references a cohort_id | version_string | Administrator | program.cohort_created | ACTIVE | Y | REFUSE |
| 4.19.15 | `operating_jurisdiction_code` | Program jurisdiction | code | Administrator | program.created | ACTIVE | Y | REFUSE |
| 4.19.16 | `jurisdiction_rule_version` | rule version in force | version_string | Administrator | program.created | ACTIVE | Y | REFUSE |
| 4.19.17 | `institutional_tenant_id` | Exists and stays empty with capture_state not_applicable until tenancy is approved | identifier | System | none while disabled | SOCKET | Y | NONE |
| 4.19.18 | `institutional_export_purpose_id` | Future approved derived data purpose | identifier | Configuration | none while disabled | SOCKET | Y | NONE |


## 5. Prohibited Fields and Functions

5.1. Nothing in Table 5.1 may exist as a column, payload key, enum value, route, template string, seed, export field or derived value. The continuous integration check fails the build on any hit. Historical rows that already hold a listed item are frozen read only, excluded from every current read path, and listed in the reconciliation report. They are never rewritten.


**Table 5.1. Prohibited items**

| No. | Item | Reason | Use instead |
|---|---|---|---|
| 5.1.1 | score, rating, rank, percentile, BARS label, behavioral_score, readiness_score, ordinal_anchor | Scoring is retired; nothing reintroduces scores, ratings or scales | Determinations, state_code and Recorded Conduct Entries |
| 5.1.2 | level_1 to level_4, observation_level, L1 to L4 | Retired vocabulary | stage_code S1 to S4 |
| 5.1.3 | tier, band, Silver, Gold, Platinum, match or matching value, BehaviourMatch | Tier logic and matching are retired | talentvisa_active (two states) and employer_visibility_state |
| 5.1.4 | skill_passport | Retired outright; historical rows read only | Behavioral Evidence Report |
| 5.1.5 | endorsement, endorse, recommend as a mentor action | Retired | Confirmation (S1) and progression_decision |
| 5.1.6 | escalate as a progression state | Progression has three states only | Incident and welfare routes |
| 5.1.7 | validation_status or any identifier containing validate | Forbidden identifier | None |
| 5.1.8 | fingerprint in any identifier | Retired term | Longitudinal Behavioral Pattern Methodology (dormant consumer) |
| 5.1.9 | dimensions_flagged, dimension_scores | Evaluative flags outside determinations | Determinations |
| 5.1.10 | ai_score_override, ai_assist_notes_accepted, ai_assist_notes_ignored, any AI suggestion to a mentor | No AI suggestion or auto selection exists | None |
| 5.1.11 | free text mentor conclusion, evidence_notes as free text, decision rationale as free text | Free text never reaches the record | Controlled codes |
| 5.1.12 | has_rehearsed or any rehearsal flag on the evidence side; any join key between rehearsal and evidence stores | Firewall | Aggregate telemetry sink only |
| 5.1.13 | accommodation reason, diagnosis or medical detail | Never stored | accommodation_class only |
| 5.1.14 | race, ethnicity, gender identity, sexual orientation, disability, religion, immigration status, date of birth in operational stores | Default exclusion list | Research socket only, separately approved |
| 5.1.15 | mood, personality, trait, character, potential or risk label | Proxy inference | None |
| 5.1.16 | predicted performance, retention, probation or success fields | No prediction | None |
| 5.1.17 | hire, reject, still employed, probation outcome, rehire intention, performance rating linked to a participant | Outcome claims prohibited | Unlinked hire_recorded_row and the disabled follow up socket |
| 5.1.18 | biometric fields (face, voice, keystroke, gaze) | Excluded | None |
| 5.1.19 | social media or public record scraping fields | Excluded | None |
| 5.1.20 | shortlist or exclusion flag; governance.tier_change; mentor.override_requested for a fourth attempt | Retired constructs | None |
| 5.1.21 | any shared table, template, name or data path between the Behavioral Evidence Report and an employer commissioned competence record | Separation test | Separate enterprise product, not in this platform build |
| 5.1.22 | any event, field or link between Civic Access Lab and this platform | Excluded | None |
| 5.1.23 | card numbers, bank account numbers, government identification numbers | Never stored | payment_provider_ref token |

5.2. Exception, so the check does not misfire: the retirement register and this Table name the terms they retire, and controlled source content may describe workplace situations that contain such words. The check scans system identifiers and system outputs, not authored situation text.


## 6. Database Requirements

6.1. Append only. Observation, determination, confirmation, progression decision, consent, challenge, report version, release and event records accept insert only. Enforce at the database role level as well as in the application. Corrections are superseding records with a reference to the original.

6.2. Server time. Every timestamp is UTC, server generated, millisecond precision. Client clocks are never trusted.

6.3. Field registry. Create a field_registry table loaded from the JSON companion, one row per qualified_name: qualified_name, domain, field, canonical_type, enum_values, type_values, source, trigger, owner, store, status, irreversible, if_absent, capture_state_field, dictionary_version. Run tools/check_dictionary.py first; it also compares every field and event definition with reference/field_definition_pins_v1.3.json, and any changed, added or missing definition is refused. A failing check blocks the load. No field enters production without a registry row. A new field is a registry change with a version event.

6.4. Registered asset types: source version, question set, answer key, statement library, recurrence keys, controlled template register, consent copy, privacy notice, permitted use statement, sufficiency rules, attempt and cooldown rules, retention schedule, BER Standard, Stage 1 engine and script, dimension definition, event schema, field dictionary, occupational classification, comparison families and demand conditions, follow up question set, agreement threshold, security timing values.

6.5. Longitudinal queries. The schema must answer, without archive retrieval: all observations for one participant on one dimension ordered by observed_at; all attempts with their event class and decision; every version under which each was produced. Index on participant_id, dimension_id, stage_code and observed_at.

6.6. Record property. record_property is set by the server at creation, immutable, and written onto every child record at write time. It is never derived at read time.

6.7. Identifiers are UUID version 4 unless a field states otherwise. Human facing codes (statement ids with the ST prefix, report verification codes) are separate from keys.

6.8. Migrations are additive. Never drop a column that holds data. A deprecated field is marked deprecated in the registry, keeps reading for history, and receives no new writes.

6.9. Artifacts (responses, submissions, uploaded documents) live in a secured object store referenced by pointer. They are never embedded in an event payload. No media from a live session is persisted.


## 7. Event Logging Requirements

7.1. Every event carries the Domain N envelope. Names follow category.action, lower case, dot separated. Table 7.1 lists one row per event with its category, status, required payload keys and optional payload keys. A required key is always known when the event happens; an optional key is omitted when it has no value (never sent as null), and the record holds its capture state. Some events carry conditional rules: observation.stage_entered requires entry_authority_actor_id at S2 and S4 only; account.role_granted requires participant_pseudonym_ref for the participant role and forbids it for every other role; privacy.request_changed requires one of its two request ids. reference/jsonschema/event_payload_registry_v1.3.json holds the executable schema of every event. An unregistered name or a payload that fails its schema is rejected at ingestion and logged. test/fixtures/events holds a full and a minimal valid example of every event.

7.2. Where an earlier instruction names one of these events without the category prefix (for example observation_committed or progression_recorded), it is the same event. Register the canonical name and the earlier name as an alias row that resolves to it; emit one event, never two.

7.3. Payload rules: governed schema per event; no names, addresses, phone numbers or free text; bounded numbers; payload timestamps never later than occurred_at; every versioned asset referenced by version; maximum 4 KB. References must exist. The ingesting service confirms that every identifier in a payload refers to an existing record of the right type, and that every hash equals the hash of the stored record it names. A reference that is well formed but matches nothing is refused with a named reason. Format checks by the tools never replace this check.

7.4. Integrity: integrity_hash over event_id, event_name, occurred_at, actor_id and payload; previous_hash chains each stream and is required on every event after the first of its stream; a scheduled job re verifies the past 24 hours and raises governance.control_operated with a failure result and a critical quality event on any mismatch. Duplicates: an event whose idempotency key was already accepted is a replay and returns the first event; the same key with a different payload digest is quarantined; events with different keys are distinct, even within one second. Only where a producer supplies no key may identical event name, actor, resource and payload digest within one second be held as suspected_duplicate, and that hold is reviewed, never silently dropped.

7.5. observation.committed carries references and hashes only: observation_id, dimension_id, stage_code, stage_instance_id, served_instance_id, source_version_id, source_version_hash, rendered_instance_hash, record_snapshot_hash, attempt_no and committed_at. Every consumer, including the dormant longitudinal module, reads the canonical record by observation_id and checks record_snapshot_hash. Every payload is at most 4096 bytes; tools/check_records.py event enforces the limit, and the worst case size of every registered payload is printed in the JSON. Where a pathway does not yet emit an event in Table 7.1, add the emission. If adding it would change pathway behavior, record the gap in the conflict register and leave the pathway unchanged.


**Table 7.1. Canonical event catalog**

| No. | Event name | Category | Status | Required payload keys | Optional payload keys |
|---|---|---|---|---|---|
| 7.1.1 | `account.created` | PARTICIPANT | ACTIVE | account_id, account_created_at, identity_assurance_method, age_eligibility_attestation, record_property | account_creation_route |
| 7.1.2 | `account.email_verified` | PARTICIPANT | ACTIVE | account_id, email_verified_at | none |
| 7.1.3 | `account.identity_link_changed` | PARTICIPANT | ACTIVE | identity_link_status | none |
| 7.1.4 | `account.lifecycle_changed` | PARTICIPANT | ACTIVE | participant_lifecycle_state | none |
| 7.1.5 | `account.role_granted` | PARTICIPANT | ACTIVE | role_assignment_id, role_code, role_grant_basis, role_granted_by, role_granted_at, role_effective_from, role_rules_version | role_effective_until, participant_pseudonym_ref |
| 7.1.6 | `account.role_revoked` | PARTICIPANT | ACTIVE | role_revoked_by | role_revoked_at |
| 7.1.7 | `account.state_changed` | PARTICIPANT | ACTIVE | account_state | none |
| 7.1.8 | `account.verification_sent` | PARTICIPANT | ACTIVE | account_id, email_verification_sent_at | none |
| 7.1.9 | `calibration.pair_recorded` | OBSERVATION | ACTIVE | stimulus_unit_id | paired_determination_set_id, agreement_threshold_version |
| 7.1.10 | `calibration.reference_loaded` | OBSERVATION | ACTIVE | reference_set_version | none |
| 7.1.11 | `calibration.sample_drawn` | OBSERVATION | ACTIVE | moderation_sample_flag | sampling_plan_version |
| 7.1.12 | `challenge.assigned` | REPORT | ACTIVE | reconsiderer_id, second_check_actor_id | none |
| 7.1.13 | `challenge.evidence_disclosed` | REPORT | ACTIVE | evidence_disclosed_at | none |
| 7.1.14 | `challenge.opened` | REPORT | ACTIVE | challenge_case_id, opened_by, opened_at, challenge_target_ref, challenge_ground, response_time_committed_version, issuance_hold | none |
| 7.1.15 | `challenge.resolved` | REPORT | ACTIVE | challenge_outcome, outcome_reason_code, resolved_at | none |
| 7.1.16 | `commerce.order_completed` | COMMERCIAL | ACTIVE | order_id, account_id, product_code, package_code, package_entitlements, purchased_at, access_starts_at, access_ends_at, price_amount, currency, tax_jurisdiction, founding_member_flag, payment_provider_ref | none |
| 7.1.17 | `commerce.refund_issued` | COMMERCIAL | ACTIVE | refund_id | none |
| 7.1.18 | `complaint.changed` | REPORT | ACTIVE | complaint_id | complaint_acknowledged_at |
| 7.1.19 | `consent.contact_changed` | CONSENT | ACTIVE | contact_consent_status | contact_consent_at |
| 7.1.20 | `consent.declined` | CONSENT | ACTIVE | consent_id | none |
| 7.1.21 | `consent.granted` | CONSENT | ACTIVE | consent_id | none |
| 7.1.22 | `consent.lsa_changed` | CONSENT | DORMANT | lsa_consent_state | lsa_consent_text_version, lsa_consent_timestamp, lsa_withdrawal_timestamp |
| 7.1.23 | `consent.withdrawn` | CONSENT | ACTIVE | consent_id, consequence_displayed | none |
| 7.1.24 | `correction.changed` | REPORT | ACTIVE | correction_request_id | none |
| 7.1.25 | `employer.application_changed` | EMPLOYER | ACTIVE | employer_application_id, application_status | none |
| 7.1.26 | `employer.application_decided` | EMPLOYER | ACTIVE | approval_decision, approver_id, decided_at | none |
| 7.1.27 | `employer.application_submitted` | EMPLOYER | ACTIVE | business_registry_id | free_provider_refused, domain_age_flag |
| 7.1.28 | `employer.attestation_recorded` | EMPLOYER | ACTIVE | employer_attestation_id | none |
| 7.1.29 | `employer.contact_requested` | EMPLOYER | ACTIVE | contact_request_id | none |
| 7.1.30 | `employer.design_partner_changed` | EMPLOYER | ACTIVE | design_partner_flag | none |
| 7.1.31 | `employer.hire_recorded` | EMPLOYER | ACTIVE | hire_recorded_id | none |
| 7.1.32 | `employer.note_changed` | EMPLOYER | ACTIVE | organization_id, workspace_note_id | none |
| 7.1.33 | `employer.pool_queried` | EMPLOYER | ACTIVE | pool_query_id | none |
| 7.1.34 | `employer.report_accessed` | EMPLOYER | ACTIVE | report_access_id | none |
| 7.1.35 | `employer.terms_accepted` | EMPLOYER | ACTIVE | record_use_terms_version, terms_accepted_at | none |
| 7.1.36 | `employer.verification_changed` | EMPLOYER | ACTIVE | organization_id, verification_status | none |
| 7.1.37 | `governance.content_read` | GOVERNANCE | ACTIVE | content_read_id | none |
| 7.1.38 | `governance.control_operated` | GOVERNANCE | ACTIVE | control_run_id | none |
| 7.1.39 | `governance.incident_changed` | GOVERNANCE | ACTIVE | incident_id | severity, affected_record_count, notified_at |
| 7.1.40 | `governance.legal_hold_changed` | GOVERNANCE | ACTIVE | legal_hold_ref | none |
| 7.1.41 | `governance.privileged_access` | GOVERNANCE | ACTIVE | privileged_access_id | none |
| 7.1.42 | `governance.recusal_recorded` | GOVERNANCE | ACTIVE | recusal_id | none |
| 7.1.43 | `governance.suppression_applied` | GOVERNANCE | ACTIVE | suppression_id, suppression_reason | none |
| 7.1.44 | `growthlog.entry_changed` | PARTICIPANT | ACTIVE | created_at, updated_at, schema_version | none |
| 7.1.45 | `growthlog.entry_created` | PARTICIPANT | ACTIVE | entry_id, created_by, entry_kind | none |
| 7.1.46 | `identity.assurance_completed` | PARTICIPANT | SOCKET | identity_assurance_provider_ref | identity_assurance_evidence_ref |
| 7.1.47 | `lsa.comparison_built` | OBSERVATION | DORMANT | resolution_trace_ref | transition_rule_version, lsa_sufficiency_rule_version, finding_code |
| 7.1.48 | `lsa.report_issued` | OBSERVATION | DORMANT | lsa_report_id | lsa_verification_code |
| 7.1.49 | `lsa.snapshot_built` | OBSERVATION | DORMANT | lsa_snapshot_id | snapshot_at, longitudinal_case_id, comparison_scope_id |
| 7.1.50 | `mentor.agreement_signed` | MENTOR | ACTIVE | mentor_agreement_version, mentor_agreement_signed_at | none |
| 7.1.51 | `mentor.appeal_changed` | MENTOR | ACTIVE | mentor_appeal_id | opened_at, decided_at |
| 7.1.52 | `mentor.assigned` | MENTOR | ACTIVE | mentor_assignment_id, assignment_method, prior_allocation_count | none |
| 7.1.53 | `mentor.authorization_changed` | MENTOR | ACTIVE | authorization_id, authorized_dimension_id, authorization_status, effective_from, reviewer_authorization, issuer_authorization | effective_to |
| 7.1.54 | `mentor.calibration_recorded` | MENTOR | ACTIVE | calibration_record_id | none |
| 7.1.55 | `mentor.conflict_declared` | MENTOR | ACTIVE | conflict_declaration_id, declared_at | none |
| 7.1.56 | `mentor.engagement_recorded` | MENTOR | ACTIVE | observations_per_month_commitment | engagement_started_at |
| 7.1.57 | `mentor.function_recorded` | MENTOR | ACTIVE | evidence_cycle_id, cycle_function | none |
| 7.1.58 | `mentor.invitation_redeemed` | MENTOR | ACTIVE | mentor_invitation_id, invitation_redeemed_at | none |
| 7.1.59 | `mentor.invited` | MENTOR | ACTIVE | mentor_invitation_id, invited_by, invitation_sent_at, invitation_expires_at | sourcing_channel, sourcing_employer_ref |
| 7.1.60 | `mentor.qualification_recorded` | MENTOR | ACTIVE | observer_qualification_record_ref | qualification_reviewed_at |
| 7.1.61 | `mentor.supervision_recorded` | MENTOR | ACTIVE | supervised_sessions_completed | supervised_status_started_at, supervision_finding_code |
| 7.1.62 | `mentor.suspension_changed` | MENTOR | ACTIVE | independent_approver_id | suspension_started_at, suspension_extension_count |
| 7.1.63 | `observation.attempt_closed` | OBSERVATION | ACTIVE | attempt_counted, attempt_event_class | cooldown_class, cooldown_ends_at |
| 7.1.64 | `observation.beat_marked` | OBSERVATION | ACTIVE | stage_instance_id, beat_code, beat_started_at | none |
| 7.1.65 | `observation.clause_withdrawn` | OBSERVATION | ACTIVE | observation_id, clause_instance_id | challenge_case_id |
| 7.1.66 | `observation.committed` | OBSERVATION | ACTIVE | observation_id, dimension_id, stage_code, stage_instance_id, served_instance_id, source_version_id, source_version_hash, rendered_instance_hash, record_snapshot_hash, attempt_no, committed_at | none |
| 7.1.67 | `observation.corrected` | OBSERVATION | ACTIVE | supersedes, superseded_by | none |
| 7.1.68 | `observation.currency_expired` | OBSERVATION | ACTIVE | observation_id, evidence_currency_expires_at | none |
| 7.1.69 | `observation.determination_recorded` | OBSERVATION | ACTIVE | determination_id, question_id, answer_option_id, determined_by, determined_at, question_serving_state, branch_trigger_ref | capture_edit_history_ref |
| 7.1.70 | `observation.determinations_locked` | OBSERVATION | ACTIVE | s2_determinations_locked_at, s1_output_unmasked_at | none |
| 7.1.71 | `observation.path_completed` | OBSERVATION | ACTIVE | observation_path_completed_at | none |
| 7.1.72 | `observation.path_opened` | OBSERVATION | ACTIVE | observation_path_gateway_id, gateway_opened_at, coaching_terminated_at | s1_not_required_ruleset_id |
| 7.1.73 | `observation.progression_corrected` | OBSERVATION | ACTIVE | corrected_decision_ref | original_decision_date, correction_effective_date |
| 7.1.74 | `observation.progression_recorded` | OBSERVATION | ACTIVE | progression_decision_id, decision, decided_by, decided_at | decision_rationale_code |
| 7.1.75 | `observation.response_submitted` | OBSERVATION | ACTIVE | served_instance_id, response_sequence_number, response_submitted_at | assistance_declaration, response_artifact_ref, submission_origin |
| 7.1.76 | `observation.s1_confirmed` | OBSERVATION | ACTIVE | s1_human_confirmation_actor_id, s1_human_confirmation_at, confirmation_role, authorization_snapshot_ref, s1_exposure_flag | none |
| 7.1.77 | `observation.s1_outcome_delivered` | OBSERVATION | ACTIVE | s1_outcome_delivered_to_mentor_at | none |
| 7.1.78 | `observation.session_abandoned` | OBSERVATION | ACTIVE | abandonment_state | none |
| 7.1.79 | `observation.session_ended` | OBSERVATION | ACTIVE | session_id, stage_instance_id, session_ended_at, session_serving_state, session_admin_state | none |
| 7.1.80 | `observation.session_started` | OBSERVATION | ACTIVE | session_id, stage_instance_id, session_started_at | none |
| 7.1.81 | `observation.source_served` | OBSERVATION | ACTIVE | served_instance_id, served_at, rendered_instance_hash, stage1_engine_version, stage1_script_version, capture_catalog_version, resolution_rule_version, delivery_script_version, served_language | none |
| 7.1.82 | `observation.stage_entered` | OBSERVATION | ACTIVE | stage_entry_event_id, stage_instance_id, stage_code, session_id, session_identity_method, assistance_rules_version, observation_mode, attempt_no, attempt_rules_version, observation_notification_timestamp, stage_entry_hold_expires_at | entry_authority_actor_id, attempt_reason, prior_progression_decision_ref, cooldown_completed_at, guidance_between_stages_received, guide_account_id, accommodation_applied, accommodation_class, prior_exposure_known_state |
| 7.1.83 | `observation.welfare_stop_recorded` | OBSERVATION | ACTIVE | welfare_stop_ref | none |
| 7.1.84 | `participant.document_uploaded` | PARTICIPANT | ACTIVE | profile_document_ref | none |
| 7.1.85 | `participant.enrolled` | PARTICIPANT | ACTIVE | enrollment_event_id | enrollment_scope, enrolled_at |
| 7.1.86 | `participant.notice_acknowledged` | PARTICIPANT | ACTIVE | privacy_notice_version, privacy_notice_hash | none |
| 7.1.87 | `participant.profile_updated` | PARTICIPANT | ACTIVE | occupational_classification_version | country_of_residence, subdivision_of_residence, privacy_jurisdiction_code, preferred_language, timezone, profile_field_source, notification_channel_preference, target_industry_code, role_seniority_context_code, recruitment_channel_code |
| 7.1.88 | `permission.group_participation_recorded` | CONSENT | SOCKET | group_participation_record_id | none |
| 7.1.89 | `pilot.cohort_assigned` | PROGRAM | ACTIVE | pilot_cohort_id | none |
| 7.1.90 | `privacy.request_changed` | GOVERNANCE | ACTIVE | one of the conditional keys | data_access_request_id, data_correction_request_id |
| 7.1.91 | `program.agreement_changed` | PROGRAM | ACTIVE | data_use_agreement_ref | partner_relationship_effective_at, partner_relationship_ended_at |
| 7.1.92 | `program.cohort_created` | PROGRAM | ACTIVE | cohort_id, cohort_type, cohort_definition_version | none |
| 7.1.93 | `program.created` | PROGRAM | ACTIVE | organization_program_id, program_version, operating_jurisdiction_code, jurisdiction_rule_version | none |
| 7.1.94 | `program.membership_changed` | PROGRAM | ACTIVE | program_membership_id | program_enrolled_at, program_exit_at, membership_basis_ref |
| 7.1.95 | `program.organization_registered` | PROGRAM | ACTIVE | organization_type | organization_industry_code |
| 7.1.96 | `registry.status_changed` | REGISTRY | ACTIVE | source_status, serving_eligible | source_effective_until |
| 7.1.97 | `registry.version_approved` | REGISTRY | ACTIVE | approval_record_id, approved_at, source_effective_from, version_hash | none |
| 7.1.98 | `registry.version_registered` | REGISTRY | ACTIVE | source_id, source_version_id, source_version_hash, scenario_class, compatibility_class, situation_class, secondary_situation_class, interaction_pattern_family_id, administration_form_id, name_clearance_status, source_bank_id, source_created_at, source_created_by, source_material_manifest_ref, asset_id, current_version, previous_version, change_request_id, changed_by, changed_at, dimension_schema_version | min_seconds, max_seconds, content_sensitivity, atlas_moment_id, comparison_family_id, comparison_demand_id, observation_opportunity_id, demand_conditions_version, form_relationship_id, longitudinal_use_status, atlas_terrain_id |
| 7.1.99 | `rehearsal.artifact_saved` | REHEARSAL | ACTIVE | participant_artifact_ref | participant_artifact_version |
| 7.1.100 | `rehearsal.choice_made` | REHEARSAL | ACTIVE | rehearsal_choice_record_id | rehearsal_decision_path_ref, response_modality, voice_transcript_ref |
| 7.1.101 | `rehearsal.content_displayed` | REHEARSAL | ACTIVE | rehearsal_session_id, module_id, module_version | none |
| 7.1.102 | `rehearsal.feedback_displayed` | REHEARSAL | ACTIVE | feedback_source_type | feedback_viewed_at, feedback_acknowledged_at |
| 7.1.103 | `rehearsal.reflection_saved` | REHEARSAL | ACTIVE | participant_reflection_ref | reflection_prompt_id, reflection_prompt_version, final_personal_sentence_ref |
| 7.1.104 | `rehearsal.retention_check_changed` | REHEARSAL | ACTIVE | retention_check_instance_id | retention_check_status |
| 7.1.105 | `rehearsal.session_completed` | REHEARSAL | ACTIVE | rehearsal_started_at | rehearsal_completed_at, rehearsal_completion_state, module_completion_state, module_completion_at |
| 7.1.106 | `rehearsal.session_started` | REHEARSAL | ACTIVE | rehearsal_session_id, module_id, module_version, workplace_moment_id, rehearsal_attempt_id, rehearsal_attempt_no | module_dimension_id, module_segment_id, private_scenario_id, private_scenario_version |
| 7.1.107 | `release.changed` | REPORT | ACTIVE | release_mode, employer_visibility_state, availability_changed_at | talentvisa_active |
| 7.1.108 | `release.recipient_created` | REPORT | ACTIVE | recipient_release_id, recipient_address_hash, token_state | none |
| 7.1.109 | `report.assembled` | REPORT | ACTIVE | dimension_evidence_state, report_type | cross_cutting_condition_flags |
| 7.1.110 | `report.issued` | REPORT | ACTIVE | ber_report_id, ber_version, issued_by, issued_at, ber_standard_version, sufficiency_rules_version, permitted_use_version, observer_multiplicity_statement_code, verification_code, report_content_digest | none |
| 7.1.111 | `report.participant_review_changed` | REPORT | ACTIVE | report_preview_digest, preview_state | participant_review_opened_at, participant_review_completed_at |
| 7.1.112 | `report.rendered` | REPORT | ACTIVE | specimen_render_flag | none |
| 7.1.113 | `report.review_completed` | REPORT | ACTIVE | reviewer_independence_state, evidence_review_id, reviewer_id, review_completed_at, version_set_hash | none |
| 7.1.114 | `report.status_changed` | REPORT | ACTIVE | ber_status | none |
| 7.1.115 | `report.verification_checked` | REPORT | ACTIVE | verification_check_id | none |
| 7.1.116 | `retention.run_completed` | GOVERNANCE | SOCKET | destruction_run_id | anonymization_run_id |
| 7.1.117 | `system.configuration_changed` | SYSTEM | ACTIVE | session_archive_tab_state, configuration_version, set_by, set_at, verification_link_ttl, verification_resend_cooldown, mentor_invitation_ttl, recipient_release_token_ttl, recipient_passcode_ttl, stage_entry_hold_ttl | liveworks_activation_state, retention_period_value, counsel_ratified_at |
| 7.1.118 | `system.deployment_verified` | SYSTEM | ACTIVE | hosting_region, backup_region | none |
| 7.1.119 | `system.error_detected` | SYSTEM | ACTIVE | error_journal_id, error_journal_written_at | severity, reconciled_event_id |
| 7.1.120 | `system.manifest_verified` | SYSTEM | ACTIVE | manifest_verified_at | none |
| 7.1.121 | `system.schema_updated` | SYSTEM | ACTIVE | asset_id, current_version, compatibility_class | previous_version |
| 7.1.122 | `telemetry.period_closed` | REHEARSAL | SOCKET | cohort_period | sessions_started, sessions_completed, feedback_generated_count, feedback_acknowledged_count, retake_within_window_count |


## 8. Privacy, Consent, Security and Retention Controls


**Table 8.1. Controls**

| No. | Control | Requirement |
|---|---|---|
| 8.1.1 | Hosting | All data, servers and backups in Canada. Hosting outside Canada is refused at deployment verification |
| 8.1.2 | Encryption | In transit (TLS 1.2 or later) and at rest for every store; keys in a managed key service; no secret in the repository |
| 8.1.3 | Operating standard | Controls are operated to the SOC 2 Type II criteria as the operating standard, with ISO/IEC 27001 as the later certification path. No surface claims certification |
| 8.1.4 | Least privilege | Access by role and authorization, enforced at the endpoint and the data layer. Approval of an employer is not access to any record |
| 8.1.5 | Read logging | Every read of observation or message content by a privileged role writes content_read_event |
| 8.1.6 | Consent enforcement | Every capture function checks a matching consent record before writing and stamps consent_state_ref. A capture function that can run without one is a defect |
| 8.1.7 | Notice | The participant notice states that authorized administrators can access record and message content. A capability that exists is disclosed |
| 8.1.8 | Minimization | Only fields in Section 4 are captured. Any proposed field passes the purpose, defensibility and governance tests and enters through the field registry |
| 8.1.9 | Retention | Every record carries retention_class. Periods are configuration. Destruction and anonymization runs stay disabled while counsel_ratified_at is null. No record is deleted by this build outside that program |
| 8.1.10 | Participant rights | Access and correction requests are recorded with received, acknowledged and fulfilled timestamps |
| 8.1.11 | Incidents | Security and privacy incidents are recorded with severity, affected record count and notification time |
| 8.1.12 | Test data | Synthetic and demonstration records never mix into real figures and can never convert to real |


## 9. Reconciliation Against the Existing Database

9.1. Run this before any migration. Steps R1 and R2 are read only. Where the database is PostgreSQL, reference/000_inventory_read_only_postgresql.sql produces the R1 structural inventory; on any other engine produce the same lists with its catalog. Record each mapping in mapping/T3A-DEV-DAY1-001_Reconciliation_Mapping_Template_v1.3.csv, which already holds one row per dictionary field.


**Table 9.1. Reconciliation steps**

| No. | Step | Action | Output |
|---|---|---|---|
| 9.1.1 | R1 Inventory | Dump every table, column, type, constraint, enum value, event name, consent value, route and seed; count rows per table; count rows by record_property or test marker | inventory.json |
| 9.1.2 | R2 Map | Assign each dictionary field one class from Table 9.2; assign each existing column not in the dictionary one class as well | mapping.json |
| 9.1.3 | R3 Plan | Write the additive migration for each class action; no destructive statement | migration plan in the delivery |
| 9.1.4 | R4 Apply | Apply migrations in a non production environment first, then run Section 13 | test evidence |
| 9.1.5 | R5 Mark history | Rows that predate a new irreversible field receive capture_state not_captured. Recoverable fields derivable from data already held are backfilled with data_source system_derived and a backfill event | backfill log |
| 9.1.6 | R6 Report | Produce the reconciliation report in markdown and JSON: every field, its class, its action, and counts | reconciliation_report.md and .json |


**Table 9.2. Mapping classes and default actions**

| No. | Class | Meaning | Default action |
|---|---|---|---|
| 9.2.1 | M1 EXACT | Exists with the same name, type and meaning | Keep; register |
| 9.2.2 | M2 RENAME | Exists under another name with the same meaning | Keep the column; add the dictionary name as the registered name; record both in the mapping table |
| 9.2.3 | M3 TYPE | Exists with a different type or enum | Add a new column of the dictionary type; dual write; historical values stay in the old column |
| 9.2.4 | M4 SPLIT or MERGE | One existing column holds several dictionary fields or the reverse | Add the dictionary columns; derive where lossless; record the rest as not_captured |
| 9.2.5 | M5 MISSING | Not present | Add; new rows enforce; old rows per step R5 |
| 9.2.6 | M6 PROHIBITED PRESENT | A Section 5 item exists | Stop new writes; freeze read only; remove from every read path, display and export; keep the data; record |
| 9.2.7 | M7 EXTRA | Exists and is not in the dictionary | Register with status LEGACY: existing writes continue unchanged, no new reader or consumer is added, and it is listed for later disposition |

9.3. Legacy consent. The D1 build may hold consent values such as OBSERVATION, AI_ADMINISTRATION, RECORDING, GROUP_SESSION, WORK_SAMPLE_SUBMISSION and DISCLOSURE. A legacy consent is mapped to a Domain B consent_type only where the stored consent text it was granted under (consent_copy_version and hash) covers the purpose of the target type; record the text version relied on with each mapping. Where the text is absent or does not cover the purpose, no mapping is made: the record stays as a legacy consent, it authorizes nothing new, and new capture for that purpose refuses until the participant grants the Domain B consent. GROUP_SESSION maps to the separate group participation record only on the same test. RECORDING maps to nothing. Historical rows are never rewritten.

9.4. Known divergence: the D1 build may hold a lifetime attempt cap while the platform rule is three counted attempts per Stage per dimension within a rolling six month window. The data in Domain C supports both. Do not change the D1 rule in this build; record the divergence.


## 10. Legacy Items Reviewed

10.1. Each data point in the earlier documents (BOSD Part 22 Version 2.0 and its later revisions, the Institutional Readiness Evidence Layer manual, the Day 1 Data Capture Register and the platform specification Section 21) was reviewed. Legitimate items were kept or migrated; retired items were closed. Nothing was dropped silently.


**Table 10.1. Legacy disposition**

| No. | Legacy item | Source | Disposition | Current field |
|---|---|---|---|---|
| 10.1.1 | scenario_id, scenario_version | Part 22 Section 22.5.1 | Migrated | source_id, source_version_id, source_version_hash |
| 10.1.2 | session_id | Part 22 Section 22.5.1 | Kept | session_id |
| 10.1.3 | dimension_id | Part 22 Section 22.5.1 | Kept | dimension_id |
| 10.1.4 | observation_context | Part 22 Section 22.5.1 | Migrated | stage_code, observation_mode |
| 10.1.5 | occurred_at | Part 22 Section 22.5.1 | Migrated | observed_at, captured_at, committed_at |
| 10.1.6 | actor_type, actor_id | Part 22 Section 22.5.1 | Kept | Event envelope |
| 10.1.7 | rater_mentor_id | Part 22 Section 22.5.1 | Migrated | observer_id, observer_role |
| 10.1.8 | score | Part 22 Section 22.5.1 | Prohibited | None |
| 10.1.9 | evidence_source | Part 22 Section 22.5.1 | Migrated | data_source, stage_code |
| 10.1.10 | evidence_notes | Part 22 Section 22.5.1 | Prohibited as free text | Determinations, technical_issue_codes |
| 10.1.11 | rubric_version | Part 22 Section 22.5.1 | Migrated | question_set_version, statement_library_version, answer_key_version |
| 10.1.12 | confidence_level | Part 22 Section 22.5.1 | Socket | mentor_confidence_per_determination |
| 10.1.13 | attempt_number | Part 22 Section 22.5.1 | Migrated | attempt_no plus attempt_event_class, attempt_reason |
| 10.1.14 | endorsement_decision, endorsement_rationale | Part 22 Section 22.5.3 | Migrated | decision, decision_rationale_code |
| 10.1.15 | dimensions_flagged, dimension_scores | Part 22 Section 22.5.3 | Prohibited | None |
| 10.1.16 | confidence_per_dimension | Part 22 Section 22.5.3 | Socket | mentor_confidence_per_determination |
| 10.1.17 | key_moment_markers | Part 22 Section 22.5.3 | Migrated (no recording) | beat_code, beat_started_at |
| 10.1.18 | ai_assist_notes_accepted, ai_assist_notes_ignored, ai_score_override | Part 22 Section 22.5.3 | Prohibited | None |
| 10.1.19 | session_technical_issues | Part 22 Section 22.5.3 | Migrated | technical_issue_codes |
| 10.1.20 | data_source, entered_by, entered_at | Part 22 Section 22.5.4 | Kept | data_source; event actor_id; occurred_at |
| 10.1.21 | schema_version, dimension_schema_version | Part 22 Sections 22.5.4 and 22.5.5 | Kept | schema_version, dimension_schema_version |
| 10.1.22 | prompt_version, model version | Part 22 Section 22.5.4 | Migrated | stage1_engine_version, stage1_script_version; model registry socket |
| 10.1.23 | consent_status_at_capture | Part 22 Section 22.5.4 | Migrated | consent_state_ref |
| 10.1.24 | completion_status, time_to_complete, feedback_present, reflection_submitted | Part 22 Section 22.6.2 | Moved to rehearsal domain | Rehearsal store, Growth Log practice_note, telemetry sink |
| 10.1.25 | Unknown codes UNK_NC, UNK_DEC, UNK_NA, UNK_ERR | Part 22 Section 22.6.4 | Migrated | not_captured, declined or no_response, not_applicable, technical_failure |
| 10.1.26 | consent object incl. ip_address_hash, consequence_displayed, method | Part 22 Section 22.6.5 | Kept | Domain B |
| 10.1.27 | City or province, aggregate only | Part 22 Section 22.6.2 | Kept | city_of_residence, subdivision_of_residence |
| 10.1.28 | Event envelope incl. ingested_at, integrity_hash | Part 22 Section 22.7.1 | Kept and extended | Domain N (adds subject_id, correlation_id, previous_hash, record_property) |
| 10.1.29 | candidate.* events | Part 22 Section 22.7.2 | Renamed | participant.* events |
| 10.1.30 | observation.score_generated | Part 22 Section 22.7.2 | Prohibited | None |
| 10.1.31 | mentor.endorsement_submitted | Part 22 Section 22.7.2 | Replaced | observation.s1_confirmed, observation.progression_recorded |
| 10.1.32 | mentor.override_requested | Part 22 Section 22.7.2 | Prohibited | None (fourth attempt refuses) |
| 10.1.33 | candidate.bridgefast_enrolled, candidate.bridgefast_completed | Part 22 Section 22.7.2 | Moved | rehearsal.* events in the rehearsal store |
| 10.1.34 | employer.profile_viewed | Part 22 Section 22.7.2 | Replaced | employer.report_accessed |
| 10.1.35 | employer.shortlist_added, governance.tier_change | Part 22 Section 22.7.2 | Prohibited | None |
| 10.1.36 | employer.followup_submitted, 30/60/90 schedule, verification levels | Part 22 Section 22.9 | Socket | Domain Q follow up structure |
| 10.1.37 | Four registries (content, scoring, schema, AI) | Part 22 Section 22.8.4 | Migrated | One registry with asset_type; scoring registry becomes statement library and rule sets |
| 10.1.38 | Behavioral Fingerprint, Mentor Decision Patterns | Part 22 Section 22.4 | Dormant | longitudinal_pattern_consumer, mentor_decision_pattern_consumer |
| 10.1.39 | Licensing outputs, phases | Part 22 Sections 22.12 and 22.17 | Socket | Domain Q |
| 10.1.40 | Rehearsal telemetry sink, correlation_id, min and max seconds | Part 22 Revision 3 Sections 22.18 and 22.19 | Kept | Domains K, N, D |
| 10.1.41 | Employment linkage, employer respondent | Register Revision 2 Section 14 | Socket | Domain I |
| 10.1.42 | Jurisdiction, language, timezone | Register Revision 2 | Kept | Domain A |

10.2. A parallel consolidation (T3A-DEV-SPEC-DATA-001 Version 1.0) was reviewed field by field against this dictionary. Table 10.2 records what was taken from it and what was not, with the reason.


**Table 10.2. Items considered from the parallel consolidation**

| No. | Item | Disposition | Where or why |
|---|---|---|---|
| 10.2.1 | Fields absent from Version 1.0 (account state, pseudonymous key, purpose and basis of consent, historical reuse scope, source provenance and standing window, session states, question serving state, statement wording digest, independence states, preview and content digests, legal hold, idempotency and event processing state, rehearsal detail, program and cohort context, aggregate and longitudinal sockets) | Adopted | Added to Domains A to R, 79 rows |
| 10.2.2 | Read only database inventory script | Adopted | reference/000_inventory_read_only_postgresql.sql |
| 10.2.3 | Append only triggers, idempotency registry and the dormant observation sidecar | Adopted as reference patterns | reference/001_reference_patterns_postgresql.sql; the sidecar is one permitted storage pattern for DORMANT fields |
| 10.2.4 | Sidecar and event JSON Schemas | Adopted and aligned to this dictionary | reference/jsonschema |
| 10.2.5 | Mapping template for every field | Adopted and generated from this dictionary | mapping/T3A-DEV-DAY1-001_Reconciliation_Mapping_Template_v1.2.csv |
| 10.2.6 | Test cases on replay, late events, races, clause cardinality, cross organization isolation, dictionary drift, legal hold, Stage 1 determinism, Stage 4 co participants, optional business fields and BER regression | Adopted | DT-43 to DT-58 |
| 10.2.7 | Twenty five open controlled vocabularies left for the founder | Resolved with executable values | Table 2.5 |
| 10.2.8 | Private Growth Log metadata projection table (private_growth_link) | Not adopted | It creates a read path out of the Growth Log, which feeds nothing; rehearsal detail lives in the rehearsal store instead |
| 10.2.9 | Rehearsal artifacts, reflections and feedback stored in the Growth Log | Not adopted | The Growth Log holds only participant created entries; these are rehearsal store fields in Domain K |
| 10.2.10 | Signed release approvals, founder approval of the mapping, H0, H1 and H5 approval steps, release gate script and the activation refusal migration | Not adopted | This package is implement as specified with no approval cycle; route level fail closed defaults replace approval gates |
| 10.2.11 | Live acceptance adapter with external attestation | Not adopted | Section 13 tests run against the non production system and their run log is delivered |
| 10.2.12 | PostgreSQL candidate schema as the mandatory design | Not adopted as mandatory | Schemas remain the developer's to derive after reconciliation (paragraph 0.5) |


## 11. Implementation Sequence


**Table 11.1. Build order**

| No. | Step | Done when |
|---|---|---|
| 11.1.1 | Run reconciliation R1 and R2 | inventory.json and mapping.json exist |
| 11.1.2 | Field registry and JSON load | DT-01 passes |
| 11.1.3 | Event registry, envelope, hash chain, append only roles | DT-22 to DT-25 pass |
| 11.1.4 | Accounts, roles and verification | DT-03, DT-04 pass |
| 11.1.5 | Consent records and permission objects | DT-05 to DT-09 pass |
| 11.1.6 | Observation path, Stage entry and attempts | DT-10 to DT-13 pass |
| 11.1.7 | Sources, served instances, observation and determinations | DT-14 to DT-21 pass |
| 11.1.8 | Mentor and assurance records | DT-36 passes; mentor provisioning refuses without its three records |
| 11.1.9 | Report, release and challenge records | DT-27, DT-28 pass |
| 11.1.10 | Employer records | DT-33 to DT-35 pass |
| 11.1.11 | Growth Log conformance and rehearsal boundary | DT-29 to DT-32 pass |
| 11.1.12 | Dormant and socket structures (lsa, telemetry, licensing, research, follow up, commercial subscription) | Each refuses and logs; DT-08, DT-31 pass |
| 11.1.13 | Controls and configuration | DT-37 to DT-39, DT-41, DT-42 pass |
| 11.1.14 | Forbidden identifier check in continuous integration | DT-02 passes |
| 11.1.15 | Reconciliation R3 to R6 | DT-40 passes |
| 11.1.16 | Version 1.1 additions: event idempotency and processing state, preview and content digests, legal hold, rehearsal detail, programs and cohorts | DT-43 to DT-58 pass |
| 11.1.17 | Tools and harness: strengthened checkers, record validation, signature verification with test keys, acceptance results report | tools/test_tools.py passes; DT-59 to DT-67 pass |


## 12. Failure Behavior


**Table 12.1. Failure rules**

| No. | Situation | Behavior |
|---|---|---|
| 12.1.1 | A REFUSE field is missing | Refuse the action, state the reason on screen, log the refusal |
| 12.1.2 | A STATE field cannot be populated | Commit normally with the capture_state code; never block a commit the pathway would accept |
| 12.1.3 | A configuration value is unset | Refuse the dependent route visibly and log; never default |
| 12.1.4 | A SOCKET route is reached | Refuse and log; return no data |
| 12.1.5 | A prohibited item is found in existing data | Apply class M6; continue |
| 12.1.6 | Event emission fails | Do not commit the parent record. Retry. On final failure write an error journal entry to a durable store independent of the event log (error_journal_id, Domain P), refuse the action visibly, and reconcile the journal into the event log as system.error_detected with the original time once the event store recovers |
| 12.1.7 | Hash verification fails | Raise a critical quality event; keep the platform running; mark affected records manual_review |
| 12.1.8 | A rule in this file conflicts with an earlier instruction | Build to this file for capture; leave pathway behavior unchanged; record in the conflict register |
| 12.1.9 | Ambiguity this file does not settle | Fail the affected route closed, record the default applied, continue all other work |


## 13. Acceptance Tests

13.1. Every test result is PASS, FAIL or UNRUN. A test that needs material held in the repository rather than in this package (BER golden fixtures, Stage pathways, dimension content, the demonstration pathway) uses that material; where it is absent the result is UNRUN with the missing material named. UNRUN is never counted as PASS. Evidence for every PASS or FAIL is its own file of at least 200 bytes, not reused by any other test, naming the test id and the build_id; a human reviewer still judges whether it proves the result. tests/acceptance_manifest.json lists each test with the repository material it needs; tools/acceptance_report.py checks a results file for completeness and evidence and prints the summary.

13.2. Each test is executed against the running non production system, never by reading code alone. A refusal that has never been observed refusing is an assumption, not a control. Deliver automated tests where the runner allows and the run log for each.


**Table 13.1. Acceptance tests**

| No. | Test | Steps | Expected result |
|---|---|---|---|
| 13.1.1 (DT-01) | Dictionary coverage | Run tools/check_dictionary.py, load every atomic row of the JSON into the field registry, then for every ACTIVE and DORMANT qualified_name query the physical schema map | Checker passes; every qualified_name resolves to exactly one column or governed payload key and its capture_state column where required; zero unmapped |
| 13.1.2 (DT-02) | Forbidden identifiers | Run tools/check_forbidden_identifiers.py over the repository with exact exclusions only and --manifest | Zero hits outside the excluded paths; every approved wording carries a t3a-allow marker and appears in the manifest allowances; the scanned file manifest is delivered; any hit fails the build |
| 13.1.3 (DT-03) | Server side role | POST sign up with role_code=mentor in the body | Account created as participant only, or refused; event logged; no mentor role row |
| 13.1.4 (DT-04) | Unverified holding state | Create participant, do not verify, call mentor request, release and Stage entry endpoints | All refuse with a stated reason; observation cannot be recorded |
| 13.1.5 (DT-05) | Consent one type per interaction | Submit one consent interaction carrying two consent_type values | Refused; no consent row written |
| 13.1.6 (DT-06) | Consent not inherited | Grant mentor_observation scoped to D1; attempt D2 Stage entry | Stage entry refuses for want of D2 consent |
| 13.1.7 (DT-07) | Withdrawal deletes nothing | Withdraw scenario_logging after one committed observation | Earlier observation still readable in history; new capture refuses; consent.withdrawn event present |
| 13.1.8 (DT-08) | Socket consent routes | Attempt to capture followup_contact and aggregate_regional | Refused and logged; no row |
| 13.1.9 (DT-09) | lsa consent default | Create participant with no lsa consent text loaded | lsa_consent_state = never_asked; no prompt rendered; empty socket logged |
| 13.1.10 (DT-10) | Gateway before Stage | Attempt Stage entry with no observation_path_gateway | Refused |
| 13.1.11 (DT-11) | Stage entry timing | Allocate mentor, wait, then enter Stage | stage_entry_event created at the entry action, not at allocation |
| 13.1.12 (DT-12) | Attempt monotonic | Run three attempts, reset any counter through every admin route | attempt_no never decreases; fourth counted attempt refuses under the loaded rule |
| 13.1.13 (DT-13) | Welfare stop | Record welfare stop | attempt_counted=false; no cooldown |
| 13.1.14 (DT-14) | Capture never blocks | Commit an observation whose source lacks comparison fields | Commit succeeds; comparison fields capture_state = not_authored; longitudinal_use_status = not_eligible |
| 13.1.15 (DT-15) | Mandatory field refusal | Commit an S2 observation with no observer_id | Refused; the refusal is logged with its reason |
| 13.1.16 (DT-16) | Observer at S1 | Attempt to set observer_id on an S1 record | Refused; confirmer fields used instead |
| 13.1.17 (DT-17) | Dual hash | Commit any observation | Both source_version_hash and rendered_instance_hash present and different objects |
| 13.1.18 (DT-18) | Sequential unmasking | Open S1 output from the S2 mentor session before lock | Refused; after s2_determinations_locked_at the output opens and s1_output_unmasked_at is written |
| 13.1.19 (DT-19) | S1 outcome before S2 | Attempt S2 entry before s1_outcome_delivered_to_mentor_at | Refused |
| 13.1.20 (DT-20) | No free text | Post a free text conclusion or rationale to any mentor endpoint | Refused; only controlled codes accepted |
| 13.1.21 (DT-21) | Accommodation reason | Post any accommodation reason text | Refused; only accommodation_class stored |
| 13.1.22 (DT-22) | Append only observations | Issue UPDATE and DELETE against observation, determination and event tables through the application and a direct database role | Both refused; correction possible only by superseding record |
| 13.1.23 (DT-23) | Event envelope and payload | Emit every ACTIVE catalog event once and validate each with tools/check_records.py event | Each passes: envelope fields valid, required keys present, conditional keys honored, no key outside required and optional, every value in its registered format, payload at most 4096 bytes, no personal or free text keys, occurred_at not later than ingested_at, previous_hash present after the first event of a stream |
| 13.1.24 (DT-24) | Hash chain | Alter one stored event directly | Nightly or on demand verification flags integrity breach and raises a critical quality event |
| 13.1.25 (DT-25) | Unknown event name | Emit an event not in the registry | Rejected at ingestion and logged |
| 13.1.26 (DT-26) | Demonstration inheritance | Create a demonstration run; inspect every child row | record_property = demonstration on every row; conversion attempts fail and log |
| 13.1.27 (DT-27) | Reviewer is not issuer | Issue a report with issued_by = reviewer_id | Refused |
| 13.1.28 (DT-28) | Verification code | Issue a specimen and read verification_code | Random value not derivable from ber_report_id |
| 13.1.29 (DT-29) | Growth Log isolation | As mentor, employer and administrator, call every Growth Log read route | No route returns Growth Log content; oversight read paths do not include rehearsal entries |
| 13.1.30 (DT-30) | Growth Log feeds nothing | Search code for any consumer of the Growth Log store | None besides the participant view |
| 13.1.31 (DT-31) | lsa reads no Growth Log | Inspect the lsa consumer data sources | Subscribes to observation events only; writes only lsa tables |
| 13.1.32 (DT-32) | Rehearsal firewall | Attempt any join from evidence to rehearsal store; search for has_rehearsed | No join path; zero hits |
| 13.1.33 (DT-33) | Hire row unlinked | Record a hire as employer | Row carries no participant or report reference |
| 13.1.34 (DT-34) | Pool filters | Query the pool with any observed or conduct derived criterion | Refused; criteria limited to participant stated fields |
| 13.1.35 (DT-35) | Unverified employer | As pending organization, request pool, report or count | All refused; no metadata returned |
| 13.1.36 (DT-36) | Content read logging | As oversight administrator read an observation and a message | Two content_read_event rows with person, time, subject and basis |
| 13.1.37 (DT-37) | Retention guard | Trigger a destruction run with counsel_ratified_at null | Refused and logged; nothing destroyed |
| 13.1.38 (DT-38) | Canada hosting | Inspect deployment and backup configuration | hosting_region and backup_region = ca; system.deployment_verified recorded |
| 13.1.39 (DT-39) | Unset configuration | Remove one required configuration value; exercise its route | Route refuses visibly, logs, never defaults |
| 13.1.40 (DT-40) | Reconciliation report | Run the Section 9 procedure on the existing database | Report produced in markdown and JSON with every field classed and every action recorded; no historical row rewritten |
| 13.1.41 (DT-41) | Manifest signature | Using test/keys/test_public_key.pem, verify test/fixtures/signed_test_manifest.json with its valid and its tampered signature | Valid signature loads; tampered signature refuses and records system.manifest_verified with a fail result; production manifests verify only against the production public key |
| 13.1.42 (DT-42) | Commercial lever | Create a package granting a Stage or a dimension | Refused; only the three entitlement kinds accepted |
| 13.1.43 (DT-43) | Idempotent replay | Send the same action twice with one idempotency key; send a conflicting payload with the same key; send two different actions with different keys within one second | One accepted event for the replay; the conflict is quarantined; the two different actions are both accepted |
| 13.1.44 (DT-44) | Late event ordering | Deliver observation.source_served after observation.committed | occurred_at and ingested_at both preserved; the record is reconciled or quarantined, never reordered by deletion |
| 13.1.45 (DT-45) | Concurrent correction | Supersede an observation while a report on it is assembling | Issuance refuses on the stale version set; a fresh assembly is required |
| 13.1.46 (DT-46) | Preview and issue race | Withdraw consent after the participant preview and before issue | Issue refuses; preview_state becomes stale |
| 13.1.47 (DT-47) | Historical reuse | Grant lsa consent with future_only, then build a dormant snapshot | Earlier observations are excluded |
| 13.1.48 (DT-48) | Two clause instances | Commit two clause instances for one conduct element in one observation | Both retained as separate rows |
| 13.1.49 (DT-49) | Dormant write failure | Force the lsa sidecar write to fail after a valid commit; separately submit a sidecar row containing a key outside the allowlist | Observation committed once; report path unaffected; failure logged; the out of allowlist row is refused by tools/check_records.py sidecar and quarantined |
| 13.1.50 (DT-50) | BER regression | Run the existing multipage BER golden fixtures before and after the migrations | Identical output |
| 13.1.51 (DT-51) | Stage 1 determinism | Attempt to serve response adaptive or generated content at S1 | Refused; stage1_engine_version and delivery_script_version recorded on every served instance |
| 13.1.52 (DT-52) | Stage 4 co participants | Attempt to create an observation record for a co participant | Refused; only the observed participant has a record |
| 13.1.53 (DT-53) | Optional fields withheld | Complete onboarding with every optional profile field skipped | Flow completes; each field stores declined or never_asked |
| 13.1.54 (DT-54) | Legal hold | Place a hold, then run retention | Held records untouched; run logged |
| 13.1.55 (DT-55) | Cross organization isolation | Create two organizations sharing source ids with different permissions | No record of one is visible to the other; institutional_tenant_id stays empty |
| 13.1.56 (DT-56) | Dictionary drift | Introspect every persisted column and payload key and compare with the field registry | Zero undeclared fields; any extra is listed as M7 in the reconciliation report |
| 13.1.57 (DT-57) | Source title preserved | Revise a source title, then render a historical observation | The historical observation shows the title of its own version |
| 13.1.58 (DT-58) | One source bank | Attempt to register a second source bank for the dormant module | Refused |
| 13.1.59 (DT-59) | Error journal | Make the event store unavailable, then attempt a write that must emit an event | Parent action refused; an error journal entry is written outside the event log; on recovery it is reconciled as system.error_detected with the original time |
| 13.1.60 (DT-60) | Typed capture state | Skip an optional timestamp field | The timestamp column stays null and its capture_state column holds the code; no code is ever written into the typed column |
| 13.1.61 (DT-61) | Legacy columns keep working | Exercise every existing feature that writes a column classed LEGACY | Behavior unchanged; no new reader of the column exists; the column is listed in the reconciliation report |
| 13.1.62 (DT-62) | Legacy consent mapping | Run the consent mapping on a legacy consent whose stored text does not cover the target purpose | No mapping is made; the record stays legacy; new capture for that purpose refuses until a fresh grant |
| 13.1.63 (DT-63) | Growth Log observation view | Commit an observation, then inspect the Growth Log store | No row was written to the Growth Log; the participant view shows the observation regenerated from the canonical record |
| 13.1.64 (DT-64) | Lifecycle fixtures | Submit every fixture in test/fixtures/events (full and minimal) to the running ingestion path | Every fixture is accepted; no event requires a value that only a later event can supply |
| 13.1.65 (DT-65) | Conditional requiredness | Enter S1 without an entry authority actor; enter S2 without one; grant the mentor role without a participant pseudonym; grant the participant role without one | S1 accepted; S2 refused; mentor grant accepted; participant grant refused |
| 13.1.66 (DT-66) | Reference existence | Submit a well formed event whose identifiers and hashes refer to no stored record | Ingestion refuses with a named reason; a format valid reference is never accepted on format alone |
| 13.1.67 (DT-67) | Pinned definitions | Change one field type and one enum value in a copy of the dictionary, then run tools/check_dictionary.py | Both changes refused as DEFINITION_CHANGED; the registry load does not proceed |


## 14. Delivery


**Table 14.1. Single combined delivery**

| No. | Item |
|---|---|
| 14.1.1 | Entity relationship diagram and data dictionary as built, mapped to the logical stores |
| 14.1.2 | inventory.json, the completed mapping template (CSV) or mapping.json, and the reconciliation report (markdown and JSON) |
| 14.1.3 | Migration scripts and the backfill log |
| 14.1.4 | Event registry export and payload schemas |
| 14.1.5 | Acceptance results file for DT-01 to DT-67 (format in tests/acceptance_manifest.json) with evidence, checked by tools/acceptance_report.py |
| 14.1.6 | Forbidden identifier check output and its scanned file manifest |
| 14.1.7 | Conflict register |
| 14.1.8 | Non production URL and test credentials for synthetic personas |

14.2. Deliver everything at once. Do not send partial questions during execution.


## 15. Issue


**Table 15.1. Issue record**

| No. | Item | Value |
|---|---|---|
| 15.1.1 | Prepared and issued by | Dr. Tony Mofoke, Founder and Chief Executive Officer, The 3rd Academy Inc. |
| 15.1.2 | Date | 18 October 2026 |
| 15.1.3 | Instruction status | IMPLEMENT AS SPECIFIED |
| 15.1.4 | AI acknowledgement | Artificial intelligence tools supported research, synthesis, drafting, structuring and language refinement. All decisions are the founder's. |


END OF DOCUMENT
