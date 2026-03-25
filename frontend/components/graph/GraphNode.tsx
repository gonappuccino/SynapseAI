"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NodeOut } from "@/lib/api";

const PALETTE = [
  { bg: "#eef2ff", border: "#a5b4fc", dot: "#6366f1" },
  { bg: "#e8eeff", border: "#93a5f8", dot: "#5558e6" },
  { bg: "#e0e7ff", border: "#8193f0", dot: "#4f46e5" },
  { bg: "#dbe1fe", border: "#7582e8", dot: "#4338ca" },
  { bg: "#d5ddfb", border: "#6972dc", dot: "#3730a3" },
  { bg: "#d0d8f8", border: "#5e64d0", dot: "#312e81" },
];

interface GraphNodeProps {
  node: NodeOut;
  sessionId: string;
  isSubConcept?: boolean;
  index?: number;
  isLocked?: boolean;
  width?: number;
  layer?: number;
}

export default function GraphNode({
  node, sessionId, isSubConcept = false, index = 0, isLocked = false, width, layer = 0,
}: GraphNodeProps) {
  const pct = Math.round(node.confidence_score);
  const done = pct >= 90;
  const active = pct >= 1;
  const href = isLocked ? "#" : `/learn/${sessionId}/node/${node.id}/pre-quiz`;
  const c = PALETTE[layer % PALETTE.length];

  // ── Sub-concept: small, tinted ──
  if (isSubConcept) {
    return (
      <Link href={href}>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 + 0.25 }}
          whileHover={isLocked ? {} : { y: -1 }}
          style={{ width: width || SUB_DEFAULT_W, borderLeft: `2px solid ${c.border}`, background: done ? c.bg : "white" }}
          className={`px-3 py-2 transition hover:shadow-sm ${isLocked ? "opacity-20 pointer-events-none" : "cursor-pointer"}`}
        >
          <p className="text-[11px] leading-snug text-gray-500">{node.title}</p>
          {pct > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-[1.5px] flex-1 bg-gray-100">
                <div style={{ width: `${pct}%`, background: c.dot, opacity: 0.5 }} className="h-full" />
              </div>
              <span className="text-[9px] tabular-nums text-gray-300">{pct}%</span>
            </div>
          )}
        </motion.div>
      </Link>
    );
  }

  // ── Main concept: bold, color-accented ──
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 24 }}
        whileHover={isLocked ? {} : { y: -3, boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
        style={{
          width: width || MAIN_DEFAULT_W,
          borderLeft: `3px solid ${done ? c.dot : c.dot}`,
          background: done ? c.bg : "white",
        }}
        className={`p-4 shadow-sm transition ${isLocked ? "opacity-20 pointer-events-none" : "cursor-pointer"}`}
      >
        <h3
          className="text-[14px] font-medium leading-snug text-gray-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {node.title}
        </h3>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-[2px] flex-1" style={{ background: done ? `${c.border}40` : "#f3f4f6" }}>
            <motion.div
              style={{ background: done ? c.dot : active ? c.border : "transparent" }}
              className="h-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, done ? 100 : 0)}%` }}
              transition={{ duration: 0.5, delay: index * 0.06 + 0.2 }}
            />
          </div>
          <span className="text-[10px] tabular-nums shrink-0" style={{ color: done ? c.dot : "#9ca3af" }}>
            {done ? `${pct}%` : active ? `${pct}%` : "Start"}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

const MAIN_DEFAULT_W = 224;
const SUB_DEFAULT_W = 156;
