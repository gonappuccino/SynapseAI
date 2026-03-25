"use client";

import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

interface NotationDisplayProps {
  text: string;
}

/**
 * LaTeX math rendering.
 * $$...$$ → block math, $...$ → inline math.
 */
export default function NotationDisplay({ text }: NotationDisplayProps) {
  // Handle raw LaTeX without $ delimiters (notation field)
  if (/\\[a-zA-Z]+/.test(text) && !/\$/.test(text)) {
    try { return <BlockMath math={text.trim()} />; }
    catch { return <span>{text}</span>; }
  }

  const segments = parseLatex(text);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "block") {
          try { return <BlockMath key={i} math={seg.value} />; }
          catch { return <span key={i}>{seg.value}</span>; }
        }
        if (seg.type === "inline") {
          try { return <InlineMath key={i} math={seg.value} />; }
          catch { return <span key={i}>{seg.value}</span>; }
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </span>
  );
}

interface Segment { type: "text" | "inline" | "block"; value: string }

function addText(segments: Segment[], value: string) {
  if (!value) return;
  if (segments.length > 0 && segments[segments.length - 1].type === "text") {
    segments[segments.length - 1].value += value;
  } else {
    segments.push({ type: "text", value });
  }
}

function parseLatex(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < text.length) {
    // $$...$$ block math
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        const latex = text.slice(i + 2, end).trim();
        if (latex) segments.push({ type: "block", value: latex });
        i = end + 2;
        continue;
      }
    }

    // $...$ inline math
    if (text[i] === "$") {
      const end = findClosingDollar(text, i + 1);
      if (end !== -1) {
        const latex = text.slice(i + 1, end).trim();
        if (latex && isValidMath(latex)) {
          segments.push({ type: "inline", value: latex });
        } else if (latex) {
          // Not real math — strip $ and render as plain text
          addText(segments, latex);
        }
        i = end + 1;
        continue;
      }
    }

    // Regular text — collect until next $
    const nextDollar = text.indexOf("$", i + 1);
    const textEnd = nextDollar === -1 ? text.length : nextDollar;
    addText(segments, text.slice(i, textEnd));
    i = textEnd;
  }

  return segments;
}

function findClosingDollar(text: string, start: number): number {
  // Find matching $ but not $$ and within 150 chars
  const maxLen = Math.min(start + 150, text.length);
  for (let i = start; i < maxLen; i++) {
    if (text[i] === "$" && text[i + 1] !== "$") {
      return i;
    }
  }
  return -1;
}

function isValidMath(latex: string): boolean {
  // Reject if it contains 3+ consecutive regular English words
  // (a real math expression shouldn't have full sentences)
  if (/[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/.test(latex)) {
    return false;
  }
  // Must have at least one math-like character
  return /[\\{}^_=+\-*/∑∫∏∇≤≥≠]|\d/.test(latex);
}
