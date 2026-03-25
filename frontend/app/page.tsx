"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState, useEffect } from "react";

const COBALT = "#6366f1";
const C4 = "#c7d2fe";
const INK = "#2d2d3d";
const INK_MID = "#6b6b80";
const INK_LIGHT = "#a0a0b0";

// ── Document — every keyword maps to a graph node ──
// Story: Linear Algebra → Calculus → Probability → Statistics → ML → Neural Nets → Deep Learning → Transformers
const DOC_LINES = [
  { words: ["We", "begin", "with", { kw: "Linear Algebra", id: 0 }, "for"] },
  { words: ["vector", "spaces.", { kw: "Calculus", id: 1 }, "provides"] },
  { words: ["optimization.", { kw: "Probability", id: 2 }, "models"] },
  { words: ["uncertainty.", { kw: "Statistics", id: 3 }, "infers"] },
  { words: ["from", "data.", { kw: "Machine Learning", id: 4 }, "learns"] },
  { words: ["patterns.", { kw: "Neural Networks", id: 5 }, "approximate"] },
  { words: ["functions.", { kw: "Deep Learning", id: 6 }, "scales"] },
  { words: ["representations.", { kw: "Transformers", id: 7 }, "attend."] },
];

// ── Graph — 8 nodes, clear prerequisite chain ──
const NODES = [
  { id: 0, label: "Linear Algebra",    x: 50, y: 12 },
  { id: 1, label: "Calculus",          x: 22, y: 30 },
  { id: 2, label: "Probability",       x: 78, y: 28 },
  { id: 3, label: "Statistics",        x: 35, y: 48 },
  { id: 4, label: "Machine Learning",  x: 65, y: 48 },
  { id: 5, label: "Neural Networks",   x: 25, y: 68 },
  { id: 6, label: "Deep Learning",     x: 55, y: 72 },
  { id: 7, label: "Transformers",      x: 80, y: 72 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2],       // LA → Calc, LA → Prob
  [1, 3], [2, 3],       // Calc → Stats, Prob → Stats
  [2, 4], [3, 4],       // Prob → ML, Stats → ML
  [0, 5], [4, 5],       // LA → NN, ML → NN
  [5, 6], [4, 6],       // NN → DL, ML → DL
  [6, 7],               // DL → Transformers
];

// Learning path — one continuous stroke: the canonical ML journey
const PATH_IDS = [0, 1, 3, 4, 6, 7];

// ── Timing ──
const T = {
  HIGHLIGHT: 1.2,
  TRANSFORM: 2.8,
  PATH_DRAW: 4.5,
  FADE_BG: 7.5,
  TEXT_IN: 8.3,
};

const FEATURES = [
  { icon: "↗", title: "Upload anything", desc: "PDF, images, handwritten notes — AI reads it all." },
  { icon: "◈", title: "Knowledge graphs", desc: "Concepts extracted and organized into prerequisite trees." },
  { icon: "⟡", title: "Adaptive quizzes", desc: "Pre & post quizzes that adapt to your understanding." },
];

// Helper: compute edge path between two nodes
function edgePath(from: typeof NODES[0], to: typeof NODES[0], i: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const startX = from.x + (dx / len) * 2.5;
  const startY = from.y + (dy / len) * 2.5;
  const endX = to.x - (dx / len) * 2.5;
  const endY = to.y - (dy / len) * 2.5;
  const wobble = ((i * 7 + 3) % 9) - 4;
  const perpX = (-dy / len) * wobble;
  const perpY = (dx / len) * wobble;
  const cx1 = startX + dx * 0.3 + perpX;
  const cy1 = startY + dy * 0.3 + perpY;
  const cx2 = startX + dx * 0.7 - perpX * 0.3;
  const cy2 = startY + dy * 0.7 - perpY * 0.3;
  return { path: `M${startX},${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`, endX, endY, cx2, cy2 };
}

