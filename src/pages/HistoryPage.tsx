import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight, FileText, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRunsList } from "@/lib/queries";

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useRunsList(PAGE_SIZE, offset);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Analysis History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and access previous analysis runs.
            </p>
          </div>
          <Link to="/">
            <Button className="bg-teal-600 hover:bg-teal-500 text-white">
              New Analysis
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load runs"}
          </div>
        )}

        {data && data.runs.length === 0 && (
          <div className="py-20 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No analysis runs found.</p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline">Upload a Dataset</Button>
            </Link>
          </div>
        )}

        {data && data.runs.length > 0 && (
          <>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {data.runs.map((runId, i) => (
                <motion.div
                  key={runId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/report/${runId}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-teal-500/10 transition-colors">
                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-teal-500 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium font-mono truncate">
                          {runId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{offset + i + 1}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, data.total)}{" "}
                of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.has_more}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
