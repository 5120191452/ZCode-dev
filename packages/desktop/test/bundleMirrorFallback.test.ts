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
  it("Linux 缺少 Wine 时在耗时构建前给出 Wine32 安装提示", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        probeWine: () => ({ available: false, output: "" }),
      }),
    ).toThrow(/Wine.*dpkg --add-architecture i386.*wine32:i386.*Windows.*runner/is);
  });

  it("仅有 Wine64 且 wine 报告缺少 wine32 时提前失败", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        probeWine: () => ({
          available: true,
          output: "it looks like wine32 is missing, you should install it.\nwine-9.0",
        }),
      }),
    ).toThrow(/wine32:i386/is);
  });

  it("Wine prefix 无法加载 kernel32 时给出创建独立 prefix 的提示", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        probeWine: () => ({
          available: false,
          output: "wine: could not load kernel32.dll, status c0000135",
        }),
      }),
    ).toThrow(/WINEARCH=win32.*WINEPREFIX=.*wineboot --init/is);
  });

  it("Wine 具备 32 位运行能力时继续交叉打包", () => {
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        probeWine: () => ({ available: true, output: "wine-9.0" }),
      }),
    ).not.toThrow();
  });

  it("Windows 原生构建和 dry-run 不要求 Wine", () => {
    const probeWine = vi.fn(() => ({ available: false, output: "" }));

    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "win32",
        probeWine,
      }),
    ).not.toThrow();
    expect(() =>
      assertPackagingHostPrerequisites({
        targetOs: "win",
        hostPlatform: "linux",
        dryRun: true,
        probeWine,
      }),
    ).not.toThrow();
    expect(probeWine).not.toHaveBeenCalled();
  });
});
