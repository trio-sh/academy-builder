-- Puts the Stage entry hold time back to empty (as it was before 26 October 2026).
update public.t3a_deployment_config set stage_entry_hold_ttl = null where singleton and stage_entry_hold_ttl = 1800;
