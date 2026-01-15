import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";

const paragraphs = [
  "We built ACE to replace the noise of dashboards with the clarity of decisions. Every run begins with a contract because meaning requires boundaries, and every governing thought is written before the charts appear.",
  "The Neural Refinery is not a black box. It exposes its lineage, its doubts, and its evidence. If a claim cannot be traced to code, data, and confidence metrics, it has no place in the report.",
  "Safe Mode is not a warning banner—it is a promise. When data is incomplete or governance restricts a claim, ACE slows down, states the limitation, and refuses to bluff.",
  "The What-If cockpit exists so leaders can test their intuition safely. Scenarios run in RAM-only sandboxes, deltas stream in real time, and experiment history becomes institutional knowledge.",
  "Meaning without craft is forgettable, and craft without meaning is decoration. The Lab & Library aesthetic—serif narratives paired with monospace evidence—reminds us which voice is storytelling and which voice is measurement.",
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
