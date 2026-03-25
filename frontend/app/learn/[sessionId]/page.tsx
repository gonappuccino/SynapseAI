"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getGraph, GraphOut } from "@/lib/api";
import PrerequisiteMap from "@/components/graph/PrerequisiteMap";

export default function LearnPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [graph, setGraph] = useState<GraphOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getGraph(sessionId).then(setGraph).catch(() => setError("Failed to load."));
  }, [sessionId]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-sm text-gray-400">{error}</p></main>;
  if (!graph) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Loading...</p></main>;

  const total = graph.nodes.length;
  const avgScore = total > 0 ? Math.round(graph.nodes.reduce((s, n) => s + n.confidence_score, 0) / total) : 0;
  const mastered = graph.nodes.filter((n) => n.confidence_score >= 90).length;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <nav className="flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="/" className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">SynapseAI</a>
        <span className="text-[11px] tabular-nums text-gray-400">{mastered}/{total} mastered</span>
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="px-6 pb-20 sm:px-10"
      >
        <h1
          className="mb-1 text-4xl tracking-tight text-gray-900 sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Knowledge Graph
        </h1>
        <p className="mb-4 text-[13px] text-gray-400">
          Follow the arrows. Each concept builds on the previous.
        </p>

        {/* Overall progress */}
        <div className="mb-10 max-w-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400">Overall Progress</span>
            <span className="text-[11px] tabular-nums font-medium text-gray-900">{avgScore}%</span>
          </div>
          <div className="h-[4px] w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#6366f1" }}
              initial={{ width: 0 }}
              animate={{ width: `${avgScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <PrerequisiteMap sessionId={sessionId} nodes={graph.nodes} edges={graph.edges} />
      </motion.div>
    </main>
  );
}
