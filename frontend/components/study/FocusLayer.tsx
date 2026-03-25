"use client";

import { motion } from "framer-motion";
import NotationDisplay from "./NotationDisplay";

interface FocusLayerProps {
  identifiers: string[];
}

/**
 * Protected Identifier → 200% Bold + bouncy spring animation.
 */
export default function FocusLayer({ identifiers }: FocusLayerProps) {
  if (!identifiers || identifiers.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-4">
      {identifiers.map((id, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
            delay: i * 0.1,
          }}
          whileHover={{ scale: 1.1 }}
          className="inline-block rounded-lg bg-indigo-500/20 px-4 py-2 text-2xl font-bold text-white"
        >
          <NotationDisplay text={id} />
        </motion.span>
      ))}
    </div>
  );
}
