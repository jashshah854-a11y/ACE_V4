import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";

const paragraphs = [
  "We built ACE to replace the noise of dashboards with the clarity of bounded decisions. Every run begins with a contract because meaning requires constraints, and the governing thought is written before the charts appear.",
  "ACE is not a black box. Each run produces a manifest that records what executed, what was valid, and what is allowed to render. If a claim cannot be traced to code and data, it does not appear.",
  "When data is incomplete or a step fails, ACE slows down, states the limitation, and suppresses the section. Silence is preferred to speculation.",
  "The report stays minimal by design. Executive summaries are shown only when validation gates succeed; diagnostics explain failures without polluting the main narrative.",
];

export default function FoundersLetter() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-[min(10vw,4rem)]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-3xl space-y-8 font-serif"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground">Founder's Letter</p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Why ACE chooses meaning over metrics.
          </h1>
          {paragraphs.map((paragraph, idx) => (
            <p key={idx} className="text-lg leading-relaxed text-muted-foreground first-letter:text-3xl first-letter:font-bold first-letter:text-foreground">
              {paragraph}
            </p>
          ))}
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">— The ACE V4 Team</p>
        </motion.section>
      </main>
    </div>
  );
}
