#!/usr/bin/env node

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Icns, IcnsImage } from "@fiahfy/icns";
import { Jimp, ResizeStrategy } from "jimp";

const workspaceRoot = resolve(import.meta.dirname, "..");
const masterPath = resolve(workspaceRoot, "public/logo/brand-logo.png");
const iconSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const androidLauncherDensities = [
  { qualifier: "mdpi", legacySize: 48, adaptiveSize: 108 },
  { qualifier: "hdpi", legacySize: 72, adaptiveSize: 162 },
  { qualifier: "xhdpi", legacySize: 96, adaptiveSize: 216 },
  { qualifier: "xxhdpi", legacySize: 144, adaptiveSize: 324 },
  { qualifier: "xxxhdpi", legacySize: 192, adaptiveSize: 432 },
];
const sourceFlagIndex = process.argv.indexOf("--source");
const suppliedSource = sourceFlagIndex >= 0 ? process.argv[sourceFlagIndex + 1] : undefined;

function readPngMetadata(bytes, label) {
  if (bytes.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${label} is not a PNG file`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes.readUInt8(24),
    colorType: bytes.readUInt8(25),
  };
}

async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function copyTo(source, targets) {
  for (const target of targets) {
    await ensureParent(target);
    await copyFile(source, target);
  }
}

async function renderPng(source, target, size) {
  const image = await Jimp.read(source);
  image.resize({ w: size, h: size, mode: ResizeStrategy.BICUBIC });
  await writeFile(target, await image.getBuffer("image/png"));
}

async function renderPaddedPng(source, target, size, contentRatio) {
  const contentSize = Math.round(size * contentRatio);
  const offset = Math.floor((size - contentSize) / 2);
  const image = await Jimp.read(source);
  image.resize({ w: contentSize, h: contentSize, mode: ResizeStrategy.BICUBIC });
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
  canvas.composite(image, offset, offset);
  await writeFile(target, await canvas.getBuffer("image/png"));
}

function createIco(images) {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize;
  for (const [index, { size, bytes }] of images.entries()) {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(bytes.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += bytes.length;
  }

  return Buffer.concat([header, ...images.map(({ bytes }) => bytes)]);
}

function createIcns(pngBySize) {
  const icns = new Icns();
  for (const [type, size] of [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
    ["ic11", 32],
    ["ic12", 64],
    ["ic13", 256],
    ["ic14", 512],
  ]) {
    icns.append(IcnsImage.fromPNG(pngBySize.get(size), type));
  }
  return icns.data;
}

async function updateInlineWebFavicon(png32) {
  const indexPath = resolve(workspaceRoot, "packages/web/index.html");
  const source = await readFile(indexPath, "utf8");
  const faviconPattern =
    /<link\b(?=[^>]*\brel="icon")(?=[^>]*\btype="image\/png")(?=[^>]*\bsizes="32x32")[^>]*\/>/u;
  if (!faviconPattern.test(source)) {
    throw new Error("packages/web/index.html is missing the managed inline favicon link");
  }
  const dataUrl = `data:image/png;base64,${png32.toString("base64")}`;
  const replacement = `<link
      rel="icon"
      type="image/png"
      href="${dataUrl}"
      sizes="32x32"
    />`;
  await writeFile(indexPath, source.replace(faviconPattern, replacement));
}

async function updateManagedHtmlLogos(png512) {
  const dataUrl = `data:image/png;base64,${png512.toString("base64")}`;
  const managedLogoPattern =
    /(<img\b(?=[^>]*\bdata-product-brand-logo\b)[^>]*\bsrc=")[^"]*("[^>]*>)/gu;
  for (const path of [
    "packages/web/index.html",
    "packages/desktop/src/renderer/index.html",
    "packages/ui/src/assets/cloud-content/weekend-plan-hero.html",
  ]) {
    const target = resolve(workspaceRoot, path);
    const source = await readFile(target, "utf8");
    managedLogoPattern.lastIndex = 0;
    if (!managedLogoPattern.test(source)) {
      throw new Error(`${path} is missing a managed product logo image`);
    }
    managedLogoPattern.lastIndex = 0;
    await writeFile(target, source.replace(managedLogoPattern, `$1${dataUrl}$2`));
  }
}

if (sourceFlagIndex >= 0 && !suppliedSource) {
  throw new Error("--source requires a PNG path");
}
if (suppliedSource) {
  await ensureParent(masterPath);
  await copyFile(resolve(suppliedSource), masterPath);
}

const master = await readFile(masterPath);
const metadata = readPngMetadata(master, masterPath);
if (
  metadata.width !== 1254 ||
  metadata.height !== 1254 ||
  metadata.bitDepth !== 8 ||
  metadata.colorType !== 6
) {
  throw new Error(
    `brand master must be a 1254x1254 8-bit RGBA PNG, received ${JSON.stringify(metadata)}`,
  );
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "zcode-product-logo-"));
try {
  const pngBySize = new Map();
  for (const size of iconSizes) {
    const generatedPath = resolve(temporaryDirectory, `${size}x${size}.png`);
    await renderPng(masterPath, generatedPath, size);
    const bytes = await readFile(generatedPath);
    const generatedMetadata = readPngMetadata(bytes, generatedPath);
    if (generatedMetadata.width !== size || generatedMetadata.height !== size) {
      throw new Error(`generated ${size}px PNG has invalid dimensions`);
    }
    pngBySize.set(size, bytes);
    await copyTo(generatedPath, [
      resolve(workspaceRoot, `public/logo/icons/${size}x${size}.png`),
      resolve(workspaceRoot, `packages/desktop/build/icons/${size}x${size}.png`),
    ]);
  }

  const png1024Path = resolve(temporaryDirectory, "1024x1024.png");
  await copyTo(png1024Path, [
    resolve(workspaceRoot, "packages/desktop/build/icon.png"),
    resolve(workspaceRoot, "packages/desktop/build/icon_windows.png"),
    resolve(workspaceRoot, "packages/desktop/build/icon_installer.png"),
    resolve(workspaceRoot, "public/icon_512@2x.png"),
  ]);

  for (const { qualifier, legacySize, adaptiveSize } of androidLauncherDensities) {
    const legacyPath = resolve(temporaryDirectory, `android-${qualifier}-launcher.png`);
    const roundPath = resolve(temporaryDirectory, `android-${qualifier}-launcher-round.png`);
    const foregroundPath = resolve(
      temporaryDirectory,
      `android-${qualifier}-launcher-foreground.png`,
    );
    await Promise.all([
      renderPng(masterPath, legacyPath, legacySize),
      renderPaddedPng(masterPath, roundPath, legacySize, 0.78),
      renderPaddedPng(masterPath, foregroundPath, adaptiveSize, 0.7),
    ]);
    const mipmapDirectory = resolve(
      workspaceRoot,
      `packages/android/app/src/main/res/mipmap-${qualifier}`,
    );
    await copyTo(legacyPath, [resolve(mipmapDirectory, "ic_launcher.png")]);
    await copyTo(roundPath, [resolve(mipmapDirectory, "ic_launcher_round.png")]);
    await copyTo(foregroundPath, [resolve(mipmapDirectory, "ic_launcher_foreground.png")]);
    await Promise.all([
      rm(resolve(mipmapDirectory, "ic_launcher.webp"), { force: true }),
      rm(resolve(mipmapDirectory, "ic_launcher_round.webp"), { force: true }),
    ]);
  }

  const ico = createIco(icoSizes.map((size) => ({ size, bytes: pngBySize.get(size) })));
  await Promise.all(
    [
      "packages/desktop/build/icon.ico",
      "packages/desktop/build/icon_installer.ico",
      "packages/web/public/favicon.ico",
      "public/logo/icons/icon.ico",
    ].map(async (path) => {
      const target = resolve(workspaceRoot, path);
      await ensureParent(target);
      await writeFile(target, ico);
    }),
  );

  const icns = createIcns(pngBySize);
  await Promise.all(
    [
      "packages/desktop/build/icon.icns",
      "packages/desktop/build/icon_installer.icns",
      "public/logo/icons/icon.icns",
    ].map(async (path) => {
      const target = resolve(workspaceRoot, path);
      await ensureParent(target);
      await writeFile(target, icns);
    }),
  );

  await updateInlineWebFavicon(pngBySize.get(32));
  await updateManagedHtmlLogos(pngBySize.get(512));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("[brand-logo] Product logo assets regenerated from public/logo/brand-logo.png");
