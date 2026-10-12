import { getDatabase } from "../src/config/database";
import { RetrievalValidationService } from "../src/modules/retrieval/services/RetrievalValidationService";

jest.mock("../src/config/database", () => ({
  getDatabase: jest.fn()
}));

describe("retrieval readiness", () => {
  it("reports not ready when no compatible embeddings exist", async () => {
    const countDocuments = jest.fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    jest.mocked(getDatabase).mockResolvedValue({
      collection: jest.fn().mockReturnValue({ countDocuments })
    } as never);

    await expect(new RetrievalValidationService().checkReadiness()).resolves.toMatchObject({
      ready: false,
      resumeCount: 2,
      resumesWithEmbedding: 0,
      reason: "No ingested resume embeddings are available"
    });
  });

  it("reports ready when a compatible embedding exists", async () => {
    const countDocuments = jest.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    jest.mocked(getDatabase).mockResolvedValue({
      collection: jest.fn().mockReturnValue({ countDocuments })
    } as never);

    await expect(new RetrievalValidationService().checkReadiness()).resolves.toMatchObject({
      ready: true,
      resumeCount: 1,
      resumesWithEmbedding: 1,
      embeddingModel: "mistral-embed",
      embeddingDimension: 1024
    });
  });
});