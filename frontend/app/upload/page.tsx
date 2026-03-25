"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { uploadFile } from "@/lib/api";

const PHRASES = [
  "Reading between the lines...",
  "Connecting the dots...",
  "Teaching AI your material...",
  "Building your knowledge map...",
  "Finding hidden patterns...",
  "Almost there, hang tight...",
];

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [displayText, setDisplayText] = useState("");
  const state = useRef({ charIdx: 0, deleting: false, phraseIdx: 0 });

  // Typewriter effect — single loop
  useEffect(() => {
    if (!loading) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const s = state.current;
      const phrase = PHRASES[s.phraseIdx];

      if (!s.deleting) {
        s.charIdx++;
        setDisplayText(phrase.slice(0, s.charIdx));

        if (s.charIdx >= phrase.length) {
          // Pause at full text, then delete
          timer = setTimeout(() => {
            s.deleting = true;
            tick();
          }, 1500);
          return;
        }
        timer = setTimeout(tick, 50);
      } else {
        s.charIdx--;
        setDisplayText(phrase.slice(0, s.charIdx));

        if (s.charIdx <= 0) {
          // Move to next phrase
          s.deleting = false;
          s.phraseIdx = (s.phraseIdx + 1) % PHRASES.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 25);
      }
    };

    tick();
    return () => clearTimeout(timer);
  }, [loading]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    state.current = { charIdx: 0, deleting: false, phraseIdx: 0 };
    try {
      const { session_id } = await uploadFile(file);
      router.push(`/learn/${session_id}`);
    } catch {
      setError("Something went wrong. Try again?");
      setLoading(false);
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          {/* File name */}
          <p className="mb-6 text-[11px] uppercase tracking-[0.15em] text-gray-400">
            {fileName}
          </p>

          {/* Typewriter text */}
          <p
            className="h-7 text-center text-lg text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {displayText}
            <span className="ml-[1px] inline-block w-[2px] h-[1.1em] bg-gray-900 align-text-bottom animate-pulse" />
          </p>

          {/* Progress bar (indeterminate) */}
          <div className="mt-10 h-[2px] w-48 overflow-hidden bg-gray-200">
            <motion.div
              className="h-full w-1/3 bg-gray-900"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--bg)]">
      <nav className="flex items-center px-6 py-5 sm:px-10">
        <a href="/" className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">
          SynapseAI
        </a>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <h1
            className="mb-8 text-3xl tracking-tight text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Upload
          </h1>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className={`flex h-48 cursor-pointer flex-col items-center justify-center border transition ${
              dragging ? "border-gray-900 bg-white" : "border-gray-300 hover:border-gray-500"
            }`}
          >
            <p className="text-sm text-gray-500">
              Drop file or <span className="border-b border-gray-500">browse</span>
            </p>
            <p className="mt-2 text-[11px] text-gray-400">PDF, PNG, JPG, MP3, WAV</p>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.flac"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-[13px] text-gray-500"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
