-- Sets the Stage entry hold time on the deployment (seconds). It was empty; the required-fields switch (enforce_required) refuses a Stage 1 entry that has no hold time, so it must be set
-- before that switch is ever turned on. 1800 seconds (30 minutes) is the value every database test uses. Setting it turns nothing on. Decision CR-306 under the founder's delegation (CR-219).
update public.t3a_deployment_config set stage_entry_hold_ttl = 1800 where singleton and stage_entry_hold_ttl is null;
