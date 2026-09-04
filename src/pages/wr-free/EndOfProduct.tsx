import { useNavigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

/**
 * T3A-DEV-INS-WR-FREE-001 · Section 5.4 — End of the product.
 *
 * NO behavioral mapping, NO summary of the participant's choices, NO
 * pattern, NO profile, NO what-this-says-about-you. Section 3's
 * removal applies here too.
 *
 * NO discount, NO countdown, NO limited-time offer, NO price anywhere
 * on this screen. Both links are equally weighted.
 */
export default function WrFreeEndOfProduct() {
 const navigate = useNavigate();
 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen flex items-center pt-24 pb-24">
 <div className="max-w-3xl mx-auto px-6 w-full">
 <h1 className="display-serif text-[2.5rem] md:text-[4rem] text-foreground leading-tight mb-6">
 You worked through two workplace rehearsal experiences today.
 </h1>
 <p className="text-lg text-foreground/80 leading-relaxed mb-10 max-w-2xl">
 In both, your choices carried consequences.
 </p>
 <p className="display-serif text-2xl text-foreground/85 leading-snug mb-10 max-w-2xl">
 There are more workplace moments like these to rehearse.
 </p>
 <div className="flex flex-wrap gap-4">
 <Button
 onClick={() => navigate("/dashboard/candidate")}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-4 text-base font-medium"
 >
 See the moments <span className="ml-3">→</span>
 </Button>
 <Button
 variant="outline"
 onClick={() => navigate("/contact?subject=wr-free-feedback")}
 className="border-2 border-foreground text-foreground rounded-none shadow-none px-8 py-4 text-base font-medium"
 >
 Tell us what you think of this <span className="ml-3">→</span>
 </Button>
 </div>
 <p className="mt-16 text-xs text-foreground/60 max-w-2xl">
 Private. No score. No pass or fail. Nothing here becomes evidence.
 </p>
 </div>
 </section>
 </PublicLayout>
 );
}
