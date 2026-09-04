/**
 * T3A-DEV-INS-WR-FREE-001 · Module content payloads.
 *
 * These are REFERENCE SCENARIOS provided so the runtime can be
 * exercised end-to-end. Every scenario below is marked
 * `isReferenceContent: true` and carries `pendingFounderContent: true`
 * on every text field the founder has not personally authored yet.
 *
 * Per Section 3 of the spec: the finished free release may differ
 * from the paid module only through two controlled exceptions — the
 * removal of the end-of-module behavioral mapping (already excluded
 * here), and the founder-issued trim list. NO developer-initiated
 * simplification is permitted at any stage.
 *
 * Swap-in path when the founder-approved content arrives:
 *   * Replace the CONTENT objects below with the founder-issued JSON.
 *   * Or move the JSON into t3a_d1_content_version bodies and point
 *     t3a_wr_free_module.content_version_id at them (Section 3
 *     "Content addressable at screen or segment level, so a named
 *     item can be removed without a rebuild").
 *
 * Nothing in these payloads names a source product, a dimension, a
 * D-number, an M-number, or a duration. Every string is Section 10
 * American-spelled.
 */

export type ConsequenceBeat = {
 /** Immediate | one_week | one_month. Fixed order (Section 3). */
 beat: "immediate" | "one_week" | "one_month";
 body: string;
 pendingFounderContent?: boolean;
};

export type DecisionOption = {
 optionKey: string;
 label: string;
 /** Short two-line description of what this call looks like in practice. */
 sub?: string;
 consequenceChain: ConsequenceBeat[];
 pendingFounderContent?: boolean;
};

export type DecisionScreen = {
 kind: "decision";
 screenKey: string;
 /** Framework marker for the mentor / participant view — not evaluative. */
 frameworkMarker?: "notice" | "center" | "name" | "land";
 title: string;
 body: string;
 prompt: string;
 options: DecisionOption[];
 pendingFounderContent?: boolean;
};

export type NarrativeScreen = {
 kind: "narrative";
 screenKey: string;
 title?: string;
 body: string;
 pendingFounderContent?: boolean;
};

export type ScenarioScreen = DecisionScreen | NarrativeScreen;

export type Scenario = {
 scenarioKey: string;
 title: string;
 opener: string;
 screens: ScenarioScreen[];
 pendingFounderContent?: boolean;
};

export type ModuleContent = {
 moduleCode: "SAYING_THE_HARD_THING" | "WHEN_THE_AI_LOOKS_RIGHT";
 title: string;
 entryScreen: {
 headline: string;
 body: string;
 };
 scenarios: Scenario[];
 isReferenceContent: true;
};

// --------------------------------------------------------------------------
// Module 1 · Saying the Hard Thing (Communication Under Pressure — FULL)
// --------------------------------------------------------------------------

