import traceback
import uuid

from app.models.edge import Edge
from app.models.node import Node
from app.services.gemini import get_gemini_client
from sqlalchemy.ext.asyncio import AsyncSession

EXTRACT_PROMPT = """\
You are a concept extraction engine for an adaptive learning system.

GROUNDING RULES (HIGHEST PRIORITY):
1. Every title, content, notation, and protected_identifier MUST come from the provided material. Do NOT invent, infer, or supplement with outside knowledge.
2. FIXED-POINT RULE: All formulas, variable names, notations, and key technical terms must appear EXACTLY as written in the original material. Never paraphrase, translate, or substitute them.

STEP 1 — EXTRACT ALL INFORMATION:
- Extract ALL distinct topics and information from the material. Do not discard anything.
- Every piece of information the document conveys should be captured in some node.
- NEVER return an empty nodes list. Always extract at least 1 concept.

STEP 2 — BUILD THE HIERARCHY:
- The hierarchy MUST represent a learnable progression from basic to advanced.
- Arrange nodes in the order a beginner should learn them.
- Earlier nodes must introduce concepts required to understand later nodes.
- The graph should be readable as a top-to-bottom learning path.
- Use the document structure only as evidence, not as the final hierarchy.
- Final node ordering must reflect how a beginner should learn the material.

- For each piece of information, ask:
  "Is this a core concept a student should explicitly study on its own, or is it mainly explanatory detail for a larger concept?"
  → Core study-worthy concept → top-level node.
  → Explanatory detail → sub_concept of the nearest parent concept.
- For each pair of top-level nodes, ask: "If a student learns B without A, would they struggle?"
  → Yes → prerequisite edge from A to B.
  → No → no edge; they are parallel.


- Foundational components of a system or problem should usually be grouped under a parent summary concept unless the material teaches them as major standalone topics.
- These component concepts should come before representation or algorithm nodes.
- Structural concepts should usually appear before the methods or procedures that operate on them.
- Prefer connected nodes when clearly supported by the material. Do NOT invent relationships.
- Use as many or as few nodes as the document warrants. Max 15 total.
- sub_concepts have depth 1 only (no sub_concept of a sub_concept).
- Do NOT merge named algorithms or concepts that have distinct procedures, even if they are discussed together.

ADDITIONAL STRUCTURE CONSTRAINTS:

- The graph must have ONE dominant backbone path from start to end.
- Most top-level nodes should lie on this backbone.
- Branching is allowed only when the material clearly introduces sibling alternatives or subtopics.
- Sibling alternatives must share the same parent and must NOT be connected in a direct prerequisite chain.
- Do NOT create disconnected parallel chains.

- Any named method, algorithm, procedure, protocol, theorem, or law that is taught as its own learning checkpoint in the material MUST be its own node.
- If it appears as a teaching checkpoint in the material, it MUST NOT be omitted, even if node count is limited.
- Do NOT group multiple such named concepts into a single node.

- Each concept may implicitly function as one of the following:
  • foundational concept
  • structural concept
  • procedural concept
  • outcome concept
  • property concept

- Prefer a learning order where foundational concepts come before structures, structures before procedures, and procedures before outcomes, unless the material clearly suggests otherwise.
- Do NOT extract components of a concept as separate top-level nodes if they are only defined within a parent concept.
- Such elements should be represented as sub_concepts of their parent summary node.
- If multiple methods belong to the same family or solve the same type of problem, they should usually appear as sibling nodes under a shared parent concept.
- Do NOT assume a prerequisite relationship between sibling methods unless the material explicitly states one.
- If two concepts are both named algorithms or methods, they MUST NOT be merged into a single node under any condition.
- Methods that solve fundamentally different problem settings (e.g., different assumptions or constraints) should appear as separate branches from a higher-level concept, not as children of each other.
- Elements that serve only as components of a larger concept should not be extracted as separate top-level nodes unless the material explicitly treats them as standalone learning units.
- Do NOT create standalone nodes for properties, guarantees, evaluation criteria, or qualities.
- If a concept only describes a property of another concept, integrate it into that concept’s content.

- Outcome concepts (e.g., solution, result, output) should only appear AFTER the procedural or structural concepts that generate them.

- Do NOT place outcome concepts before the processes or structures that define how they are obtained.



- Valid branching examples:
  • Different algorithms solving the same problem (e.g., BFS vs DFS)
  • Variants under the same parent concept

- In such cases:
  • The parent node must come first
  • Children nodes must NOT have prerequisite edges between them
  • Children nodes must be siblings, not a chain

- Avoid skipping levels in prerequisite edges.


- A concept is a sub_concept if:
  • It does not introduce a new independent procedure or algorithm
  • It cannot be studied independently


- If the material includes a formal representation (e.g., graph, tree, state space, equation system, model),
  that representation should appear before methods or algorithms that operate on it.

- Methods that belong to different settings or solve different variants of a problem should NOT be forced into a direct prerequisite chain unless the material explicitly presents one as building on the other.

- The graph must have exactly ONE entry node (root).
- All other nodes must be reachable from this root through prerequisite edges.

STEP 3 — WRITE CONTENT (from the material only):
- Content: summarize and reorganize what the material says about this concept. Use only information from the input.
- If the material explains a concept in detail, reflect that depth. If it only mentions it briefly, keep it short.
- If EMBEDDED FIGURES are listed, embed image references in the content using [IMAGE:index] (e.g. [IMAGE:0]).
  Place the marker where the image is most relevant. Each image in at most ONE node. Only use indices from the EMBEDDED FIGURES list.
- Use protected_identifiers naturally inline within the content.
- LATEX FORMATTING RULES (CRITICAL):
  - If the material contains ANY formulas or equations, you MUST include them in the content using LaTeX.
  - Wrap ONLY pure math in $ delimiters. NEVER mix regular text inside $...$.
  - CORRECT: "The sigmoid function is $\sigma(x) = \frac{1}{1+e^{-x}}$, which outputs values in $(0, 1)$."
  - WRONG:  "The sigmoid function is $\sigma(x) = \frac{1}{1+e^{-x}} which outputs values in (0, 1)$."
  - Each $...$ must contain ONLY math symbols, operators, and LaTeX commands — no English words.
  - Use $...$ for inline, $$...$$ for standalone equations on their own line.
  - Every formula visible in the page images MUST appear in the relevant node's content.
- protected_identifiers = key domain-specific terms (2+ characters) from the material.
  Do NOT include single characters (x, y, f, n, etc.) as protected identifiers.
  Do NOT include common English words (the, is, are, for, etc.).
  GOOD examples: "ReLU", "sigmoid", "gradient descent", "backpropagation", "MSE"
  BAD examples: "x", "f", "n", "the", "is"
- Each node gets a unique "id" (short string like "n1", "n2", ...). Edges reference these IDs, not titles.

--- STUDY MATERIAL ---
"""

