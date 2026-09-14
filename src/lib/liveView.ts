/**
 * The Stage 2 live views — T3A-D1-EXEC-001 §3.1 and §3.3.
 *
 * Both live views were placeholders, which is why fourteen acceptance
 * tests could not run. This is the layer between a media track and the
 * availability rule.
 *
 * WHAT THIS IS NOT. It is not a media provider and it does not choose
 * one. It takes a MediaStream from whatever the meeting workspace ends
 * up being — LiveKit, Daily, Twilio, a raw peer connection — and asks
 * the same questions of all of them. Nothing here needs a vendor SDK, a
 * credential or an account, so the wiring can be finished and proved
 * before that decision is made.
 *
 * THE RULE IS THE SERVER'S. §3.3 sets four thresholds — degraded at
 * three seconds, unavailable at ten, immediate on a failed or ended
 * track, restoration only after five consecutive seconds — and
 * t3a_d1_s2_live_view_state holds them. This module MEASURES and asks;
 * it never decides. A second opinion in the client is how a session
 * continues as if conditions were intact, which is the thing AC-23 and
 * AC-31 exist to catch.
 *
 * NOTHING IS RECORDED. There is no MediaRecorder, no upload, no blob,
 * and no frame is retained past the statistics read that counts it.
 * RECORDING consent is not granted at any D1 Stage, so a live view
 * displays and measures and does nothing else.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type LiveViewState = "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";

export type LiveViewVerdict = {
  state: LiveViewState;
  reason?: string | null;
  pause_route_taken?: boolean;
  source_advancement_blocked?: boolean;
  variance_on_resumption?: boolean;
};

/** Before any track arrives there is nothing to judge, and saying
 *  AVAILABLE would be a claim rather than an observation. */
const NO_TRACK_YET: LiveViewVerdict = {
  state: "UNAVAILABLE",
  reason: "NO_TRACK_PRESENTED",
  pause_route_taken: true,
  source_advancement_blocked: true,
  variance_on_resumption: true,
};

/**
 * What the transport says about the track, in the vocabulary §3.3 uses.
 * A track that is absent, ended or muted by the transport is reported as
 * such; anything else is live and the frame counter decides.
 */
const trackState = (track: MediaStreamTrack | null): string => {
  if (!track) return "ended";
  if (track.readyState === "ended") return "ended";
  if (track.muted) return "muted";
  return "live";
};

/**
 * Decoded frames, read from the peer connection where one is supplied.
 *
 * §3.3 is written about DECODED FRAMES rather than about connection
 * state, because a connection can be perfectly healthy while the
 * participant's picture is frozen. Where no peer connection is given —
 * an SDK that does not expose one — the track's own state is all there
 * is, and that is reported honestly rather than guessed at.
 */
const readDecodedFrames = async (
  pc: RTCPeerConnection | null
): Promise<number | null> => {
  if (!pc) return null;
  try {
    const stats = await pc.getStats();
    let frames: number | null = null;
    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        const decoded = (report as { framesDecoded?: number }).framesDecoded;
        if (typeof decoded === "number") frames = (frames ?? 0) + decoded;
      }
    });
    return frames;
  } catch {
    // A stats read that throws is not evidence that frames are arriving.
    return null;
  }
};

type MonitorInput = {
  stream: MediaStream | null;
  peerConnection?: RTCPeerConnection | null;
  /** Off for a view that is not required, so nothing is judged that is
   *  not being relied on. */
  enabled?: boolean;
};

/**
 * Measures one live view and reports the server's verdict on it.
 *
 * The tick is one second because §3.3 counts in consecutive seconds. It
 * asks the server when the measured inputs change, not on every tick, so
 * a steady view is not a steady stream of round trips.
 */
export const useLiveViewMonitor = ({
  stream,
  peerConnection = null,
  enabled = true,
}: MonitorInput): LiveViewVerdict => {
  const [verdict, setVerdict] = useState<LiveViewVerdict>(NO_TRACK_YET);

  // Counters, held in refs because they are measurements rather than
  // render state: changing them must not repaint the cockpit.
  const secondsWithoutFrames = useRef(0);
  const secondsOfDecodedFrames = useRef(0);
  const lastFrameCount = useRef<number | null>(null);
  const wasUnavailable = useRef(false);
  const lastAsked = useRef<string>("");

  const ask = useCallback(
    async (
      track: string,
      without: number,
      decoded: number,
      recovering: boolean
    ) => {
      // The verdict is the server's, every time. There is no local
      // threshold here and no cached rule to drift from §3.3.
      const { data } = await supabase.rpc("t3a_d1_s2_live_view_state", {
        p_track_state: track,
        p_seconds_without_frames: without,
        p_seconds_of_decoded_frames: decoded,
        p_was_unavailable: recovering,
      });
      const v = (data ?? NO_TRACK_YET) as LiveViewVerdict;
      setVerdict(v);
      wasUnavailable.current = v.state === "UNAVAILABLE";
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      const track = stream?.getVideoTracks()[0] ?? null;
      const state = trackState(track);
      const frames = await readDecodedFrames(peerConnection);

      const advancing =
        frames !== null && lastFrameCount.current !== null
          ? frames > lastFrameCount.current
          : state === "live";
      lastFrameCount.current = frames;

      if (advancing) {
        secondsWithoutFrames.current = 0;
        secondsOfDecodedFrames.current += 1;
      } else {
        secondsWithoutFrames.current += 1;
        // Restoration must be CONSECUTIVE. One good second after a gap
        // starts the five again rather than continuing them.
        secondsOfDecodedFrames.current = 0;
      }

      const signature = [
        state,
        secondsWithoutFrames.current,
        secondsOfDecodedFrames.current,
        wasUnavailable.current,
      ].join("|");

      if (signature !== lastAsked.current) {
        lastAsked.current = signature;
        await ask(
          state,
          secondsWithoutFrames.current,
          secondsOfDecodedFrames.current,
          wasUnavailable.current
        );
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 1000);
    return () => window.clearInterval(id);
  }, [stream, peerConnection, enabled, ask]);

  return verdict;
};

/**
 * Attaches a stream to a video element for display.
 *
 * `muted` on the mentor's own view prevents feedback, and `playsInline`
 * keeps it in the layout rather than going fullscreen — §3.1 forbids
 * anything that overlays or replaces a live view, and a fullscreen video
 * is exactly that.
 */
export const attachStream = (
  el: HTMLVideoElement | null,
  stream: MediaStream | null
) => {
  if (!el) return;
  if (el.srcObject !== stream) el.srcObject = stream;
};