export default function Home() {
  const [glow, setGlow] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState(0);

  const handleMouse = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), T.HIGHLIGHT * 1000),
      setTimeout(() => setPhase(2), T.TRANSFORM * 1000),
      setTimeout(() => setPhase(3), T.PATH_DRAW * 1000),
      setTimeout(() => setPhase(4), T.FADE_BG * 1000),
      setTimeout(() => setPhase(5), T.TEXT_IN * 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      <nav className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">SynapseAI</span>
        <Link href="/upload" className="rounded-lg px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-white transition hover:opacity-80" style={{ background: COBALT }}>Get started</Link>
      </nav>

      <section onMouseMove={handleMouse} className="relative flex flex-col items-center justify-center px-6 overflow-hidden" style={{ minHeight: "88vh" }}>
        <div className="pointer-events-none absolute h-[600px] w-[600px] rounded-full transition-all duration-700 ease-out" style={{ left: glow.x - 300, top: glow.y - 300, background: `radial-gradient(circle, ${COBALT}05 0%, transparent 55%)` }} />

        {/* ── Document — academic paper style ── */}
        <AnimatePresence>
          {phase < 2 && (
            <motion.div className="absolute" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, filter: "blur(6px)" }} transition={{ duration: 0.7 }}>
              <div className="w-[380px] sm:w-[500px] bg-white px-10 py-8 sm:px-14 sm:py-10 shadow-[0_2px_24px_rgba(0,0,0,0.06)]">

                {/* Header — journal style */}
                <motion.div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
                  <span className="text-[7px] sm:text-[8px] uppercase tracking-[0.2em] text-gray-300" style={{ fontFamily: "var(--font-body)" }}>Journal of Computer Science</span>
                  <span className="text-[7px] sm:text-[8px] text-gray-300" style={{ fontFamily: "var(--font-body)" }}>Vol. 12, 2026</span>
                </motion.div>

                {/* Title */}
                <motion.h2 className="mb-1 text-center text-[17px] sm:text-[20px] font-semibold text-gray-900 leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }}>
                  Introduction to Algorithm Design<br />and Computational Complexity
                </motion.h2>

                {/* Authors */}
                <motion.p className="mb-1 text-center text-[9px] sm:text-[10px] text-gray-400"
                  style={{ fontFamily: "var(--font-body)" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.3 }}>
                  A. Chen, B. Kumar, C. Park
                </motion.p>
                <motion.p className="mb-5 text-center text-[8px] sm:text-[9px] italic text-gray-300"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.2 }}>
                  Department of Computer Science, University of Toronto
                </motion.p>

                {/* Divider — double line */}
                <div className="mb-4 flex flex-col gap-[2px]">
                  <div className="h-[1.5px] w-full bg-gray-200" />
                  <div className="h-[0.5px] w-full bg-gray-100" />
                </div>

                {/* Abstract */}
                <motion.p className="mb-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.2 }}>
                  Abstract
                </motion.p>

                {/* Body text with keywords */}
                <div className="flex flex-col gap-[5px]">
                  {DOC_LINES.map((line, li) => (
                    <motion.div key={li} className="flex flex-wrap gap-[4px] leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + li * 0.06, duration: 0.25 }}>
                      {line.words.map((word, wi) =>
                        typeof word === "object" ? (
                          <motion.span key={wi} className="relative" style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
                            initial={{ color: "#9ca3af", fontWeight: 400 }}
                            animate={phase >= 1 ? { color: COBALT, fontWeight: 700, fontSize: "13px" } : {}}
                            transition={{ delay: word.id * 0.12, duration: 0.5 }}
                          >{word.kw}</motion.span>
                        ) : (
                          <span key={wi} className="text-[11px] text-gray-300" style={{ fontFamily: "var(--font-body)" }}>{word}</span>
                        )
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Keywords line */}
                <motion.div className="mt-4 flex gap-1 text-[8px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.2 }}>
                  <span className="font-semibold text-gray-400" style={{ fontFamily: "var(--font-body)" }}>Keywords:</span>
                  <span className="italic text-gray-300" style={{ fontFamily: "var(--font-body)" }}>algorithms, complexity, optimization, data structures</span>
                </motion.div>

                {/* Section divider */}
                <div className="my-4 h-px w-full bg-gray-100" />

                {/* Two-column body — IEEE style */}
                <motion.p className="mb-2 text-[8px] font-bold uppercase tracking-[0.1em] text-gray-400"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
                  1. Introduction
                </motion.p>
                <div className="flex gap-5">
                  <div className="flex flex-1 flex-col gap-[4px]">
                    {[100, 92, 100, 85, 100, 78, 100, 90].map((w, i) => (
                      <motion.div key={i} className="h-[2px] bg-gray-100" style={{ width: `${w}%` }}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: 0.9 + i * 0.025, duration: 0.15 }}
                        style2={{ transformOrigin: "left" }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-1 flex-col gap-[4px]">
                    {[95, 100, 88, 100, 82, 100, 93, 70].map((w, i) => (
                      <motion.div key={i} className="h-[2px] bg-gray-100" style={{ width: `${w}%` }}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: 0.9 + i * 0.025, duration: 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Graph ── */}
        {phase >= 2 && (
          <motion.div className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 4 ? 0.04 : 1 }}
            transition={{ duration: phase >= 4 ? 1.5 : 0.5 }}
          >
            <svg viewBox="0 0 100 85" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">

              {/* Background edges — light, all at once */}
              {EDGES.map(([from, to], i) => {
                const a = NODES[from], b = NODES[to];
                const { path } = edgePath(a, b, i);
                const isOnPath = PATH_IDS.includes(from) && PATH_IDS.includes(to);
                return (
                  <motion.path key={`bg-${i}`}
                    d={path} fill="none"
                    stroke={INK_LIGHT}
                    strokeWidth={0.1}
                    strokeOpacity={isOnPath && phase >= 3 ? 0.05 : 0.15}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: i * 0.25, duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                );
              })}

              {/* Background edge arrowheads */}
              {EDGES.map(([from, to], i) => {
                const a = NODES[from], b = NODES[to];
                const { endX, endY, cx2, cy2 } = edgePath(a, b, i);
                const aAngle = Math.atan2(endY - cy2, endX - cx2);
                const aLen = 1.6;
                const isOnPath = PATH_IDS.includes(from) && PATH_IDS.includes(to);
                return (
                  <motion.path key={`bga-${i}`}
                    d={`M${endX - aLen * Math.cos(aAngle - 0.4)},${endY - aLen * Math.sin(aAngle - 0.4)} L${endX},${endY} L${endX - aLen * Math.cos(aAngle + 0.4)},${endY - aLen * Math.sin(aAngle + 0.4)}`}
                    fill="none" stroke={INK_LIGHT}
                    strokeWidth={0.1}
                    strokeOpacity={isOnPath && phase >= 3 ? 0.05 : 0.15}
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.25 + 1.5, duration: 0.3 }}
                  />
                );
              })}

              {/* Nodes — single filled circle */}
              {NODES.map((node, i) => {
                const isOnPath = phase >= 3 && PATH_IDS.includes(node.id);
                return (
                  <g key={`n-${i}`}>
                    <motion.circle cx={node.x} cy={node.y} r={isOnPath ? 1.4 : 0.9}
                      fill={isOnPath ? COBALT : INK_MID}
                      fillOpacity={isOnPath ? 0.55 : 0.2}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.2, duration: 0.4, type: "spring", stiffness: 250, damping: 20 }}
                    />
                    {/* Label */}
                    <motion.text x={node.x} y={node.y - 4}
                      textAnchor="middle"
                      fill={isOnPath ? INK : INK_MID}
                      fontSize="1.7"
                      fontFamily="var(--font-display)"
                      fontWeight={isOnPath ? 600 : 400}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isOnPath ? 0.9 : 0.35 }}
                      transition={{ delay: i * 0.2 + 0.2, duration: 0.4 }}
                    >{node.label}</motion.text>
                  </g>
                );
              })}

              {/* ── THE PATH — one continuous brushstroke ── */}
              {phase >= 3 && (() => {
                // Build single continuous path through all PATH_IDS nodes
                const pts = PATH_IDS.map((id) => NODES[id]);
                let d = `M${pts[0].x},${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const a = pts[i], b = pts[i + 1];
                  const dx = b.x - a.x, dy = b.y - a.y;
                  // Gestural curves — each segment bows differently
                  const tension = 0.4 + (i % 2) * 0.15;
                  const cx1 = a.x + dx * tension + (i % 2 === 0 ? 6 : -5);
                  const cy1 = a.y + dy * 0.15 + (i % 2 === 0 ? 4 : -3);
                  const cx2 = b.x - dx * tension + (i % 2 === 0 ? -4 : 5);
                  const cy2 = b.y - dy * 0.15 + (i % 2 === 0 ? -3 : 2);
                  d += ` C${cx1},${cy1} ${cx2},${cy2} ${b.x},${b.y}`;
                }

                // Terminal arrowhead
                const last = pts[pts.length - 1];
                const prev = pts[pts.length - 2];
                const adx = last.x - prev.x, ady = last.y - prev.y;
                const aAngle = Math.atan2(ady, adx);
                const aLen = 2.5;

                return (
                  <g>
                    {/* Wide ink bleed — paper absorption */}
                    <motion.path d={d} fill="none"
                      stroke={COBALT} strokeWidth={2} strokeOpacity={0.03}
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 3.5, ease: [0.22, 0.68, 0.36, 1] }}
                    />
                    {/* Main brushstroke */}
                    <motion.path d={d} fill="none"
                      stroke={COBALT} strokeWidth={0.35} strokeOpacity={0.65}
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 3.5, ease: [0.22, 0.68, 0.36, 1] }}
                    />
                    {/* Ghost companion — calligraphy double-edge */}
                    <motion.path d={d} fill="none"
                      stroke={COBALT} strokeWidth={0.08} strokeOpacity={0.3}
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: "translate(0.4px, 0.4px)" }}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 3.5, delay: 0.08, ease: [0.22, 0.68, 0.36, 1] }}
                    />
                    {/* Arrowhead — final flick of the wrist */}
                    <motion.path
                      d={`M${last.x - aLen * Math.cos(aAngle - 0.35)},${last.y - aLen * Math.sin(aAngle - 0.35)} L${last.x},${last.y} L${last.x - aLen * Math.cos(aAngle + 0.35)},${last.y - aLen * Math.sin(aAngle + 0.35)}`}
                      fill="none" stroke={COBALT}
                      strokeWidth={0.3} strokeOpacity={0.65}
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 3.2, duration: 0.4, ease: "easeOut" }}
                    />
                  </g>
                );
              })()}
            </svg>
          </motion.div>
        )}

        {/* ── Hero text ── */}
        {phase >= 5 && (
          <div className="relative z-10 flex flex-col items-center">
            <motion.h1
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center text-[clamp(3.5rem,12vw,9rem)] font-light leading-[0.95] tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "#2d2d2d" }}
            >
              Learn less,<br />
              <motion.span className="font-semibold" style={{ color: COBALT }}
                initial={{ opacity: 0, filter: "blur(16px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.5, duration: 0.7 }}>
                know more.
              </motion.span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.5 }}
              className="mt-6 max-w-md text-center text-[15px] leading-relaxed text-gray-400">
              Upload any material. AI builds your personalized learning path with adaptive quizzes.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, type: "spring", stiffness: 180 }} className="mt-10">
              <Link href="/upload" className="group inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-[14px] font-medium text-white transition-all hover:shadow-xl hover:shadow-indigo-500/15" style={{ background: COBALT }}>
                Try SynapseAI
                <motion.span className="inline-block text-white/60" animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}>→</motion.span>
              </Link>
            </motion.div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.0 }} className="mb-12 text-[11px] uppercase tracking-[0.2em] text-gray-400">How it works</motion.p>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.1 + i * 0.1, duration: 0.5 }} className="group">
              <span className="inline-block text-lg transition-transform group-hover:scale-110" style={{ color: COBALT }}>{f.icon}</span>
              <h3 className="mt-3 text-base font-medium tracking-tight text-gray-900" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200/60 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-[11px] text-gray-300">© 2026 SynapseAI</span>
          <span className="text-[11px] text-gray-300">Built with Gemini</span>
        </div>
      </footer>
    </main>
  );
}
