/**
 * The Stage 2 live-view transport — T3A-D1-EXEC-001 §3.1.
 *
 * The build report's outstanding item read: "A media provider for the two
 * live views. The measurement layer, the §3.3 verdict and the display are
 * built and proved; what is missing is a stream to attach." This is the
 * stream.
 *
 * WHY NOT A VENDOR. LiveKit, Daily and Twilio all work, and all of them
 * are a procurement decision, an account and a credential before a single
 * line can be proved. A direct peer connection between the two browsers
 * needs none of that, and the signalling it does need rides on Supabase
 * Realtime, which this platform already runs. So the choice here is the
 * one that does not commit The 3rd Academy to anything. Swapping a vendor
 * in later replaces this file and nothing else, because liveView.ts takes
 * a MediaStream and does not care where it came from.
 *
 * NOTHING IS RECORDED, AND THERE IS NOWHERE TO RECORD TO. There is no
 * MediaRecorder here, no upload, no blob and no media store anywhere in
 * the platform. RECORDING consent is `available: false` for every D1
 * Stage, and t3a_d1_consent_type_available refuses to grant it at all. A
 * live view displays and measures; that is the whole of it.
 *
 * CONSENT IS NOT THIS FILE'S TO JUDGE. t3a_d1_s2_live_view_permitted
 * decides, and the signalling table's RLS enforces it whatever this code
 * does: without a standing OBSERVATION consent the relay refuses every
 * row, so no connection can form even if a client opened a camera anyway.
 * The check below is so the interface can say why, not so the rule holds.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export type LiveSessionRole = 'participant' | 'mentor';

export type LiveSessionStatus =
  | 'IDLE'
  | 'CHECKING_CONSENT'
  | 'REFUSED'
  | 'REQUESTING_DEVICES'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'CLOSED';

export interface LiveSessionState {
  status: LiveSessionStatus;
  /** Set when status is REFUSED. The server's code, never invented here. */
  refusalCode?: string | null;
  refusalRemedy?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  error?: string | null;
}

type SignalKind = 'offer' | 'answer' | 'ice' | 'bye';

interface SignalRow {
  signal_id: string;
  stage_instance_id: string;
  from_actor: string;
  to_actor: string;
  kind: SignalKind;
  payload: Record<string, unknown>;
}

/**
 * STUN only, and deliberately so.
 *
 * STUN lets two browsers discover their own public address; it carries no
 * media. It is enough on most networks and costs nothing. It is NOT
 * enough behind a symmetric NAT or a restrictive corporate firewall,
 * where a relay (TURN) is required — and a TURN service is a procurement
 * decision, so it is not made here.
 *
 * The consequence is stated rather than hidden: on such a network the
 * connection will not establish, the live view will report UNAVAILABLE,
 * §3.3 will pause the session and the commit gate will refuse. That is
 * the correct behaviour for a session that cannot be observed — it fails
 * closed, not open — but it will read as "the room does not work" to a
 * mentor, and the remedy is a TURN service rather than a code change.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

/** Media the two live views need. Video and audio, no screen, no capture
 *  of anything else on the machine. */
const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: { echoCancellation: true, noiseSuppression: true },
};

async function sendSignal(
  stageInstanceId: string,
  from: string,
  to: string,
  kind: SignalKind,
  payload: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('t3a_d1_s2_live_view_signal').insert({
    stage_instance_id: stageInstanceId,
    from_actor: from,
    to_actor: to,
    kind,
    payload,
  });
  return { error: error ? error.message : null };
}

/**
 * Opens one side of a Stage 2 live view.
 *
 * THE MENTOR OFFERS AND THE PARTICIPANT ANSWERS, and that order is not
 * arbitrary. The mentor opens the cockpit knowing which participant the
 * Stage instance is about, so they can address an offer. The participant
 * has no way to know which mentor is running the session — a Stage 2
 * entry does not record one, and guessing from the assignment register
 * would be a guess. So the participant waits, and learns who they are
 * talking to from the offer that arrives.
 *
 * `counterpartId` is therefore required for a mentor and ignored for a
 * participant.
 */
