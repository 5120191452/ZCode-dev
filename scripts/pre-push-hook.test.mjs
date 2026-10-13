import { spawn } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const hookPath = join(repositoryRoot, ".husky", "pre-push");
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createCommandDirectory(commands) {
  const directory = await mkdtemp(join(tmpdir(), "zcode-pre-push-hook-"));
  temporaryDirectories.push(directory);
  for (const [name, source] of Object.entries(commands)) {
    const commandPath = join(directory, name);
    await writeFile(commandPath, `#!/usr/bin/env sh\n${source}\n`, "utf8");
    await chmod(commandPath, 0o755);
  }
  return directory;
}

async function runHook(commandDirectory) {
  return new Promise((resolveResult, reject) => {
    const child = spawn("/bin/sh", [hookPath], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: `${commandDirectory}:/usr/bin:/bin`,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolveResult({ code, stdout, stderr });
    });
    child.stdin.end("refs/heads/main local-sha refs/heads/main remote-sha\n");
  });
}

describe("pre-push runtime selection", () => {
  it("uses pnpm directly when it is already available", async () => {
    const commandDirectory = await createCommandDirectory({
      mise: 'printf "runner=mise\\n"',
      pnpm: 'printf "runner=pnpm\\nargs=%s\\nstdin=%s\\n" "$*" "$ZCODE_PRE_PUSH_STDIN"',
    });

    const result = await runHook(commandDirectory);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("runner=pnpm");
    expect(result.stdout).not.toContain("runner=mise");
    expect(result.stdout).toContain("args=run verify:pre-push");
    expect(result.stdout).toContain("stdin=refs/heads/main local-sha");
  });

  it("falls back to mise when a non-login hook cannot find pnpm", async () => {
    const commandDirectory = await createCommandDirectory({
      mise: 'printf "runner=mise\\nargs=%s\\nstdin=%s\\n" "$*" "$ZCODE_PRE_PUSH_STDIN"',
    });

    const result = await runHook(commandDirectory);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("runner=mise");
    expect(result.stdout).toContain("args=exec -- pnpm run verify:pre-push");
    expect(result.stdout).toContain("stdin=refs/heads/main local-sha");
  });

  it("fails with an actionable message when neither pnpm nor mise is available", async () => {
    const commandDirectory = await createCommandDirectory({});

    const result = await runHook(commandDirectory);

    expect(result.code).toBe(127);
    expect(result.stderr).toContain("pnpm or mise is required");
  });
});
