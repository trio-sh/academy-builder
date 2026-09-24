-- =====================================================================
-- One call for the cockpit: selected lines in, served capture out
--
-- t3a_d1_serve_capture takes branch codes and t3a_d1_branch_answers
-- produces them from selected lines. Making the interface call both in
-- sequence would put the composition step in the client, which is the
-- thing CS-I-01 is written to prevent — and it would mean the cockpit
-- held, however briefly, a branch code it had assembled itself.
--
-- So the composition happens here. The interface sends only what it
-- offered the mentor: question code to selected line order.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_serve_for_selection(
  p_source_sheet jsonb,
  p_selected     jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql STABLE AS $fn$
  SELECT public.t3a_d1_serve_capture(
           p_source_sheet,
           public.t3a_d1_branch_answers(p_selected));
$fn$;

COMMENT ON FUNCTION public.t3a_d1_serve_for_selection(jsonb, jsonb) IS
  'The cockpit''s serving call. Takes the served source sheet and the capture lines selected so far, and returns the questions served, their lines and their bound options. The interface never composes a branch code.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_serve_for_selection(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_serve_capture(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_branch_answers(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_capture_for_question(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_parse_bound_items(text) TO authenticated;
