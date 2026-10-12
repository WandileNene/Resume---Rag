import { ObjectId } from "mongodb";
import { getDatabase } from "../src/config/database";
import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";

jest.mock("../src/config/database", () => ({
  getDatabase: jest.fn()
}));

describe("retrieval resume repository", () => {
  it("fetches a candidate snippet by MongoDB id without mutating data", async () => {
    const id = new ObjectId("507f1f77bcf86cd799439011");
    const findOne = jest.fn().mockResolvedValue({
      _id: id,
      name: "Jordan Example",
      role: "Test Engineer",
      skills: ["Python"],
      rawText: "Resume text"
    });
    jest.mocked(getDatabase).mockResolvedValue({
      collection: jest.fn().mockReturnValue({ findOne })
    } as never);

    const result = await new ResumeRepository().findById(id.toHexString());

    expect(result).toMatchObject({
      resumeId: id.toHexString(),
      name: "Jordan Example",
      rawText: "Resume text",
      skills: ["Python"]
    });
    expect(findOne).toHaveBeenCalledWith(
      { _id: id },
      { projection: expect.any(Object) }
    );
  });

  it("builds BM25 and vector read pipelines", async () => {
    const toArray = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const aggregate = jest.fn().mockReturnValue({ toArray });
    jest.mocked(getDatabase).mockResolvedValue({
      collection: jest.fn().mockReturnValue({ aggregate })
    } as never);

    const repository = new ResumeRepository();
    await repository.searchBm25("RAG architect", 10, { minYearsExperience: 10 });
    await repository.searchVector([0.1, 0.2], 10, { minYearsExperience: 10 });

    expect(aggregate).toHaveBeenCalledTimes(2);
    expect(aggregate.mock.calls[0][0][0].$search.text.path).toEqual([
      "rawText",
      "skills",
      "jobTitles",
      "experienceSummary",
      "role",
      "company"
    ]);
    // Vector pipeline: $vectorSearch has no inline filter; experience filtering
    // is applied as a subsequent $match stage so it works without a special
    // Atlas filter index configuration.
    const vectorPipeline = aggregate.mock.calls[1][0];
    expect(vectorPipeline[0].$vectorSearch.filter).toBeUndefined();
    const matchStage = vectorPipeline.find((stage: Record<string, unknown>) => "$match" in stage);
    expect(matchStage).toEqual({ $match: { totalExperience: { $gte: 10 } } });
  });
});