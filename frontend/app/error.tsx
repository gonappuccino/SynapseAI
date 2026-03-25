"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)]">
      <p className="text-sm text-gray-500">{error.message}</p>
      <button onClick={reset} className="mt-4 border-b border-gray-900 pb-0.5 text-[13px] text-gray-900">
        Try again
      </button>
    </main>
  );
}
