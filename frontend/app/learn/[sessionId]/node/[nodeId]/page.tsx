"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getGraph, getEsl, NodeOut, EslData } from "@/lib/api";
import StudyContent from "@/components/study/StudyContent";
import NotationDisplay from "@/components/study/NotationDisplay";
import AudioPlayer from "@/components/audio/AudioPlayer";

export default function StudyPage() {
  const { sessionId, nodeId } = useParams<{ sessionId: string; nodeId: string }>();
  const router = useRouter();
  const [node, setNode] = useState<NodeOut | null>(null);
  const [eslMode, setEslMode] = useState(false);
  const [eslData, setEslData] = useState<EslData | null>(null);
  const [eslLoading, setEslLoading] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    getGraph(sessionId).then((g) => setNode(g.nodes.find((n) => n.id === nodeId) || null));
  }, [sessionId, nodeId]);

  const handleEsl = async () => {
    const next = !eslMode;
    setEslMode(next);
    if (next && !eslData) {
      setEslLoading(true);
      try { setEslData(await getEsl(nodeId)); } catch {} finally { setEslLoading(false); }
    }
  };

  if (!node) return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]"><p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Loading...</p></main>;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <nav className="flex items-center justify-between px-6 py-5 sm:px-10">
        <button onClick={() => router.push(`/learn/${sessionId}`)} className="text-[11px] uppercase tracking-[0.15em] text-gray-400 transition hover:text-gray-900">
          ← Back
        </button>
        <button onClick={handleEsl} className={`text-[11px] uppercase tracking-[0.15em] transition ${eslMode ? "text-gray-900" : "text-gray-400 hover:text-gray-900"}`}>
          {eslLoading ? "..." : eslMode ? "ESL ON" : "ESL"}
        </button>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl px-6 pb-20 sm:px-10 lg:px-20"
      >
        <h1 className="mb-8 text-4xl tracking-tight text-gray-900 sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
          {node.title}
        </h1>

        {eslMode && (
          <p className="mb-6 border-l-2 border-gray-300 pl-4 text-[12px] leading-relaxed text-gray-400">
            ESL — 설명은 한국어, 용어는 영어 유지.<br/>용어 위에 마우스를 올리면 한국어 뜻이 나옵니다.
          </p>
        )}

        <div className="mb-8"><AudioPlayer nodeId={nodeId} /></div>

        {node.notation && (
          <div className="mb-8 border border-gray-200 bg-white p-5 text-base">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-gray-400">Key Formula</p>
            <NotationDisplay text={node.notation} />
          </div>
        )}

        {/* Body text */}
        <StudyContent
          content={node.content}
          protectedIdentifiers={node.protected_identifiers || []}
          eslMode={eslMode}
          eslContent={eslData?.content_ko}
          identifierTranslations={eslData?.identifier_translations}
          sessionId={sessionId}
        />

        <button
          onClick={() => router.push(`/learn/${sessionId}/node/${nodeId}/post-quiz`)}
          className="mt-14 inline-block border-b border-gray-900 pb-0.5 text-[13px] font-medium text-gray-900 transition hover:border-gray-400 hover:text-gray-500"
        >
          Continue to quiz →
        </button>
      </motion.div>
    </main>
  );
}
