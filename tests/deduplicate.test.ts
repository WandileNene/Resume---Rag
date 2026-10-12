import { mergeCandidates } from "../src/modules/retrieval/utils/deduplicate";
import type { SearchCandidate } from "../src/modules/retrieval/types/retrieval.types";

// Helper — build a minimal BM25 candidate (matchedSkills required by the type)
const bm25 = (
  resumeId: string,
  bm25Score: number,
  skills: string[] = []
): SearchCandidate & { matchedSkills: string[] } => ({
  resumeId,
  skills,
  bm25Score,
  sources: ["bm25"],
  matchedSkills: skills
});

// Helper — build a minimal vector candidate
const vec = (
  resumeId: string,
  vectorScore: number,
  skills: string[] = []
): SearchCandidate => ({
  resumeId,
  skills,
  vectorScore,
  sources: ["vector"]
});

describe("mergeCandidates (deduplicate)", () => {
  // ── Spec example ──────────────────────────────────────────────────────────
  it("produces pool A,B,C,D from BM25=[A,B,C] and vector=[B,D,A] (spec example)", () => {
    const result = mergeCandidates(
      [bm25("A", 8), bm25("B", 7), bm25("C", 6)],
      [vec("B", 0.9), vec("D", 0.8), vec("A", 0.7)]
    );

    expect(result.map((c) => c.resumeId)).toEqual(["A", "B", "C", "D"]);
  });

  // ── Source provenance ──────────────────────────────────────────────────────
  it("marks A as sources=[bm25,vector] when it appears in both lists", () => {
    const result = mergeCandidates([bm25("A", 8)], [vec("A", 0.9)]);
    const a = result.find((c) => c.resumeId === "A")!;

    expect(a.sources).toEqual(["bm25", "vector"]);
  });

  it("marks BM25-only candidate as sources=[bm25]", () => {
    const result = mergeCandidates([bm25("A", 8)], []);
    expect(result[0].sources).toEqual(["bm25"]);
  });

  it("marks vector-only candidate as sources=[vector]", () => {
    const result = mergeCandidates([], [vec("B", 0.9)]);
    expect(result[0].sources).toEqual(["vector"]);
  });

  // ── Score retention ────────────────────────────────────────────────────────
  it("retains bm25Score for a BM25-only candidate", () => {
    const result = mergeCandidates([bm25("A", 8.41)], []);
    expect(result[0].bm25Score).toBe(8.41);
    expect(result[0].vectorScore).toBeUndefined();
  });

  it("retains vectorScore for a vector-only candidate", () => {
    const result = mergeCandidates([], [vec("B", 0.88)]);
    expect(result[0].vectorScore).toBe(0.88);
    expect(result[0].bm25Score).toBeUndefined();
  });

  it("retains both scores when a candidate appears in both lists", () => {
    const result = mergeCandidates([bm25("A", 8.41)], [vec("A", 0.88)]);
    const a = result[0];
    expect(a.bm25Score).toBe(8.41);
    expect(a.vectorScore).toBe(0.88);
  });

  it("never combines scores into a single number", () => {
    const result = mergeCandidates([bm25("A", 8.41)], [vec("A", 0.88)]);
    // There should be no field that sums or averages the two scores
    const keys = Object.keys(result[0]);
    expect(keys).not.toContain("score");
    expect(keys).not.toContain("combinedScore");
    expect(keys).not.toContain("hybridScore");
  });

  // ── Deduplication ──────────────────────────────────────────────────────────
  it("produces no duplicate resumeIds in the output pool", () => {
    const result = mergeCandidates(
      [bm25("A", 8), bm25("B", 7), bm25("A", 6)], // malformed — A duplicated
      [vec("A", 0.9), vec("B", 0.8), vec("C", 0.7)]
    );
    const ids = result.map((c) => c.resumeId);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(mergeCandidates([], [])).toEqual([]);
  });

  it("returns only BM25 candidates when vector list is empty", () => {
    const result = mergeCandidates([bm25("A", 8), bm25("B", 7)], []);
    expect(result.map((c) => c.resumeId)).toEqual(["A", "B"]);
  });

  it("returns only vector candidates when BM25 list is empty", () => {
    const result = mergeCandidates([], [vec("X", 0.9), vec("Y", 0.8)]);
    expect(result.map((c) => c.resumeId)).toEqual(["X", "Y"]);
  });

  // ── Snippet placeholder ────────────────────────────────────────────────────
  it("initialises snippet as an empty string on every merged candidate", () => {
    const result = mergeCandidates([bm25("A", 8)], [vec("B", 0.9)]);
    for (const c of result) {
      expect(c.snippet).toBe("");
    }
  });

  // ── Skills passthrough ─────────────────────────────────────────────────────
  it("carries skills from the BM25 candidate into the merged result", () => {
    const result = mergeCandidates(
      [bm25("A", 8, ["RAG", "DeepEval"])],
      [vec("B", 0.9, ["Python"])]
    );
    expect(result.find((c) => c.resumeId === "A")!.skills).toEqual(["RAG", "DeepEval"]);
    expect(result.find((c) => c.resumeId === "B")!.skills).toEqual(["Python"]);
  });

  it("uses BM25 candidate skills when candidate appears in both lists", () => {
    // BM25 candidate has skills; vector candidate has the same id but different skills array
    const result = mergeCandidates(
      [bm25("A", 8, ["RAG"])],
      [{ resumeId: "A", skills: ["Python"], vectorScore: 0.9, sources: ["vector"] }]
    );
    // The BM25 pass seeds the pool first — its skills are authoritative
    expect(result[0].skills).toEqual(["RAG"]);
  });
});
