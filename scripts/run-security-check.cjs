#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

const isCI = Boolean(process.env.CI);
const pwsh = "pwsh";
const scriptPath = path.resolve(__dirname, "security-check.ps1");
const policy = isCI ? "Bypass" : "RemoteSigned";

const args = [
  "-NoProfile",
  "-ExecutionPolicy",
  policy,
  "-File",
  scriptPath,
];

const child = spawn(pwsh, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("Failed to run security check:", error);
  process.exit(1);
});
