"use client";

import NotationDisplay from "./NotationDisplay";

interface FadedLayerProps {
  content: string;
}

/**
 * Display supplementary explanation text at opacity-30.
 * Math expressions are rendered via NotationDisplay.
 */
export default function FadedLayer({ content }: FadedLayerProps) {
  return (
    <div className="opacity-30 leading-relaxed text-gray-200">
      <NotationDisplay text={content} />
    </div>
  );
}
