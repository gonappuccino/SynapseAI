"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import NotationDisplay from "./NotationDisplay";

interface Props {
  content: string;
  protectedIdentifiers: string[];
  eslMode?: boolean;
  eslContent?: string;
  identifierTranslations?: Record<string, string>;
  sessionId?: string;
}

type SegType = "text" | "protected" | "image" | "math-inline" | "math-block";
interface Seg { type: SegType; text: string; imageIndex?: number }

/**
 * Unified parser: split content into segments respecting priority:
 *   $$...$$ > $...$ > [IMAGE:x] > protected identifiers > plain text
 *
 * Math blocks are NEVER broken by identifier matching.
 */
function parse(text: string, ids: string[]): Seg[] {
  // Build unified regex with priority ordering via alternation
  const parts: string[] = [];

  // 1. $$...$$ block math (highest priority)
  parts.push("(\\$\\$[\\s\\S]*?\\$\\$)");

  // 2. $...$ inline math (max 200 chars, non-greedy)
  parts.push("(\\$[^$]{1,200}?\\$)");

  // 3. [IMAGE:x]
  parts.push("(\\[IMAGE:\\d+\\])");

  // 4. Protected identifiers (with word boundaries + optional plural s/es suffix)
  const filteredIds = ids.filter((id) => id.length >= 2);
  if (filteredIds.length) {
    const sorted = [...filteredIds].sort((a, b) => b.length - a.length);
    const esc = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    parts.push(`\\b((?:${esc.join("|")})(?:e?s)?)\\b`);
  }

  const re = new RegExp(parts.join("|"), "gi");
  const segs: Seg[] = [];
  const seen = new Set<string>();
  let last = 0;

  for (const m of text.matchAll(re)) {
    const idx = m.index!;
    const full = m[0];

    // Plain text before this match
    if (idx > last) segs.push({ type: "text", text: text.slice(last, idx) });

    if (full.startsWith("$$") && full.endsWith("$$")) {
      // Block math
      segs.push({ type: "math-block", text: full.slice(2, -2).trim() });
    } else if (full.startsWith("$") && full.endsWith("$") && full.length > 2) {
      // Inline math
      segs.push({ type: "math-inline", text: full.slice(1, -1).trim() });
    } else if (full.startsWith("[IMAGE:")) {
      const imgIdx = parseInt(full.match(/\d+/)![0]);
      segs.push({ type: "image", text: "", imageIndex: imgIdx });
    } else {
      // Protected identifier — first occurrence only
      const key = full.toLowerCase().replace(/e?s$/, "");
      if (seen.has(key)) {
        // Already highlighted — render as plain text
        segs.push({ type: "text", text: full });
      } else {
        seen.add(key);
        segs.push({ type: "protected", text: full });
      }
    }

    last = idx + full.length;
  }

  if (last < text.length) segs.push({ type: "text", text: text.slice(last) });
  return segs;
}

export default function StudyContent({ content, protectedIdentifiers, eslMode = false, eslContent, identifierTranslations = {}, sessionId }: Props) {
  const display = eslMode && eslContent ? eslContent : content;
  const segs = useMemo(() => parse(display, protectedIdentifiers), [display, protectedIdentifiers]);

  return (
    <div className="text-base leading-[1.9] text-gray-500">
      {segs.map((s, i) => {
        switch (s.type) {
          case "math-block":
            return <span key={i}><NotationDisplay text={`$$${s.text}$$`} /></span>;
          case "math-inline":
            return <span key={i} className="font-bold text-gray-900"><NotationDisplay text={`$${s.text}$`} /></span>;
          case "image":
            return sessionId ? (
              <span key={i} className="my-4 block">
                <img
                  src={`/api/sessions/${sessionId}/images/${s.imageIndex}`}
                  alt={`Figure ${(s.imageIndex ?? 0) + 1}`}
                  className="inline-block max-h-96 w-full max-w-xl rounded border border-gray-200 bg-white p-2"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </span>
            ) : null;
          case "protected":
            return <Word key={i} text={s.text} tooltip={eslMode ? identifierTranslations[s.text] : undefined} />;
          default:
            return <span key={i}><NotationDisplay text={s.text} /></span>;
        }
      })}
    </div>
  );
}

function Word({ text, tooltip }: { text: string; tooltip?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span className="relative inline-block">
      <motion.span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="inline-block cursor-default text-base font-bold text-gray-900"
      >
        <NotationDisplay text={text} />
      </motion.span>
      {tooltip && hovered && (
        <span className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-600 shadow-sm">
          {tooltip}
        </span>
      )}
    </span>
  );
}
