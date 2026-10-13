import { describe, expect, it, vi } from "vitest";

// 模拟未配置内网依赖源的构建环境（例如开源构建）：内网地址解析抛错。
vi.mock("../../../scripts/intranetDefaults.mjs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveIntranetDepsBaseUrl: () => {
    throw new Error("Configure ZCODE_DEPS_BASE_URL or INTRANET_MACHINE_HOST");
  },
}));

const {
  OFFICIAL_ELECTRON_BUILDER_BINARIES_MIRROR,
  assertPackagingHostPrerequisites,
  resolveElectronBuilderBinariesMirror,
} = await import("../scripts/bundle.mjs");

describe("未配置内网依赖源时的 electron-builder binaries 镜像", () => {
  it("回退到官方 release 下载地址，打包不因内网地址缺失而失败", () => {
    expect(resolveElectronBuilderBinariesMirror({})).toBe(
      OFFICIAL_ELECTRON_BUILDER_BINARIES_MIRROR,
    );
  });

  it("显式配置的镜像仍然优先", () => {
    expect(
      resolveElectronBuilderBinariesMirror({
        ELECTRON_BUILDER_BINARIES_MIRROR: "https://example.test/electron-builder-binaries/",
      }),
    ).toBe("https://example.test/electron-builder-binaries/");
  });
});

describe("Windows 交叉打包宿主检查", () => {
  it("Linux 缺少 wine/wine64 时在耗时构建前给出可执行提示", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        commandAvailable: () => false,
      }),
    ).toThrow(/Wine.*sudo apt install wine64.*Windows.*runner/is);
  });

  it("wine 或 wine64 任一可用即可继续交叉打包", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        commandAvailable: (command: string) => command === "wine64",
      }),
    ).not.toThrow();
  });

  it("Windows 原生构建和 dry-run 不要求 Wine", () => {
    const commandAvailable = vi.fn(() => false);

    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "win32",
        commandAvailable,
      }),
    ).not.toThrow();
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        dryRun: true,
        commandAvailable,
      }),
    ).not.toThrow();
    expect(commandAvailable).not.toHaveBeenCalled();
  });
});
