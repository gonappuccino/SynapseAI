"use client";

import { useState } from "react";
import NotationDisplay from "@/components/study/NotationDisplay";

interface Props {
  questionId: string;
  prompt: string;
  onAnswer: (qid: string, answer: string) => void;
  feedback?: { is_correct: boolean; correct_answer: string } | null;
}

export default function FillInBlank({ questionId, prompt, onAnswer, feedback }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    setSubmitted(true);
    onAnswer(questionId, value.trim());
  };

  return (
    <div className="border border-gray-200 bg-white p-6">
      <p className="mb-5 text-base leading-relaxed text-gray-900"><NotationDisplay text={prompt} /></p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !submitted && submit()}
          disabled={submitted}
          autoComplete="off"
          placeholder="Type answer..."
          className="relative z-10 flex-1 border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-900 outline-none transition focus:border-gray-900 disabled:opacity-40"
        />
        {!submitted && (
          <button onClick={submit} className="border border-gray-900 bg-gray-900 px-5 py-2.5 text-[13px] text-white transition hover:bg-gray-700">
            Check
          </button>
        )}
      </div>
      {feedback && (
        <p className={`mt-3 text-[13px] ${feedback.is_correct ? "text-gray-900" : "text-red-500"}`}>
          {feedback.is_correct ? "Correct." : `Answer: ${feedback.correct_answer}`}
        </p>
      )}
    </div>
  );
}
