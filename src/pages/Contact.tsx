import { useState } from "react";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle } from "lucide-react";
import { LedgerHero, LedgerSection, rise } from "@/components/ledger";

const contactReasons = [
  { id: "general", label: "General inquiry" },
  { id: "employer", label: "Employer partnership" },
  { id: "school", label: "School partnership" },
  { id: "candidate", label: "Candidate support" },
];

const info = [
  { label: "Editorial", value: "hello@the3rdacademy.com", href: "mailto:hello@the3rdacademy.com" },
  { label: "Support", value: "support@the3rdacademy.com", href: "mailto:support@the3rdacademy.com" },
  { label: "Telephone", value: "+1 (587) 716-3135", href: "tel:+15877163135" },
  { label: "Headquarters", value: "143 Saddlecrest Gardens NE, Calgary, AB T4J 0C3, Canada" },
];

const Contact = () => {
  const [selectedReason, setSelectedReason] = useState("general");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <PublicLayout>
      <LedgerHero
        eyebrow="§ Correspondence"
        meta="Write to the editor"
        stamp="Reply within 2 business days"
        title={
          <>
            <span className="block">Write to</span>
            <span className="block italic display-serif-italic">the editor.</span>
          </>
        }
        lede={
          <>
            The register is kept by people. Reach the desk directly — no forms triage,
            no bots.
          </>
        }
        ledeSide={
          <div className="grid gap-4">
            {info.map((i) => (
              <div key={i.label} className="flex items-baseline justify-between gap-4 border-b border-foreground/15 pb-3">
                <span className="mono-label text-foreground/60">{i.label}</span>
                {i.href ? (
                  <a href={i.href} className="text-foreground underline underline-offset-4 hover:ink-vermilion">
                    {i.value}
                  </a>
                ) : (
                  <span className="text-foreground">{i.value}</span>
                )}
              </div>
            ))}
          </div>
        }
      />

      <LedgerSection first>
        <motion.form
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={rise}
          onSubmit={handleSubmit}
          className="max-w-3xl border-2 border-foreground p-8 md:p-12 bg-background/40"
        >
          <div className="mono-label text-foreground/60 pb-3 mb-6 border-b border-foreground/25">
            Correspondence Form · No. 000-002
          </div>

          {isSubmitted ? (
            <div className="text-center py-12">
              <CheckCircle className="w-14 h-14 mx-auto mb-6 text-foreground" />
              <p className="display-serif text-3xl mb-4">Filed with the editor.</p>
              <p className="text-foreground/70">
                You will hear back within two business days.
              </p>
            </div>
          ) : (
            <>
              {/* Reason */}
              <fieldset className="mb-8">
                <legend className="mono-label text-foreground/60 mb-3">Reason for writing</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {contactReasons.map((r) => (
                    <label
                      key={r.id}
                      className={
                        "cursor-pointer border p-3 flex items-center gap-3 transition-colors " +
                        (selectedReason === r.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/25 hover:border-foreground/60")
                      }
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.id}
                        checked={selectedReason === r.id}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{r.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="firstName" className="mono-label text-foreground/60 block mb-2">First name</label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mono-label text-foreground/60 block mb-2">Last name</label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="email" className="mono-label text-foreground/60 block mb-2">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="subject" className="mono-label text-foreground/60 block mb-2">Subject</label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
                />
              </div>

              <div className="mb-8">
                <label htmlFor="message" className="mono-label text-foreground/60 block mb-2">Message</label>
                <Textarea
                  id="message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="rounded-none border-foreground/40 focus-visible:border-foreground focus-visible:ring-0 bg-transparent text-base leading-relaxed"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 text-base font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Filing...
                  </>
                ) : (
                  <>
                    File this message with the editor
                    <span className="ml-3">→</span>
                  </>
                )}
              </Button>
            </>
          )}
        </motion.form>
      </LedgerSection>
    </PublicLayout>
  );
};

export default Contact;