export const SAYING_THE_HARD_THING: ModuleContent = {
 moduleCode: "SAYING_THE_HARD_THING",
 title: "Saying the Hard Thing",
 entryScreen: {
 headline: "Saying the Hard Thing",
 body:
 "You are in a meeting with an important customer. Your manager is presenting. One of the numbers on the screen is out of date, and you are the person who ran the corrected figure and sent it last week.\n\nHe has not noticed.\n\nWhat happens next is your call. Take your time — there is no time limit.",
 },
 isReferenceContent: true,
 scenarios: [
 {
 scenarioKey: "S1_THE_STALE_FIGURE",
 title: "The stale figure",
 opener:
 "The number on the third slide is nearly correct. It is off by enough that the meeting after this one will be built on it. The customer is nodding along.",
 pendingFounderContent: true,
 screens: [
 {
 kind: "narrative",
 screenKey: "notice_intro",
 title: "Notice",
 body:
 "You realise the figure — before you decide anything else. What did you feel first? Nothing else moves until you have named the situation to yourself.",
 pendingFounderContent: true,
 },
 {
 kind: "decision",
 screenKey: "decide_correct",
 frameworkMarker: "name",
 title: "Now what?",
 body:
 "Your manager is mid-sentence. The correct figure is in an email you sent last week. The customer is expecting a decision at the end of this meeting that leans on this figure.",
 prompt: "What do you do?",
 pendingFounderContent: true,
 options: [
 {
 optionKey: "raise_now",
 label: "Raise it now, in the room.",
 sub:
 "Interrupt politely, name the correction, hand your manager the right number.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "Your manager pauses, thanks you, moves on. The customer visibly relaxes — they had noticed the number looked off and were waiting to see who would say so.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "Your manager tells you privately he was grateful for the catch, and less grateful for the moment. The customer's account lead now copies you on every follow-up thread — you are the person who is careful with the numbers.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You are asked to review the pricing pack before every customer meeting. Not a title change, but the room defers to you on the numbers now. Your manager runs sensitive figures past you before the deck goes out.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "note_after",
 label: "Say nothing now. Tell your manager the moment the meeting ends.",
 sub:
 "Let this meeting close on the wrong figure, then correct it in private.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The meeting ends on the wrong figure. In the corridor, your manager thanks you for flagging it and asks how you want to handle the follow-up.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "A member of the customer's team has already built a plan on the wrong figure. It is a full-day rework for their side and an awkward email from your manager, who names you as the source of the correction.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "The customer's account lead asks quietly whether they can be added to your review list before decks go out. Trust is not gone — it is on probation.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "message_manager",
 label: "Slack your manager the correction under the table.",
 sub:
 "Try to hand him the right number without the customer seeing.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "Your manager glances at his phone, hesitates, keeps going. The customer sees the hesitation. The wrong figure stays on the screen for another two minutes.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "Your manager tells you he could not read the message in the moment and does not want to be corrected by phone during a customer meeting again. Understood, but chilly.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You do a lot of careful pre-meeting prep from now on. The two of you rarely disagree in a customer meeting again — partly because you have learnt to catch it upstream.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "stay_quiet",
 label: "Say nothing at all. It probably will not matter.",
 sub:
 "Keep your head down. Bring it up only if it comes back.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The meeting closes on the wrong figure. You leave with the customer's team, who thank you for a productive session.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "A commitment has been made on the wrong number. Your manager finds the corrected figure in the email you sent last week and asks — mildly, but pointedly — why nobody said anything.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "Your manager is more guarded with you. You are not being punished — you are being watched. The room does not defer to you on the numbers. It is not clear how that changes back.",
 pendingFounderContent: true,
 },
 ],
 },
 ],
 },
 ],
 },
 {
 scenarioKey: "S2_THE_DISAGREEMENT",
 title: "A disagreement you cannot avoid",
 opener:
 "In the debrief afterwards, a colleague who was in the meeting says loudly that you should have kept quiet and let your manager handle it. Two of your peers nod. Your manager is out of the room.",
 pendingFounderContent: true,
 screens: [
 {
 kind: "decision",
 screenKey: "hold_or_yield",
 frameworkMarker: "land",
 title: "Hold, or yield?",
 body:
 "It is a small room. The disagreement is about you, and the person raising it is more senior than you. Everything you say next will be repeated.",
 prompt: "How do you handle it?",
 pendingFounderContent: true,
 options: [
 {
 optionKey: "steady_disagree",
 label: "Say the thing steadily. Name why you chose to speak up.",
 sub:
 "Keep it about the figure, not about who was right. Do not raise your voice.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The room quiets. Your peers are watching you differently now. Your colleague does not concede, but they stop.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "One of the peers who nodded pulls you aside and says, quietly, that they agreed with you and wished they had said so at the time.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You are asked to lead the debrief for the next customer meeting. You have a reputation now — for holding a position without making it a fight.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "concede",
 label: "Concede the point. Say you will do it differently next time.",
 sub:
 "Read the room. Do not fight this one.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The room moves on. Everyone is relieved. Nobody quite meets your eye.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "Your manager, having heard the debrief second-hand, is confused about which position you actually held. You get a message asking whether you stand by the correction or not.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You have a slower time getting the room to take your position seriously. It comes back, but not automatically.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "escalate",
 label: "Escalate to your manager afterwards.",
 sub:
 "Do not fight it in the room. Report the pushback to your manager once you are out.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The room notices you have taken it elsewhere. Your colleague hears about the escalation the same day and it is now personal.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "Your manager handles it firmly and fairly. The immediate outcome is resolved. The relationship with your colleague is not.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You are careful about which rooms you speak up in from now on. The escalation route is available to you but it costs.",
 pendingFounderContent: true,
 },
 ],
 },
 ],
 },
 ],
 },
 ],
};

// --------------------------------------------------------------------------
// Module 2 · When the AI Looks Right (AI-Ready Behaviors M1)
// --------------------------------------------------------------------------

