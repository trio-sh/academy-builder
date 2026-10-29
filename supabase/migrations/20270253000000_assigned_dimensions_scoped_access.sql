-- mentor_assigned_dimensions has the scoped policies it was designed with (assigned_dims_mentor_all: the mentor whose profile id is mentor_id, or an admin;
-- assigned_dims_candidate_read: the candidate whose profile id is candidate_id), and next to them an open policy, mentor_assigned_dimensions_rw USING (true) WITH CHECK (true),
-- under which any signed-in user could read every person's assigned dimensions and write or switch off anyone's (CR-338). The table has held no rows, because the page that writes it
-- sent keys the table refuses (fixed in the same change), so no existing read or write depends on the open policy. It is dropped; the scoped ones remain.
drop policy if exists mentor_assigned_dimensions_rw on public.mentor_assigned_dimensions;
