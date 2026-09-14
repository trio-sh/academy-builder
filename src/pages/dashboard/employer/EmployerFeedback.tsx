/**
 * Employer Feedback — T3A-DEV-CN-EMP-001 Item 12.
 *
 * Hire Feedback is retired. The 30/60/90 mechanism, every
 * participant-linked field and every control that attaches feedback to a
 * person are gone — not disabled, not stubbed.
 *
 * Employer feedback about The 3rd Academy must never become behavioral
 * evidence about a participant.
 *
 * There is deliberately no validator that rejects names: validators fail
 * on ordinary words and give false assurance. The rule governs instead —
 * text submitted here is never used as evidence about any participant,
 * never reaches any record, and never enters matching, ordering or a
 * report.
 */
import { useEffect, useState } from "react";
import {
  DashboardPageHeader,
  DashSection,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  controlledText,
  reportMissingControlledText,
  FEEDBACK_CATEGORIES,
} from "@/lib/employerDeskText";
import { submitProductFeedback, readLiveWorksActivated } from "@/lib/employerDesk";

const EmployerFeedback = () => {
  const { toast } = useToast();
  const [category, setCategory] = useState<string>("general");
  const [body, setBody] = useState("");
  const [liveWorksOn, setLiveWorksOn] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const support = controlledText("L-EMP-FDBK-001");
  const boundary = controlledText("L-EMP-FDBK-BOUNDARY");

  useEffect(() => {
    const load = async () => setLiveWorksOn(await readLiveWorksActivated());
    void load();
  }, []);

  if (!support || !boundary) {
    reportMissingControlledText("L-EMP-FDBK-001");
    return null;
  }

  const categories = FEEDBACK_CATEGORIES.filter(
    (c) => !c.requiresLiveWorks || liveWorksOn
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim() === "") return;
    setIsSending(true);
    const result = await submitProductFeedback(category, body.trim());
    setIsSending(false);
    if (result.accepted) {
      setBody("");
      toast({ title: "Thank you — your feedback has reached The 3rd Academy." });
    } else {
      toast({ title: "That feedback could not be accepted.", variant: "destructive" });
    }
  };

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Feedback to The 3rd Academy"
        title="Employer Feedback"
        meta={support[0]}
      />

      <DashSection eyebrow="§ I · What this is for" title="About the product">
        <div className="border-l-2 border-foreground pl-8 max-w-3xl">
          <p className="text-foreground/85 text-lg leading-relaxed">{support[1]}</p>
        </div>
      </DashSection>

      <DashSection eyebrow="§ II · Your feedback" title="Tell us">
        <form onSubmit={onSubmit} className="max-w-2xl space-y-7">
          <label className="block">
            <span className="mono-label text-foreground/70 block mb-2">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mono-label text-foreground/70 block mb-2">Your feedback</span>
            {/* The boundary line sits with the field, renders in full at
                every width, and is not a tooltip. */}
            <span className="block text-foreground/70 text-[0.9375rem] leading-relaxed mb-3">
              {boundary[0]}
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
            />
          </label>

          <Button type="submit" disabled={isSending || body.trim() === ""}>
            {isSending ? "Sending…" : "Send to The 3rd Academy"}
          </Button>
        </form>
      </DashSection>
    </div>
  );
};

export default EmployerFeedback;
