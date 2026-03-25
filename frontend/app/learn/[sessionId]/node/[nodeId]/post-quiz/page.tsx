"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getQuiz, submitQuiz, QuizQuestion, fuzzyMatch } from "@/lib/api";
import FillInBlank from "@/components/quiz/FillInBlank";
import KeywordMatch from "@/components/quiz/KeywordMatch";
import MultipleChoice from "@/components/quiz/MultipleChoice";
import QuizProgress from "@/components/quiz/QuizProgress";

export default function PostQuizPage() {
  const { sessionId, nodeId } = useParams<{ sessionId: string; nodeId: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ question_id: string; answer: string }[]>([]);
  const [feedback, setFeedback] = useState<{ is_correct: boolean; correct_answer: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ score: number; correct: number; total: number; confidence_score: number; details: { question_id: string; submitted: string; correct_answer: string; is_correct: boolean }[] } | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!nodeId || fetched.current) return;
    fetched.current = true;
    getQuiz(nodeId, "post").then((r) => setQuestions(r.questions)).catch(() => setQuestions([])).finally(() => setLoading(false));
  }, [nodeId]);

  const advance = (na: { question_id: string; answer: string }[]) => {
    setTimeout(() => {
      setFeedback(null);
      if (currentIdx + 1 < questions.length) setCurrentIdx(currentIdx + 1);
      else submitQuiz(nodeId, na, "post").then((r) => setResult({ score: r.score, correct: r.correct, total: r.total, confidence_score: r.confidence_score, details: r.details as any }));
    }, 1500);
  };

  const handleAnswer = (qid: string, answer: string) => {
    const na = [...answers, { question_id: qid, answer }];
    setAnswers(na);
    const exp = questions[currentIdx].correct_answer;
    if (exp) setFeedback({ is_correct: fuzzyMatch(answer, exp), correct_answer: Array.isArray(exp) ? exp.join(", ") : exp });
    advance(na);
  };

  const handleMatch = (qid: string, allCorrect: boolean) => {
    const na = [...answers, { question_id: qid, answer: allCorrect ? "correct" : "incorrect" }];
    setAnswers(na);
    advance(na);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Loading...</p></main>;

  if (result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 mb-4">
            {result.correct === result.total ? "Perfect" : "Complete"}
          </p>
          <p className="text-6xl font-light tracking-tight text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            {result.correct}/{result.total}
          </p>
          <p className="mt-3 text-[13px] text-gray-400">
            Confidence: {Math.round(result.confidence_score)}%
          </p>

          {/* Incorrect answers review */}
          {result.details?.some((d) => !d.is_correct) && (
            <div className="mt-10 w-full max-w-md text-left">
              <p className="mb-3 text-[11px] uppercase tracking-[0.15em] text-gray-400">Review</p>
              <div className="flex flex-col gap-3">
                {result.details.filter((d) => !d.is_correct).map((d, i) => {
                  const q = questions.find((q) => q.id === d.question_id);
                  return (
                    <div key={i} className="border border-red-200 bg-red-50/30 p-4">
                      <p className="text-[13px] text-gray-700 mb-2">{q?.prompt || "Question"}</p>
                      <p className="text-[12px] text-red-400">Your answer: {d.submitted}</p>
                      <p className="text-[12px] text-gray-900 font-medium">Correct: {typeof d.correct_answer === 'string' ? d.correct_answer : JSON.stringify(d.correct_answer)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push(`/learn/${sessionId}`)}
            className="mt-10 inline-block border-b border-gray-900 pb-0.5 text-[13px] font-medium text-gray-900 transition hover:border-gray-400 hover:text-gray-500"
          >
            Back to concepts →
          </button>
        </motion.div>
      </main>
    );
  }

  if (!questions.length) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-sm text-gray-400">No quiz available.</p></main>;

  const cur = questions[currentIdx];
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <nav className="px-6 py-5 sm:px-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">Post-Quiz</span>
      </nav>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-xl px-6 sm:px-10">
        <QuizProgress current={currentIdx} total={questions.length} />
        {cur.type === "multiple_choice" && cur.options ? (
          <MultipleChoice key={cur.id} questionId={cur.id} prompt={cur.prompt} options={cur.options} onAnswer={handleAnswer} feedback={feedback} />
        ) : cur.type === "keyword_match" && cur.pairs ? (
          <KeywordMatch key={cur.id} questionId={cur.id} prompt={cur.prompt} pairs={cur.pairs} onComplete={handleMatch} />
        ) : (
          <FillInBlank key={cur.id} questionId={cur.id} prompt={cur.prompt} onAnswer={handleAnswer} feedback={feedback} />
        )}
      </motion.div>
    </main>
  );
}