export const useLiveSession = ({
  stageInstanceId,
  selfId,
  counterpartId = null,
  role,
  enabled = true,
}: {
  stageInstanceId: string | null;
  selfId: string | null;
  counterpartId?: string | null;
  role: LiveSessionRole;
  enabled?: boolean;
}): LiveSessionState & { close: () => void } => {
  const [state, setState] = useState<LiveSessionState>({
    status: 'IDLE',
    localStream: null,
    remoteStream: null,
    peerConnection: null,
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const closedRef = useRef(false);
  /** Known up front for a mentor; learned from the offer for a
   *  participant. */
  const counterpartRef = useRef<string | null>(counterpartId);
  /** ICE candidates found before the counterpart is known. Dropping them
   *  silently is how a connection half-forms and then sits at
   *  "connecting" with nothing to show. */
  const outboundIceRef = useRef<Record<string, unknown>[]>([]);

  const close = useCallback(() => {
    closedRef.current = true;
    localRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current = null;
    setState({
      status: 'CLOSED',
      localStream: null,
      remoteStream: null,
      peerConnection: null,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !stageInstanceId || !selfId || !counterpartId) return;

    closedRef.current = false;
    seenRef.current = new Set();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // ICE candidates can arrive before the description they belong to.
    // Applying one then is an error, so they wait here.
    const pendingIce: RTCIceCandidateInit[] = [];

    const run = async () => {
      // 1. Ask whether a camera may be opened at all. The answer is the
      //    server's; a refusal is displayed with the server's own code.
      setState((s) => ({ ...s, status: 'CHECKING_CONSENT' }));

      const { data: gate, error: gateError } = await supabase.rpc(
        't3a_d1_s2_live_view_permitted',
        { p_stage_instance_id: stageInstanceId },
      );

      if (gateError) {
        setState((s) => ({ ...s, status: 'REFUSED', error: gateError.message }));
        return;
      }

      const verdict = (gate ?? {}) as Record<string, unknown>;
      if (verdict.permitted !== true) {
        setState((s) => ({
          ...s,
          status: 'REFUSED',
          refusalCode: (verdict.refusal_code as string) ?? 'LIVE_VIEW_REFUSED',
          refusalRemedy: (verdict.remedy as string) ?? null,
        }));
        return;
      }

      // 2. Devices. A refusal here is the person's own browser decision
      //    and is reported as such rather than retried.
      setState((s) => ({ ...s, status: 'REQUESTING_DEVICES' }));

      let local: MediaStream;
      try {
        local = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'REFUSED',
          refusalCode: 'DEVICE_ACCESS_NOT_GRANTED',
          error: err instanceof Error ? err.message : String(err),
        }));
        return;
      }
      if (closedRef.current) {
        local.getTracks().forEach((t) => t.stop());
        return;
      }
      localRef.current = local;

      // 3. The peer connection.
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      local.getTracks().forEach((track) => pc.addTrack(track, local));

      const remote = new MediaStream();

      pc.ontrack = (ev) => {
        ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
        setState((s) => ({ ...s, remoteStream: remote }));
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        const cand = ev.candidate.toJSON() as unknown as Record<string, unknown>;
        const to = counterpartRef.current;
        // A participant finds candidates before the offer names who to
        // send them to. They wait rather than being discarded.
        if (!to) {
          outboundIceRef.current.push(cand);
          return;
        }
        void sendSignal(stageInstanceId, selfId, to, 'ice', cand);
      };

      const flushOutboundIce = async () => {
        const to = counterpartRef.current;
        if (!to) return;
        for (const cand of outboundIceRef.current.splice(0)) {
          await sendSignal(stageInstanceId, selfId, to, 'ice', cand);
        }
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === 'connected') {
          setState((s) => ({ ...s, status: 'CONNECTED' }));
        } else if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
          // Not retried and not smoothed over. liveView.ts is watching the
          // track and §3.3 decides what a lost view means; inventing a
          // reconnect here is how a session continues as if conditions
          // were intact.
          setState((s) => ({ ...s, status: 'CONNECTING' }));
        }
      };

      setState({
        status: 'CONNECTING',
        localStream: local,
        remoteStream: remote,
        peerConnection: pc,
      });

      const applySignal = async (row: SignalRow) => {
        if (seenRef.current.has(row.signal_id)) return;
        seenRef.current.add(row.signal_id);
        if (row.to_actor !== selfId) return;

        try {
          if (row.kind === 'offer') {
            // This is where a participant learns who is running the
            // session. RLS has already established that the sender is a
            // party to this Stage instance, so the id is not taken on
            // the sender's word.
            counterpartRef.current = row.from_actor;
            await pc.setRemoteDescription(
              row.payload as unknown as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(stageInstanceId, selfId, row.from_actor, 'answer',
              answer as unknown as Record<string, unknown>);
            for (const c of pendingIce.splice(0)) await pc.addIceCandidate(c);
            await flushOutboundIce();
          } else if (row.kind === 'answer') {
            counterpartRef.current = row.from_actor;
            await pc.setRemoteDescription(
              row.payload as unknown as RTCSessionDescriptionInit);
            for (const c of pendingIce.splice(0)) await pc.addIceCandidate(c);
            await flushOutboundIce();
          } else if (row.kind === 'ice') {
            const cand = row.payload as unknown as RTCIceCandidateInit;
            if (pc.remoteDescription) await pc.addIceCandidate(cand);
            else pendingIce.push(cand);
          } else if (row.kind === 'bye') {
            close();
          }
        } catch (err) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      };

      // 4. Listen before offering, so an answer cannot arrive unheard.
      channel = supabase
        .channel(`t3a-live-view-${stageInstanceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 't3a_d1_s2_live_view_signal',
            filter: `stage_instance_id=eq.${stageInstanceId}`,
          },
          (payload) => void applySignal(payload.new as SignalRow),
        )
        .subscribe();

      // Anything sent between the gate and the subscription.
      const { data: backlog } = await supabase
        .from('t3a_d1_s2_live_view_signal')
        .select('*')
        .eq('stage_instance_id', stageInstanceId)
        .eq('to_actor', selfId)
        .order('created_at', { ascending: true });

      for (const row of (backlog ?? []) as SignalRow[]) await applySignal(row);

      // 5. The mentor offers; the participant is already listening above
      //    and will answer whoever addressed them.
      if (role === 'mentor' && counterpartId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const { error } = await sendSignal(
          stageInstanceId, selfId, counterpartId, 'offer',
          offer as unknown as Record<string, unknown>);

        // The relay refusing here is the consent gate doing its job at the
        // data layer — the same answer the RPC gave, enforced rather than
        // reported.
        if (error) {
          setState((s) => ({
            ...s,
            status: 'REFUSED',
            refusalCode: 'LIVE_VIEW_RELAY_REFUSED',
            error,
          }));
        }
      }
    };

    void run();

    return () => {
      closedRef.current = true;
      if (channel) void supabase.removeChannel(channel);
      localRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
      localRef.current = null;
    };
  }, [stageInstanceId, selfId, counterpartId, role, enabled, close]);

  return { ...state, close };
};