export const WHEN_THE_AI_LOOKS_RIGHT: ModuleContent = {
 moduleCode: "WHEN_THE_AI_LOOKS_RIGHT",
 title: "When the AI Looks Right",
 entryScreen: {
 headline: "When the AI Looks Right",
 body:
 "The draft in front of you reads well. It is clear, it is confident, and it is nearly finished.\n\nOne claim in it does not match what you know. Checking properly will cost you time you were not planning to spend, and the work goes out under your name.\n\nWhat happens next is your call. Take your time — there is no time limit.",
 },
 isReferenceContent: true,
 scenarios: [
 {
 scenarioKey: "S1_THE_CONFIDENT_DRAFT",
 title: "The confident draft",
 opener:
 "The document is a client-facing brief. It cites a figure for last quarter that reads high to you, and a source you do not immediately recognise. The rest of the brief reads well.",
 pendingFounderContent: true,
 screens: [
 {
 kind: "narrative",
 screenKey: "notice_intro",
 title: "Notice",
 body:
 "Before anything else — you noticed. That is what you do next with. What was the thing that flagged it? Was it the number, the source, or the tone?",
 pendingFounderContent: true,
 },
 {
 kind: "decision",
 screenKey: "verify_or_send",
 frameworkMarker: "center",
 title: "Verify, send, or ask?",
 body:
 "Your senior has already read the draft and marked it as ready to go. They are in a meeting for the next hour. You are the one whose name is on the delivery.",
 prompt: "What do you do?",
 pendingFounderContent: true,
 options: [
 {
 optionKey: "verify_first",
 label: "Verify the disputed claim first, then send.",
 sub:
 "Delay the send by an hour. Pull the original source. Confirm or correct.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "You find the original. The figure was wrong — pulled from a source the model synthesised confidently. You correct it in one minute and send.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "The client uses the brief to argue against a plan of yours in a meeting. You have the corrected figure and hold your ground. Your senior notices you caught it.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You are asked to do the last pass on any AI-drafted material before it leaves the team. Not a formal role. But everything routes past you now.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "send_and_flag",
 label: "Send it now. Flag the concern to your senior in a follow-up.",
 sub:
 "Do not hold up the client. Raise the doubt privately after the send.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The brief goes out. You send a short follow-up to your senior saying you were not sure about one figure and are checking.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "The figure was wrong. The client has already quoted it in their own reporting. You spend the week helping your senior manage the correction with the client, which is a longer conversation than the one it would have been to hold the brief an hour.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "You have a shared understanding with your senior now that anything AI-drafted holds one extra hour before it goes out. That is your rule now, whether or not anyone else adopts it.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "ask_senior",
 label: "Interrupt your senior in the meeting to ask.",
 sub:
 "Wait for them to come out of the meeting is too slow. Ping them now.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "Your senior takes it well but is visibly distracted. They tell you to use your judgement. You are back where you started, only with less time.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "Whatever you decided in the moment carries. If you sent it and it was wrong, that follows you. If you held it, your senior tells you they trust your call and to bring the next one to them earlier or not at all.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "The interruption is remembered. It counted as showing judgement, or it counted as needing hand-holding — that difference sits on the outcome, not on the interruption itself.",
 pendingFounderContent: true,
 },
 ],
 },
 {
 optionKey: "trust_the_output",
 label: "Trust the AI. Your senior already read it. Send.",
 sub:
 "This is what the tool is for. If it were wrong, someone would have caught it.",
 pendingFounderContent: true,
 consequenceChain: [
 {
 beat: "immediate",
 body:
 "The brief goes out. Nothing happens for two days.",
 pendingFounderContent: true,
 },
 {
 beat: "one_week",
 body:
 "The client's analyst finds the wrong figure and asks — mildly — where it came from. You do not have an answer. Neither does the source the model cited, because on inspection it does not exist.",
 pendingFounderContent: true,
 },
 {
 beat: "one_month",
 body:
 "The team has a new rule about AI-drafted material. It came from this incident. You are not blamed for it, but you are the reason for it, and everyone in the room knows.",
 pendingFounderContent: true,
 },
 ],
 },
 ],
 },
 ],
 },
 ],
};

export const MODULES: Record<ModuleContent["moduleCode"], ModuleContent> = {
 SAYING_THE_HARD_THING,
 WHEN_THE_AI_LOOKS_RIGHT,
};

export const MODULE_ORDER: ModuleContent["moduleCode"][] = [
 "SAYING_THE_HARD_THING",
 "WHEN_THE_AI_LOOKS_RIGHT",
];
