import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";

const ctx = {
  req: {} as any,
  res: {} as any,
  user: { id: 1, role: "admin" } as any,
};

function base64Of(bytes: number[]): string {
  const buf = Buffer.from(bytes);
  return buf.toString("base64");
}

describe("Files upload", () => {
  it("rejects mismatched MIME", async () => {
    const caller = appRouter.createCaller(ctx as any);
    await expect(
      caller.files.upload({
        entityType: "forms",
        entityId: 1,
        fileName: "test.png",
        mimeType: "image/png",
        fileData: base64Of([0x25, 0x50, 0x44, 0x46]) // %PDF
      })
    ).rejects.toHaveProperty("code", "BAD_REQUEST");
  });

  it("accepts valid PNG header", async () => {
    const caller = appRouter.createCaller(ctx as any);
    const res = await caller.files.upload({
      entityType: "forms",
      entityId: 1,
      fileName: "test.png",
      mimeType: "image/png",
      fileData: base64Of([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    });
    expect(res).toHaveProperty("success", true);
    expect(typeof res.url).toBe("string");
  });
});
