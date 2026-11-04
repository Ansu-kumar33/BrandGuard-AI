import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const databasePath = path.join(
  os.tmpdir(),
  `brandguard-stage6-${randomUUID()}.db`,
);
const runner = spawn(
  process.execPath,
  [path.join("node_modules", "@playwright", "test", "cli.js"), "test"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRANDGUARD_E2E_DATABASE_PATH: databasePath,
    },
    stdio: "inherit",
  },
);

runner.on("error", (error) => {
  console.error("Could not start Playwright:", error.message);
  process.exitCode = 1;
});

runner.on("exit", (code, signal) => {
  for (const suffix of ["", "-shm", "-wal"]) {
    const filePath = `${databasePath}${suffix}`;
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
  if (signal) {
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
