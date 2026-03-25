"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NodeOut, EdgeOut } from "@/lib/api";
import GraphNode from "./GraphNode";

interface Props {
  sessionId: string;
  nodes: NodeOut[];
  edges: EdgeOut[];
}

// ── Palette per layer depth ──
// Cobalt blue pastel gradient — deeper for higher layers
const PALETTE = [
  { bg: "#eef2ff", border: "#a5b4fc", dot: "#6366f1" },   // cobalt deep
  { bg: "#e8eeff", border: "#93a5f8", dot: "#5558e6" },   // cobalt mid
  { bg: "#e0e7ff", border: "#8193f0", dot: "#4f46e5" },   // cobalt strong
  { bg: "#dbe1fe", border: "#7582e8", dot: "#4338ca" },   // cobalt darker
  { bg: "#d5ddfb", border: "#6972dc", dot: "#3730a3" },   // cobalt deep
  { bg: "#d0d8f8", border: "#5e64d0", dot: "#312e81" },   // cobalt deepest
];

const MAIN_W = 220;
const MAIN_H = 82;
const SUB_W = 164;
const SUB_H = 44;
const COL_GAP = 52;
const LAYER_GAP = 100;
const SUB_Y_GAP = 24;
const SUB_X_GAP = 16;
const MAX_COLS = 4;

interface Pos { x: number; y: number; w: number; h: number }
interface SvgE { key: string; type: "p" | "s"; x1: number; y1: number; x2: number; y2: number; color: string }

