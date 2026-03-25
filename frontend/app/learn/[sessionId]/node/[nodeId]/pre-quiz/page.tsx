"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getQuiz, submitQuiz, QuizQuestion, fuzzyMatch } from "@/lib/api";
import MultipleChoice from "@/components/quiz/MultipleChoice";
import QuizProgress from "@/components/quiz/QuizProgress";

export default function PreQuizPage() {
  const { sessionId, nodeId } = useParams<{ sessionId: string; nodeId: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ question_id: string; answer: string }[]>([]);
  const [feedback, setFeedback] = useState<{ is_correct: boolean; correct_answer: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (!nodeId || !sessionId || fetched.current) return;
    fetched.current = true;
    // If confidence > 0, the node is already studied — skip pre-quiz
    import("@/lib/api").then(({ getGraph }) => {
      getGraph(sessionId).then((g) => {
        const node = g.nodes.find((n) => n.id === nodeId);
        if (node && node.confidence_score > 0) {
          router.replace(`/learn/${sessionId}/node/${nodeId}`);
          return;
        }
        getQuiz(nodeId, "pre").then((r) => setQuestions(r.questions)).catch(() => setQuestions([])).finally(() => setLoading(false));
      });
    });
  }, [nodeId, sessionId, router]);

  const advance = (na: { question_id: string; answer: string }[]) => {
    setTimeout(() => {
      setFeedback(null);
      if (currentIdx + 1 < questions.length) setCurrentIdx(currentIdx + 1);
      else submitQuiz(nodeId, na, "pre").then(() => router.push(`/learn/${sessionId}/node/${nodeId}`));
    }, 1500);
  };

  const handleAnswer = (qid: string, answer: string) => {
    const na = [...answers, { question_id: qid, answer }];
    setAnswers(na);
    const exp = questions[currentIdx].correct_answer;
    if (exp) setFeedback({ is_correct: fuzzyMatch(answer, exp), correct_answer: Array.isArray(exp) ? exp.join(", ") : exp });
    advance(na);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Loading...</p></main>;
  if (!questions.length) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-sm text-gray-400">No quiz available.</p></main>;

  const cur = questions[currentIdx];
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <nav className="px-6 py-5 sm:px-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">Pre-Quiz</span>
      </nav>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-xl px-6 sm:px-10">
        <QuizProgress current={currentIdx} total={questions.length} />
        <MultipleChoice key={cur.id} questionId={cur.id} prompt={cur.prompt} options={cur.options || []} onAnswer={handleAnswer} feedback={feedback} />
      </motion.div>
    </main>
  );
}
