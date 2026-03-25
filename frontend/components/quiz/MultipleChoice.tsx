"use client";

import { useState } from "react";
import NotationDisplay from "@/components/study/NotationDisplay";

interface Props {
  questionId: string;
  prompt: string;
  options: string[];
  onAnswer: (qid: string, answer: string) => void;
  feedback?: { is_correct: boolean; correct_answer: string } | null;
}

export default function MultipleChoice({ questionId, prompt, options, onAnswer, feedback }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    onAnswer(questionId, opt);
  };

  return (
    <div className="border border-gray-200 bg-white p-6">
      <p className="mb-6 text-base leading-relaxed text-gray-900"><NotationDisplay text={prompt} /></p>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isThis = selected === opt;
          const isCorrect = feedback && opt.toLowerCase() === feedback.correct_answer.toLowerCase();
          let cls = "border-gray-200 hover:border-gray-400";
          if (isThis && feedback?.is_correct) cls = "border-gray-900 bg-gray-50";
          else if (isThis && feedback && !feedback.is_correct) cls = "border-red-300 bg-red-50/30";
          else if (feedback && isCorrect) cls = "border-gray-900 bg-gray-50";
          else if (selected) cls = "border-gray-100 opacity-40";

          return (
            <button key={i} onClick={() => pick(opt)} disabled={!!selected}
              className={`flex items-center gap-3 border px-4 py-3 text-left text-[13px] transition ${cls}`}>
              <span className="text-[11px] text-gray-400">{String.fromCharCode(65 + i)}</span>
              <span className="text-gray-700"><NotationDisplay text={opt} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
