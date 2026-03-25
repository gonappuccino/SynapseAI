"use client";

import { useState } from "react";
import NotationDisplay from "@/components/study/NotationDisplay";

interface Pair { left: string; right: string; }
interface Props {
  questionId: string;
  prompt: string;
  pairs: Pair[];
  onComplete: (qid: string, allCorrect: boolean) => void;
}

export default function KeywordMatch({ questionId, prompt, pairs, onComplete }: Props) {
  const [shuffledRight] = useState(() => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5));
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, boolean> | null>(null);

  const pickLeft = (i: number) => { if (!results) setSelectedLeft(i === selectedLeft ? null : i); };
  const pickRight = (i: number) => {
    if (results || selectedLeft === null) return;
    const nm = { ...matches, [selectedLeft]: i };
    setMatches(nm);
    setSelectedLeft(null);
    if (Object.keys(nm).length === pairs.length) {
      const ch: Record<number, boolean> = {};
      let ok = true;
      pairs.forEach((p, li) => { const c = shuffledRight[nm[li]] === p.right; ch[li] = c; if (!c) ok = false; });
      setResults(ch);
      setTimeout(() => onComplete(questionId, ok), 1500);
    }
  };

  const usedRight = new Set(Object.values(matches));

  return (
    <div className="border border-gray-200 bg-white p-6">
      <p className="mb-5 text-base text-gray-900"><NotationDisplay text={prompt} /></p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pairs.map((p, i) => {
            const matched = matches[i] !== undefined;
            const sel = selectedLeft === i;
            const rc = results && matched ? (results[i] ? "border-gray-900" : "border-red-300") : "";
            return (
              <button key={i} onClick={() => pickLeft(i)} disabled={matched && !!results}
                className={`border px-3 py-2 text-left text-[13px] transition ${rc || (sel ? "border-gray-900 bg-gray-50" : matched ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-gray-400")}`}>
                <NotationDisplay text={p.left} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {shuffledRight.map((t, i) => (
            <button key={i} onClick={() => pickRight(i)} disabled={usedRight.has(i) || selectedLeft === null}
              className={`border px-3 py-2 text-left text-[13px] transition ${usedRight.has(i) ? "border-gray-100 opacity-40" : selectedLeft !== null ? "border-gray-200 hover:border-gray-400" : "border-gray-100"}`}>
              <NotationDisplay text={t} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