export default function PrerequisiteMap({ sessionId, nodes, edges }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const layout = useMemo(() => {
    const nMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const subChildIds = new Set(edges.filter((e) => e.relation_type === "sub_concept").map((e) => e.target_id));
    const p2c: Record<string, string[]> = {};
    edges.filter((e) => e.relation_type === "sub_concept").forEach((e) => {
      if (!p2c[e.source_id]) p2c[e.source_id] = [];
      p2c[e.source_id].push(e.target_id);
    });

    // Topological layering
    const topLevel = nodes.filter((n) => !subChildIds.has(n.id));
    const prereqs = edges.filter((e) => e.relation_type === "prerequisite");
    const inDeg: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    topLevel.forEach((n) => { inDeg[n.id] = 0; adj[n.id] = []; });
    prereqs.forEach((e) => {
      if (inDeg[e.target_id] !== undefined) { inDeg[e.target_id]++; }
      if (adj[e.source_id]) adj[e.source_id].push(e.target_id);
    });

    const layerOf: Record<string, number> = {};
    const sorted: string[] = [];
    const q = Object.keys(inDeg).filter((id) => inDeg[id] === 0);
    q.forEach((id) => { layerOf[id] = 0; });
    while (q.length) {
      const cur = q.shift()!;
      sorted.push(cur);
      for (const nxt of adj[cur] || []) {
        layerOf[nxt] = Math.max(layerOf[nxt] || 0, (layerOf[cur] || 0) + 1);
        inDeg[nxt]--;
        if (inDeg[nxt] === 0) q.push(nxt);
      }
    }
    topLevel.forEach((n) => { if (!sorted.includes(n.id)) { sorted.push(n.id); layerOf[n.id] = 0; } });

    // Group by layer
    const layers: string[][] = [];
    sorted.forEach((id) => { const l = layerOf[id] || 0; if (!layers[l]) layers[l] = []; layers[l].push(id); });

    // Container width based on widest layer
    const maxInRow = Math.min(MAX_COLS, Math.max(...layers.map((l) => l.length), 1));
    const W = maxInRow * MAIN_W + (maxInRow - 1) * COL_GAP + 80;

    // Position nodes layer by layer
    const mPos: Record<string, Pos & { layer: number }> = {};
    const sPos: Record<string, Pos & { parentId: string; layer: number }> = {};
    let curY = 0;

    layers.forEach((ids, li) => {
      // Split into sub-rows
      const rows: string[][] = [];
      for (let i = 0; i < ids.length; i += MAX_COLS) rows.push(ids.slice(i, i + MAX_COLS));

      rows.forEach((row) => {
        // Place main nodes
        const rowW = row.length * MAIN_W + (row.length - 1) * COL_GAP;
        const sx = (W - rowW) / 2;
        row.forEach((id, ci) => {
          mPos[id] = { x: sx + ci * (MAIN_W + COL_GAP), y: curY, w: MAIN_W, h: MAIN_H, layer: li };
        });

        // Place sub-concepts for this row's nodes
        let maxSubBottom = curY + MAIN_H;
        row.forEach((id) => {
          const cids = p2c[id];
          if (!cids?.length) return;
          const parent = mPos[id];
          const subCols = Math.min(cids.length, 2);
          const subRows: string[][] = [];
          for (let i = 0; i < cids.length; i += subCols) subRows.push(cids.slice(i, i + subCols));

          subRows.forEach((sr, ri) => {
            const srW = sr.length * SUB_W + (sr.length - 1) * SUB_X_GAP;
            const srX = parent.x + parent.w / 2 - srW / 2;
            const srY = parent.y + MAIN_H + SUB_Y_GAP + ri * (SUB_H + 6);
            sr.forEach((cid, ci) => {
              sPos[cid] = { x: srX + ci * (SUB_W + SUB_X_GAP), y: srY, w: SUB_W, h: SUB_H, parentId: id, layer: li };
              maxSubBottom = Math.max(maxSubBottom, srY + SUB_H);
            });
          });
        });

        curY = maxSubBottom + LAYER_GAP;
      });
    });

    // SVG edges
    const svgE: SvgE[] = [];
    prereqs.forEach((e) => {
      const from = mPos[e.source_id], to = mPos[e.target_id];
      if (!from || !to) return;
      const c = PALETTE[(to.layer) % PALETTE.length];
      svgE.push({ key: `p-${e.source_id}-${e.target_id}`, type: "p",
        x1: from.x + from.w / 2, y1: from.y + from.h,
        x2: to.x + to.w / 2, y2: to.y, color: c.dot });
    });
    Object.entries(sPos).forEach(([cid, sp]) => {
      const parent = mPos[sp.parentId];
      if (!parent) return;
      const c = PALETTE[(sp.layer) % PALETTE.length];
      svgE.push({ key: `s-${sp.parentId}-${cid}`, type: "s",
        x1: parent.x + parent.w / 2, y1: parent.y + parent.h,
        x2: sp.x + sp.w / 2, y2: sp.y, color: c.dot });
    });

    const all = [...Object.values(mPos), ...Object.values(sPos)];
    const H = all.length > 0 ? Math.max(...all.map((p) => p.y + p.h)) + 40 : 200;

    let fi = sorted.length;
    for (let i = 0; i < sorted.length; i++) { if (nMap[sorted[i]]?.confidence_score < 67) { fi = i; break; } }

    return { mPos, sPos, svgE, W, H, sorted, fi, layerOf };
  }, [nodes, edges]);

  const nMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const idxMap = Object.fromEntries(layout.sorted.map((id, i) => [id, i]));

  return (
    <div className="overflow-x-auto">
      <div className="relative mx-auto" style={{ width: layout.W, height: layout.H }}>

        {/* SVG arrows */}
        {ready && (
          <svg className="absolute inset-0 pointer-events-none" width={layout.W} height={layout.H}>
            {layout.svgE.map((e) => {
              const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const isP = e.type === "p";

              // Pull back endpoint for arrowhead
              const pullBack = 12;
              const endX = e.x2 - (dx / len) * pullBack;
              const endY = e.y2 - (dy / len) * pullBack;

              // Organic curve
              const cp = Math.max(dy * 0.4, 20);
              const path = `M${e.x1},${e.y1} C${e.x1},${e.y1 + cp} ${endX},${endY - cp} ${endX},${endY}`;

              // Arrowhead — open chevron like the hero animation
              const aLen = 10;
              const aAngle = Math.atan2(endY - (endY - cp), endX - endX) || Math.PI / 2;
              const a1x = endX - aLen * Math.cos(aAngle - 0.4);
              const a1y = endY - aLen * Math.sin(aAngle - 0.4);
              const a2x = endX - aLen * Math.cos(aAngle + 0.4);
              const a2y = endY - aLen * Math.sin(aAngle + 0.4);

              const color = isP ? "#3b3b4f" : "#8b8ba0";
              const sw = isP ? 1.5 : 1;
              const so = isP ? 0.5 : 0.25;

              return (
                <g key={e.key}>
                  {/* Ink bleed shadow */}
                  <motion.path
                    d={path} fill="none"
                    stroke={color} strokeWidth={sw * 3} strokeOpacity={so * 0.08}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                  {/* Main stroke */}
                  <motion.path
                    d={path} fill="none"
                    stroke={color} strokeWidth={sw} strokeOpacity={so}
                    strokeLinecap="round"
                    strokeDasharray={isP ? "none" : "6,5"}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                  {/* Arrowhead — open chevron */}
                  <motion.path
                    d={`M${a1x},${a1y} L${endX},${endY} L${a2x},${a2y}`}
                    fill="none" stroke={color}
                    strokeWidth={sw * 0.8} strokeOpacity={so}
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.8 }}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Main nodes */}
        {layout.sorted.map((id) => {
          const p = layout.mPos[id];
          const n = nMap[id];
          if (!p || !n) return null;
          const idx = idxMap[id] ?? 0;
          const layer = p.layer;
          return (
            <div key={id} className="absolute" style={{ left: p.x, top: p.y, width: p.w }}>
              <GraphNode node={n} sessionId={sessionId} index={idx} isLocked={false} width={p.w} layer={layer} />
            </div>
          );
        })}

        {/* Sub nodes */}
        {Object.entries(layout.sPos).map(([cid, p]) => {
          const n = nMap[cid];
          if (!n) return null;
          const pIdx = idxMap[p.parentId] ?? 0;
          return (
            <div key={cid} className="absolute" style={{ left: p.x, top: p.y, width: p.w }}>
              <GraphNode node={n} sessionId={sessionId} isSubConcept index={pIdx} isLocked={false} width={p.w} layer={p.layer} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
