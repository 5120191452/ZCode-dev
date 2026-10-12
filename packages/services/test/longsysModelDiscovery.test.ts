import type { ApiClient } from "@zcode/shared";
import { describe, expect, it, vi } from "vitest";
import {
  LONGSYS_MODELS_URL,
  discoverLongsysModelIds,
} from "../src/model-provider/longsysModelDiscovery.js";

describe("Longsys model discovery", () => {
  it("使用固定端点和 Bearer Key，并按返回顺序清洗模型 ID", async () => {
    const request = vi.fn(async () =>
      Response.json({
        object: "list",
        data: [
          { id: " GLM-5.3-Flash ", object: "model" },
          { id: "Default_coder", object: "model" },
          { id: "GLM-5.3-Flash", object: "model" },
          { id: " ", object: "model" },
        ],
      }),
    );

    await expect(
      discoverLongsysModelIds({ request } satisfies ApiClient, "test-key"),
    ).resolves.toEqual(["GLM-5.3-Flash", "Default_coder"]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      LONGSYS_MODELS_URL,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it.each([
    new Response('{"message":"test-key rejected"}', { status: 401 }),
    Response.json({ data: [] }),
    Response.json({ models: [{ id: "unexpected" }] }),
  ])("失败信息不回显 API Key，且不接受空或非标准模型列表", async (response) => {
    const apiClient: ApiClient = { request: vi.fn(async () => response) };

    const failure = await discoverLongsysModelIds(apiClient, "test-key").catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).not.toContain("test-key");
  });
});
