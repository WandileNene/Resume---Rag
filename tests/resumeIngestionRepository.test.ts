import { ObjectId } from "mongodb";
import { getDatabase } from "../src/config/database";
import { ResumeIngestionRepository } from "../src/modules/ingestion/repositories/ResumeIngestionRepository";

jest.mock("../src/config/database", () => ({
  getDatabase: jest.fn()
}));

describe("resume ingestion repository", () => {
  it("inserts resume metadata and embedding into the resumes collection", async () => {
    const insertOne = jest.fn().mockResolvedValue({
      insertedId: new ObjectId("507f1f77bcf86cd799439011")
    });
    jest.mocked(getDatabase).mockResolvedValue({
      collection: jest.fn().mockReturnValue({ insertOne })
    } as never);

    const resumeId = await new ResumeIngestionRepository().insertResume({
      fileName: "resume.pdf",
      resume: { name: "Jordan Example", skills: ["Python"] },
      rawText: "Resume text",
      embedding: [0.1, 0.2]
    });

    expect(resumeId).toBe("507f1f77bcf86cd799439011");
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "resume.pdf",
        rawText: "Resume text",
        skills: ["Python"],
        embedding: [0.1, 0.2],
        embeddingModel: "mistral-embed",
        embeddingDimension: 2,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    );
  });
});