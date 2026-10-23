-- Load the participant consent and privacy notice T3A-LEG-001 Part A version 1.2 as a notice version. Idempotent.
-- The hash is the SHA-256 of Section 2 of the document as delivered (the participant-facing text, from the heading "## 2. The notice" up to the heading of Section 3).
-- Status of the wording: approved by the founder as interim wording on 21 October 2026. It has not been reviewed by counsel; releasing it without counsel
-- was decided by Hans Ade, co-founder, on 23 October 2026 (conflict register CR-206). A change of wording is a new version, never an edit of this row.
insert into public.t3a_d1_consent_notice_version (notice_version_id, notice_version_hash, names_google_meet, states_no_recording, approved_at, approved_by_as_signed, recorded_at)
select 'T3A-LEG-001-A-1.2', '8b92d01451934efaabdc8b7f2adc728a3bd49455770a8cff4efe403e19cdd656', true, true, now(),
       'Founder approved interim wording of 21 October 2026 (Dr. Tony Mofoke); released without counsel review by decision of Hans Ade, 23 October 2026 (CR-206)', now()
where not exists (select 1 from public.t3a_d1_consent_notice_version where notice_version_id = 'T3A-LEG-001-A-1.2');
