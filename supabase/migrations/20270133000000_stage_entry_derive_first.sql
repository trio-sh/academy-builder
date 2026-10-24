-- The Stage entry derives its participant and dimension from the gateway and the dimensions in play (t3a_stage_entry_event_derive). That trigger was named so that it ran
-- LAST of the before-insert triggers, so every check that reads the participant (the verified email gate, the consent gate, the Stage 2 needs Stage 1 gate) saw an entry that
-- named nobody whenever the route did not pass the participant itself, and let it through or refused it for the wrong reason: with the sequence switch on, the canonical
-- entry route (t3a_create_stage_entry_event) could never enter Stage 2. The derivation now runs first. It changes nothing else, and no gate is added.
drop trigger if exists t3a_stage_entry_event_derive_trg on public.t3a_stage_entry_event;
drop trigger if exists t3a_00_stage_entry_event_derive_trg on public.t3a_stage_entry_event;
create trigger t3a_00_stage_entry_event_derive_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_stage_entry_event_derive();
