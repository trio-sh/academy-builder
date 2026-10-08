-- The Mentor Cockpit's Report Face page lists BERs for the mentor to
-- review and print. Pre-change the SELECT policy on t3a_d1_ber_report
-- only recognised the participant and admins, so a mentor who had just
-- assembled a BER for an assigned participant saw an empty "Which
-- report" dropdown.
--
-- This migration extends the read policy to also recognise a mentor on
-- an active t3a_mentor_assignment for the participant. The policy
-- remains closed to anyone else; the §6 face itself still refuses to
-- render for a caller who is not the participant and does not hold
-- administrative standing (that check lives in t3a_d1_report_face,
-- which rides on top of the row read permitted here). What this
-- changes: the mentor can see the BER in a listing without being able
-- to assemble its face through the entitlement-aware RPC.
--
-- Doctrine: evidence shaped by a mentor is visible to that mentor for
-- the duration of the assignment, which is what the Mentor Cockpit is
-- for. On re-assignment the earlier mentor loses the listing row,
-- which matches §6.3's audit-only treatment of mentor identity.

DROP POLICY IF EXISTS t3a_d1_ber_report_read ON public.t3a_d1_ber_report;

CREATE POLICY t3a_d1_ber_report_read
ON public.t3a_d1_ber_report
FOR SELECT
USING (
  participant_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1
      FROM public.t3a_mentor_assignment m
     WHERE m.mentor_id      = auth.uid()
       AND m.participant_id = t3a_d1_ber_report.participant_id
  )
);
