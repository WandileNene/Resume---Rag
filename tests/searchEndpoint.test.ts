import request from "supertest";
import { app } from "../src/app";
import { SearchService } from "../src/modules/retrieval/services/SearchService";

describe("final search endpoint", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("runs the end-to-end search pipeline and returns final results with timings", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(SearchService.prototype, "endToEndSearch").mockResolvedValue({
      query: "Senior QA architect with RAG",
      model: "openai/gpt-oss-120b",
      results: [
        {
          rank: 1,
          resumeId: "candidate-a",
          name: "Candidate A",
          role: "QA Architect",
          company: "Example Co",
          skills: ["RAG"],
          sources: ["bm25", "vector"],
          relevanceScore: 0.96,
          reason: "Strong fit",
          summary: "Strong RAG and QA architecture fit"
        }
      ],
      degraded: false,
      warnings: [],
      timings: {
        embeddingMs: 10,
        bm25Ms: 10,
        vectorMs: 5,
        rerankMs: 20,
        summarizeMs: 15,
        totalMs: 50
      }
    });

    const response = await request(app)
      .post("/v1/search")
      .send({
        query: "Senior QA architect with RAG",
        filters: { minYearsExperience: 10 },
        options: {
          bm25TopK: 20,
          vectorTopK: 20,
          rerankTopN: 10,
          finalTopK: 5,
          summarize: true,
          summaryStyle: "short"
        }
      })
      .expect(200);

    expect(response.body.query).toBe("Senior QA architect with RAG");
    expect(response.body.results[0].resumeId).toBe("candidate-a");
    expect(response.body.degraded).toBe(false);
    expect(response.body.warnings).toEqual([]);
    expect(response.body.timings.totalMs).toBe(50);
    expect(SearchService.prototype.endToEndSearch).toHaveBeenCalledWith(
      "Senior QA architect with RAG",
      { minYearsExperience: 10 },
      {
        bm25TopK: 20,
        vectorTopK: 20,
        rerankTopN: 10,
        finalTopK: 5,
        summarize: true,
        summaryStyle: "short"
      }
    );

    const logRecord = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      requestId: string;
      endpoint: string;
      method: string;
      durationMs: number;
      statusCode: number;
      componentTimings: Record<string, number>;
    };
    expect(logRecord.requestId).toBeTruthy();
    expect(logRecord.endpoint).toBe("/v1/search");
    expect(logRecord.method).toBe("POST");
    expect(logRecord.statusCode).toBe(200);
    expect(logRecord.durationMs).toBe(50);
    expect(logRecord.componentTimings).toEqual({
      embeddingMs: 10,
      bm25Ms: 10,
      vectorMs: 5,
      rerankMs: 20,
      summarizeMs: 15
    });
  });

  it("rejects an invalid final search request", async () => {
    const response = await request(app)
      .post("/v1/search")
      .send({ query: "", options: { finalTopK: 0 } })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
    expect(response.body.success).toBe(false);
  });

  it("rejects a query longer than the configured maximum", async () => {
    const response = await request(app)
      .post("/v1/search")
      .send({ query: "x".repeat(2001) })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_SEARCH_QUERY");
  });

  it("rejects an oversized JSON request body with HTTP 413", async () => {
    const response = await request(app)
      .post("/v1/search")
      .send({ query: "QA", padding: "x".repeat(1024 * 1024) })
      .expect(413);

    expect(response.body.errorCode).toBe("REQUEST_TOO_LARGE");
    expect(response.body.success).toBe(false);
  });
});
