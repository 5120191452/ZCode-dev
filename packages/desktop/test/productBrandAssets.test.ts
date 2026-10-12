import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const iconSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024] as const;

function readWorkspaceFile(path: string): Buffer {
  return readFileSync(resolve(root, path));
}

function readPngSize(path: string): { width: number; height: number } {
  const bytes = readWorkspaceFile(path);
  expect(bytes.subarray(1, 4).toString("ascii"), path).toBe("PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readIcoSizes(path: string): number[] {
  const bytes = readWorkspaceFile(path);
  expect(bytes.readUInt16LE(0), path).toBe(0);
  expect(bytes.readUInt16LE(2), path).toBe(1);
  const count = bytes.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const value = bytes.readUInt8(6 + index * 16);
    return value === 0 ? 256 : value;
  });
}

function readIcnsTypes(path: string): string[] {
  const bytes = readWorkspaceFile(path);
  expect(bytes.subarray(0, 4).toString("ascii"), path).toBe("icns");
  const types: string[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    types.push(bytes.subarray(offset, offset + 4).toString("ascii"));
    offset += bytes.readUInt32BE(offset + 4);
  }
  expect(offset, path).toBe(bytes.length);
  return types;
}

describe("product brand assets", () => {
  it("keeps the user-supplied RGBA master byte-for-byte", () => {
    const master = readWorkspaceFile("public/logo/brand-logo.png");
    expect(readPngSize("public/logo/brand-logo.png")).toEqual({ width: 1254, height: 1254 });
    expect(sha256(master)).toBe("d900a1fca22acfa48c8afb019b200f5c9182a27e056f528cb467a25f61cb2df9");
  });

  it("keeps public and Desktop PNG projections synchronized", () => {
    for (const size of iconSizes) {
      const publicPath = `public/logo/icons/${size}x${size}.png`;
      const desktopPath = `packages/desktop/build/icons/${size}x${size}.png`;
      expect(readPngSize(publicPath), publicPath).toEqual({ width: size, height: size });
      expect(readWorkspaceFile(desktopPath), desktopPath).toEqual(readWorkspaceFile(publicPath));
    }

    const desktop1024 = readWorkspaceFile("packages/desktop/build/icons/1024x1024.png");
    for (const path of [
      "packages/desktop/build/icon.png",
      "packages/desktop/build/icon_windows.png",
      "packages/desktop/build/icon_installer.png",
      "public/icon_512@2x.png",
    ]) {
      expect(readWorkspaceFile(path), path).toEqual(desktop1024);
    }
  });

  it("packages synchronized ICO and ICNS projections for every consumer", () => {
    const ico = readWorkspaceFile("packages/desktop/build/icon.ico");
    expect(readIcoSizes("packages/desktop/build/icon.ico")).toEqual([16, 24, 32, 48, 64, 128, 256]);
    for (const path of [
      "packages/desktop/build/icon_installer.ico",
      "packages/web/public/favicon.ico",
      "public/logo/icons/icon.ico",
    ]) {
      expect(readWorkspaceFile(path), path).toEqual(ico);
    }

    const icns = readWorkspaceFile("packages/desktop/build/icon.icns");
    expect(readIcnsTypes("packages/desktop/build/icon.icns")).toEqual(
      expect.arrayContaining(["icp4", "icp5", "icp6", "ic07", "ic08", "ic09", "ic10"]),
    );
    for (const path of [
      "packages/desktop/build/icon_installer.icns",
      "public/logo/icons/icon.icns",
    ]) {
      expect(readWorkspaceFile(path), path).toEqual(icns);
    }
  });

  it("generates Android legacy, round, and adaptive launcher projections", () => {
    for (const { qualifier, legacySize, adaptiveSize } of [
      { qualifier: "mdpi", legacySize: 48, adaptiveSize: 108 },
      { qualifier: "hdpi", legacySize: 72, adaptiveSize: 162 },
      { qualifier: "xhdpi", legacySize: 96, adaptiveSize: 216 },
      { qualifier: "xxhdpi", legacySize: 144, adaptiveSize: 324 },
      { qualifier: "xxxhdpi", legacySize: 192, adaptiveSize: 432 },
    ]) {
      const directory = `packages/android/app/src/main/res/mipmap-${qualifier}`;
      expect(readPngSize(`${directory}/ic_launcher.png`)).toEqual({
        width: legacySize,
        height: legacySize,
      });
      expect(readPngSize(`${directory}/ic_launcher_round.png`)).toEqual({
        width: legacySize,
        height: legacySize,
      });
      expect(readPngSize(`${directory}/ic_launcher_foreground.png`)).toEqual({
        width: adaptiveSize,
        height: adaptiveSize,
      });
      expect(existsSync(resolve(root, `${directory}/ic_launcher.webp`))).toBe(false);
      expect(existsSync(resolve(root, `${directory}/ic_launcher_round.webp`))).toBe(false);
    }

    for (const path of [
      "packages/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
      "packages/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
    ]) {
      const source = readWorkspaceFile(path).toString("utf8");
      expect(source, path).toContain("@mipmap/ic_launcher_foreground");
      expect(source, path).toContain("@color/product_logo_transparent");
      expect(source, path).not.toContain("<monochrome");
    }
  });

  it("does not overwrite separately owned Z.AI Provider branding", () => {
    expect(
      readWorkspaceFile("packages/ui/src/assets/provider-icons/model-provider-zai-app.png"),
    ).not.toEqual(readWorkspaceFile("packages/desktop/build/icons/128x128.png"));
  });

  it("removes retired inline Z glyphs from first-party brand surfaces", () => {
    for (const path of [
      "packages/ui/src/components/ui/ZCodeAboutLogo.tsx",
      "packages/ui/src/root/RootStartupLoading.tsx",
      "packages/ui/src/v4/ConversationDraftEmptyState.tsx",
      "packages/desktop/src/main/aboutWindow.ts",
      "packages/desktop/src/renderer/index.html",
      "packages/web/index.html",
      "packages/ui/src/assets/cloud-content/weekend-plan-hero.html",
    ]) {
      const source = readWorkspaceFile(path).toString("utf8");
      expect(source, path).not.toContain('viewBox="0 0 256 218"');
      expect(source, path).not.toContain("M134.4 0.130152");
      expect(source, path).not.toContain("PRODUCT_BRAND_LOGO_MANAGED");
    }
  });

  it("does not use Provider branding for product chrome", () => {
    for (const path of [
      "packages/ui/src/App.tsx",
      "packages/ui/src/WindowsTopLeftLogo.tsx",
      "packages/ui/src/WorkspaceSidebar/WorkspaceSidebarCollapsedRail.tsx",
    ]) {
      const source = readWorkspaceFile(path).toString("utf8");
      expect(source, path).toContain("ZCodeAboutLogo");
      expect(source, path).not.toContain("provider-icons/logo-zai.svg");
    }
  });
});
