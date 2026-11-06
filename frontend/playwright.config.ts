import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const pythonCandidates = [
  process.env.BRANDGUARD_TEST_PYTHON,
  path.resolve("../backend/.venv/Scripts/python.exe"),
  path.resolve("../.venv-1/Scripts/python.exe"),
  path.resolve("../.venv/Scripts/python.exe"),
].filter((candidate): candidate is string => Boolean(candidate));
const pythonExecutable =
  pythonCandidates.find((candidate) => existsSync(candidate)) ?? "python";
const databasePath = path.join(
  os.tmpdir(),
  `brandguard-stage6-${randomUUID()}.db`,
);
const e2eDatabasePath =
  process.env.BRANDGUARD_E2E_DATABASE_PATH ?? databasePath;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        `"${pythonExecutable}" -m uvicorn main:app --host 127.0.0.1 --port 8000`,
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        BRANDGUARD_DATABASE_PATH: e2eDatabasePath,
        GROQ_API_KEY: "",
        JWT_SECRET_KEY:
          "playwright-test-secret-key-that-is-at-least-thirty-two-characters",
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: "30",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
