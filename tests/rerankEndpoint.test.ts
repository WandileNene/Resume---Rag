import request from "supertest";
import { app } from "../src/app";
import { LLMService } from "../src/modules/retrieval/services/LLMService";

describe("rerank endpoint", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reranks a validated set of candidates and returns model + ranking", async () => {
    jest.spyOn(LLMService.prototype, "rerankCandidates").mockResolvedValue({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      results: [
        {
          resumeId: "candidate-b",
          rank: 1,
          relevanceScore: 0.96,
          reason: "Strong fit"
        },
        {
          resumeId: "candidate-a",
          rank: 2,
          relevanceScore: 0.84,
          reason: "Good fit"
        }
      ]
    });

    const response = await request(app)
      .post("/v1/search/rerank")
      .send({
        query: "Need a senior QA architect with RAG and MCP experience",
        candidates: [
          { resumeId: "candidate-a", snippet: "QA automation and governance" },
          { resumeId: "candidate-b", snippet: "RAG, DeepEval, MCP and enterprise governance" }
        ],
        topK: 2
      })
      .expect(200);

    expect(response.body.model).toBe("meta-llama/llama-4-scout-17b-16e-instruct");
    expect(response.body.results[0].resumeId).toBe("candidate-b");
    expect(response.body.results[1].resumeId).toBe("candidate-a");
  });

  it("rejects malformed rerank payloads", async () => {
    const response = await request(app)
      .post("/v1/search/rerank")
      .send({
        query: "",
        candidates: [{ resumeId: "", snippet: "" }],
        topK: 0
      })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_RERANK_REQUEST");
    expect(response.body.success).toBe(false);
  });
});
