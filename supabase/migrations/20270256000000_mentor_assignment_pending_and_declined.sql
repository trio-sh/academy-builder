-- CR-344. The mentor request flow has never completed. The Get Started page inserts a mentor_assignments row with status 'pending' and tells the mentor "Review and accept in your dashboard";
-- the mentor desk lists the pending rows (status = 'pending') and answers them with 'active' (accept) or 'declined'. The table's check constraint allowed only active, completed and transferred,
-- so the request row was refused by the database (the page ignored the error and carried on to notify the mentor of a request that did not exist), and a decline would have been refused too.
-- The two statuses the pages already use are added. A pending or declined row gives no desk access: the mentor reads a candidate's profile only through an active assignment (CR-336).
alter table public.mentor_assignments drop constraint if exists mentor_assignments_status_check;
alter table public.mentor_assignments add constraint mentor_assignments_status_check check (status = any (array['pending', 'active', 'completed', 'transferred', 'declined']));
