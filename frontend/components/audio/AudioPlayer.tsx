"use client";

import { useRef, useState, useCallback } from "react";
import { getAudioScript, AudioScript } from "@/lib/api";

type Phase = "idle" | "loading" | "title" | "explanation" | "question" | "pause" | "answer";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Play",
  loading: "Loading...",
  title: "제목",
  explanation: "설명",
  question: "문제",
  pause: "생각하세요...",
  answer: "정답",
};

export default function AudioPlayer({ nodeId }: { nodeId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [speed, setSpeed] = useState(1);
  const stopRef = useRef(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, rate: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (stopRef.current) return reject("stopped");
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = rate;
      u.onend = () => resolve();
      u.onerror = (e) => e.error === "canceled" ? reject("stopped") : resolve();
      utterRef.current = u;
      speechSynthesis.speak(u);
    });
  }, []);

  const wait = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (stopRef.current) return reject("stopped");
      };
      check();
      const id = setTimeout(() => { check(); resolve(); }, ms);
      // Store for cleanup
      (wait as any)._timer = id;
    });
  }, []);

  const play = useCallback(async () => {
    stopRef.current = false;
    setPhase("loading");

    let script: AudioScript;
    try {
      script = await getAudioScript(nodeId);
    } catch {
      setPhase("idle");
      return;
    }

    if (stopRef.current) { setPhase("idle"); return; }

    try {
      // 1. Title
      setPhase("title");
      await speak(script.title, speed);

      // 2. Explanation
      setPhase("explanation");
      await speak(script.explanation, speed);

      // 3. Question
      setPhase("question");
      await speak("자, 그럼 문제입니다. " + script.question, speed);

      // 4. Wait 3 seconds
      setPhase("pause");
      await wait(3000);

      // 5. Answer
      setPhase("answer");
      await speak(script.answer, speed);

      setPhase("idle");
    } catch {
      setPhase("idle");
    }
  }, [nodeId, speed, speak, wait]);

  const stop = useCallback(() => {
    stopRef.current = true;
    speechSynthesis.cancel();
    setPhase("idle");
  }, []);

  const toggle = () => {
    if (phase === "idle") play();
    else stop();
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
  };

  const isActive = phase !== "idle" && phase !== "loading";

  return (
    <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
      <button onClick={toggle} className="text-[13px] font-medium text-gray-900 shrink-0">
        {phase === "idle" ? "Play" : phase === "loading" ? "..." : "Stop"}
      </button>
      <div className="flex-1 flex items-center gap-2">
        {isActive && (
          <span className="text-[11px] text-gray-400">{PHASE_LABELS[phase]}</span>
        )}
        {phase === "pause" && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        )}
      </div>
      <button onClick={cycleSpeed} className="text-[11px] tabular-nums text-gray-400 shrink-0">
        {speed}x
      </button>
    </div>
  );
}
