/**
 * The participant's side of a Stage 2 live view — T3A-D1-EXEC-001 §3.1.
 *
 * The mentor's cockpit had a live view and the participant had nowhere to
 * appear from, so the connection had no second end. This is that end.
 *
 * It does three things and no more: it says whether a session is open,
 * it shows the participant what is being seen of them, and it states
 * plainly that nothing is recorded. There is no capture control here,
 * because there is nothing for the participant to operate — a live view
 * is not a submission.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Video, VideoOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveSession } from "@/lib/liveSession";
import { useLiveViewMonitor, attachStream } from "@/lib/liveView";

interface OpenSession {
  stage_instance_id: string;
  stage_code: string;
  opened_at: string;
}

export default function ParticipantLiveSession() {
  const { profile } = useAuth();
  const [session, setSession] = useState<OpenSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Which Stage instance, if any, is open on this participant. Resolved
  // server-side: the participant is not trusted to name a Stage instance
  // and neither is this screen.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase.rpc("t3a_d1_s2_my_open_session");
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as OpenSession | null;
        setSession(row ?? null);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const live = useLiveSession({
    stageInstanceId: session?.stage_instance_id ?? null,
    selfId: profile?.id ?? null,
    role: "participant",
    enabled: Boolean(session && profile?.id),
  });

  // The participant sees the mentor's view, and their own, and is told
  // what the server thinks of each. §3.3's verdict is not hidden from the
  // person it is about.
  const ownView = useLiveViewMonitor({ stream: live.localStream });
  const mentorView = useLiveViewMonitor({
    stream: live.remoteStream,
    peerConnection: live.peerConnection,
  });

  const ownRef = useRef<HTMLVideoElement | null>(null);
  const mentorRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    attachStream(ownRef.current, live.localStream);
  }, [live.localStream]);
  useEffect(() => {
    attachStream(mentorRef.current, live.remoteStream);
  }, [live.remoteStream]);

  const refusalText = useMemo(() => {
    switch (live.refusalCode) {
      case "OBSERVATION_CONSENT_NOT_ON_RECORD":
        return "No observation consent is on record for you, so no view may be opened. Nothing here starts until you have agreed to it.";
      case "OBSERVATION_CONSENT_WITHDRAWN":
        return "You have withdrawn observation consent. No view will open, and no session can proceed on it.";
      case "DEVICE_ACCESS_NOT_GRANTED":
        return "This browser did not grant camera and microphone access. Nothing is shared until it does.";
      default:
        return "The live view was refused. Nothing is being shared.";
    }
  }, [live.refusalCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Live Session</h1>
        <p className="text-sm text-foreground/70 mt-1 max-w-2xl leading-relaxed">
          When an observation session is open, this is where you appear and
          where you can see the mentor observing.
        </p>
      </header>

      {/* Stated once, prominently, and true: there is no recording route
          in this platform. RECORDING consent is unavailable at every D1
          Stage, and t3a_d1_consent_type_available refuses to grant it. */}
      <div className="border-2 border-foreground/25 bg-foreground/[0.03] p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <div className="mono-label">Nothing is recorded</div>
          <p className="text-sm text-foreground/75 mt-1 leading-relaxed">
            A live view is watched as it happens and then it is gone. No
            video or audio of you is saved, uploaded or kept anywhere in
            this platform, at any Stage.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4">
          <div className="mono-label ink-vermilion">COULD NOT CHECK</div>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      {!session && !loadError && (
        <div className="border-2 border-foreground/25 p-6 text-center">
          <VideoOff className="w-6 h-6 mx-auto mb-3 text-foreground/50" />
          <div className="mono-label mb-1">No session open</div>
          <p className="text-sm text-foreground/70 max-w-md mx-auto">
            Nothing is being observed right now, and your camera is not in
            use. This page opens a view only while a session is running.
          </p>
        </div>
      )}

      {session && live.status === "REFUSED" && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4">
          <div className="mono-label ink-vermilion">
            {live.refusalCode ?? "LIVE VIEW REFUSED"}
          </div>
          <p className="text-sm mt-1 leading-relaxed">{refusalText}</p>
          {live.refusalRemedy && (
            <p className="mono-label text-foreground/50 mt-2">
              {live.refusalRemedy}
            </p>
          )}
        </div>
      )}

      {session && live.status !== "REFUSED" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-2 border-foreground">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
              <div className="mono-label">You</div>
              <div className="mono-label text-background/70">
                {ownView.state}
              </div>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-foreground/[0.06] border border-foreground/25 relative">
                {/* Muted, because hearing yourself back is feedback. */}
                <video
                  ref={ownRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!live.localStream && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center px-4">
                      <Video className="w-5 h-5 mx-auto mb-2 text-foreground/50" />
                      <div className="mono-label">
                        {live.status === "CHECKING_CONSENT"
                          ? "Checking consent"
                          : live.status === "REQUESTING_DEVICES"
                            ? "Asking for your camera"
                            : "Not sharing"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="border-2 border-foreground">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
              <div className="mono-label">Mentor</div>
              <div className="mono-label text-background/70">
                {mentorView.state}
              </div>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-foreground/[0.06] border border-foreground/25 relative">
                <video
                  ref={mentorRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!live.remoteStream && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center px-4">
                      <div className="mono-label">
                        {live.status === "CONNECTING"
                          ? "Connecting"
                          : "Waiting for the mentor"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
