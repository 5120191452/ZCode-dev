import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfigFromFile } from "vite";

describe("web-share Vite config", () => {
  it("只将 @zcode/shared 包根映射到源码，不吞掉 package exports 子路径", async () => {
    const webShareRoot = resolve(import.meta.dirname, "..");
    const result = await loadConfigFromFile(
      {
        command: "build",
        mode: "production",
        isPreview: false,
        isSsrBuild: false,
      },
      resolve(webShareRoot, "vite.config.ts"),
      webShareRoot,
      "silent",
    );

    const aliases = result?.config.resolve?.alias;
    expect(Array.isArray(aliases)).toBe(true);
    if (!Array.isArray(aliases)) {
      return;
    }

    const sharedRootAlias = aliases.find(
      (alias) =>
        alias.find instanceof RegExp && alias.find.test("@zcode/shared"),
    );
    expect(sharedRootAlias).toBeDefined();
    if (!sharedRootAlias) {
      return;
    }
    expect(
      (sharedRootAlias.find as RegExp).test("@zcode/shared/mcp-apps"),
    ).toBe(false);
  });
});