# JSON Schema for Gemini structured output
EXTRACT_SCHEMA = {
    "type": "object",
    "required": ["nodes", "edges"],
    "properties": {
        "nodes": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "title", "content", "protected_identifiers"],
                "properties": {
                    "id": {"type": "string", "description": "Unique local ID like n1, n2, n3"},
                    "title": {"type": "string"},
                    "content": {"type": "string", "description": "80-180 words. MUST include all key formulas from the material in LaTeX ($...$). Each $ block must contain ONLY math, never English text."},
                    "notation": {"type": "string", "description": "Key formula in LaTeX with $ delimiters (e.g. '$\\\\sigma(x) = \\\\frac{1}{1+e^{-x}}$') or empty string"},
                    "protected_identifiers": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
            },
        },
        "edges": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["source_id", "target_id", "relation_type"],
                "properties": {
                    "source_id": {"type": "string", "description": "Node id of parent/prerequisite"},
                    "target_id": {"type": "string", "description": "Node id of child/dependent"},
                    "relation_type": {
                        "type": "string",
                        "enum": ["prerequisite", "sub_concept"],
                    },
                },
            },
        },
    },
}


async def extract_concepts(
    markdown: str, session_id: str, db: AsyncSession,
    images: list[dict] | None = None,
    page_images: list[dict] | None = None,
) -> list[Node]:
    """Extract concepts from PDF page images + text → create Nodes/Edges and save to DB."""
    client = get_gemini_client()

    prompt = EXTRACT_PROMPT
    if page_images:
        prompt += "\n[The full document pages are provided as images below. "
        prompt += "Read ALL formulas, equations, and notations DIRECTLY from the page images. "
        prompt += "Preserve them exactly in LaTeX format ($...$ or $$...$$).]\n\n"
        prompt += "--- SUPPLEMENTARY TEXT (may have broken formulas — prefer page images) ---\n"
    prompt += markdown[:50000]

    # Only embedded images can be referenced as figures (page images are for reading formulas)
    if images:
        prompt += "\n\n--- EMBEDDED FIGURES ---\n"
        for i, img in enumerate(images):
            prompt += f"[IMAGE:{i}] from page {img.get('page', '?')}\n"
        prompt += "Use [IMAGE:index] markers in node content where each figure is relevant.\n"

    # Page images first, then embedded images
    all_images = (page_images or []) + (images or [])
    print(f"[extract] prompt length: {len(prompt)}, page_images: {len(page_images or [])}, figures: {len(images or [])}")

    data = await client.generate_structured(prompt, EXTRACT_SCHEMA, images=all_images)
    print(f"[extract] response: {len(data.get('nodes', []))} nodes, {len(data.get('edges', []))} edges")

    nodes_data = data.get("nodes", [])[:15]
    edges_data = data.get("edges", [])

    if not nodes_data:
        raise ValueError("Gemini returned no concepts.")

    # local_id → UUID mapping
    local_to_uuid: dict[str, uuid.UUID] = {}
    db_nodes: list[Node] = []

    for nd in nodes_data:
        local_id = nd.get("id", "")
        node_uuid = uuid.uuid4()
        local_to_uuid[local_id] = node_uuid

        node = Node(
            id=node_uuid,
            session_id=session_id,
            title=nd.get("title", "Untitled"),
            content=nd.get("content", ""),
            notation=nd.get("notation") or None,
            protected_identifiers=nd.get("protected_identifiers"),
            confidence_score=0.0,
        )
        db_nodes.append(node)
        db.add(node)

    await db.flush()

    # Create edges — local_id mapping + sub_concept depth 1 validation
    sub_concept_edges: list[dict] = []

    # Step 1: Collect sub_concept candidates
    for ed in edges_data:
        if ed.get("relation_type") == "sub_concept":
            sub_concept_edges.append(ed)

    # Step 2: Depth 1 validation — filter out cases where a child also has children
    parent_set: set[str] = set()
    child_set: set[str] = set()
    valid_sub_edges: list[dict] = []

    for ed in sub_concept_edges:
        src = ed.get("source_id", "")
        tgt = ed.get("target_id", "")
        # If target is already a parent of another sub_concept, depth > 1 → skip
        if tgt in parent_set:
            continue
        # If source is already a child of another sub_concept, depth > 1 → skip
        if src in child_set:
            continue
        parent_set.add(src)
        child_set.add(tgt)
        valid_sub_edges.append(ed)

    # Step 3: Create all prerequisite + valid sub_concept edges
    try:
        for ed in edges_data:
            src_id = ed.get("source_id", "")
            tgt_id = ed.get("target_id", "")
            relation = ed.get("relation_type", "prerequisite")

            source_uuid = local_to_uuid.get(src_id)
            target_uuid = local_to_uuid.get(tgt_id)

            if not source_uuid or not target_uuid:
                continue

            if relation == "sub_concept" and ed not in valid_sub_edges:
                continue

            if relation not in ("prerequisite", "sub_concept"):
                continue

            edge = Edge(
                session_id=session_id,
                source_id=source_uuid,
                target_id=target_uuid,
                relation_type=relation,
            )
            db.add(edge)

        await db.commit()
    except Exception:
        traceback.print_exc()
        await db.rollback()
        raise

    return db_nodes
