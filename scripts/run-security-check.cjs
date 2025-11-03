#!/usr/bin/env node
/**
 * Cross-platform security checklist used by `npm run security:check`.
 * Mirrors the behaviour of the original PowerShell script without
 * requiring a specific shell, so it works on macOS, Linux and Windows.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
let errorCount = 0;

const COLOR = {
  reset: "\u001b[0m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m",
};

const supportsColor = process.stdout.isTTY;
const colorize = (value, color) =>
  supportsColor && COLOR[color] ? `${COLOR[color]}${value}${COLOR.reset}` : value;

const logSection = (title) => {
  console.log(`\n== ${title} ==`);
};

const runCommand = (command, args, options = {}) =>
  spawnSync(command, args, {
    encoding: "utf-8",
    shell: process.platform === "win32",
    ...options,
  });

const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
};

console.log(colorize("Security checks in progress...", "cyan"));

// 1. npm audit (moderate)
logSection("1. Checking for known vulnerabilities");
const auditResult = runCommand("npm", ["audit", "--audit-level=moderate"]);

if (auditResult.status === 0) {
  console.log(colorize("No known vulnerabilities detected.", "green"));
} else {
  errorCount += 1;
  console.log(colorize("Vulnerabilities were reported:", "red"));
  if (auditResult.stdout) {
    console.log(auditResult.stdout.trim());
  }
  if (auditResult.stderr) {
    console.log(auditResult.stderr.trim());
  }
}

// 2. npm outdated
logSection("2. Checking for outdated packages");
const outdatedResult = runCommand("npm", ["outdated", "--json"]);

if (outdatedResult.error) {
  errorCount += 1;
  console.log(colorize("Failed to run npm outdated:", "red"));
  console.log(outdatedResult.error.message);
} else {
  const stdout = (outdatedResult.stdout || "").trim();
  if (!stdout) {
    if (outdatedResult.status && outdatedResult.status !== 0) {
      errorCount += 1;
      console.log(colorize("npm outdated did not complete successfully.", "red"));
      if (outdatedResult.stderr) {
        console.log(outdatedResult.stderr.trim());
      }
    } else {
      console.log(colorize("All packages are up to date.", "green"));
    }
  } else {
    try {
      const outdated = JSON.parse(stdout);
      const pkgJson = readJSON(path.join(projectRoot, "package.json"));
      const depTypes = {
        prod: new Set(Object.keys(pkgJson?.dependencies || {})),
        dev: new Set(Object.keys(pkgJson?.devDependencies || {})),
        optional: new Set(Object.keys(pkgJson?.optionalDependencies || {})),
      };

      const entries = Object.entries(outdated);
      if (entries.length === 0) {
        console.log(colorize("All packages are up to date.", "green"));
      } else {
        console.log(colorize("Some packages are outdated:", "yellow"));
        entries.forEach(([name, info]) => {
          let type = "unknown";
          if (depTypes.prod.has(name)) type = "prod";
          else if (depTypes.dev.has(name)) type = "dev";
          else if (depTypes.optional.has(name)) type = "optional";

          console.log(
            ` - ${name} [${type}] ${info.current} -> ${info.wanted} (latest: ${info.latest})`,
          );
        });
        console.log("   Tip: run `npm update` to refresh dependencies.");
      }
    } catch (error) {
      errorCount += 1;
      console.log(colorize("Unable to parse npm outdated output.", "red"));
      console.log(stdout);
    }
  }
}

// 3. Scan for secrets
logSection("3. Scanning for exposed secrets");
const secretPatterns = [
  { name: "Google API key", source: "AIza[0-9A-Za-z-_]{35}", flags: "g" },
  { name: "OpenAI API key", source: "sk-[A-Za-z0-9]{48}", flags: "g" },
  { name: "GitHub token", source: "ghp_[A-Za-z0-9]{36}", flags: "g" },
  { name: "AWS access key", source: "AKIA[0-9A-Z]{16}", flags: "g" },
  {
    name: "Hardcoded password",
    source: "password\\s*=\\s*['\"][^'\"\\n]+['\"]",
    flags: "gi",
  },
  {
    name: "API key",
    source: "api[_-]?key\\s*=\\s*['\"][^'\"\\n]+['\"]",
    flags: "gi",
  },
];

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);
const ignoredDirs = new Set(["node_modules", "dist", "out", ".next", ".git"]);
const ignoredPathPrefixes = [path.join("electron", "dist")];

const sourceFiles = [];

const collectFiles = (currentDir, relative = "") => {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryRelative = path.join(relative, entry.name);
    const entryFull = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        return;
      }
      if (ignoredPathPrefixes.some((prefix) => entryRelative.startsWith(prefix))) {
        return;
      }
      collectFiles(entryFull, entryRelative);
      return;
    }

    if (!entry.isFile()) {
      return;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return;
    }
    if (entry.name === "package-lock.json") {
      return;
    }

    sourceFiles.push(entryFull);
  });
};

collectFiles(projectRoot);

console.log(colorize(`Scanning ${sourceFiles.length} files...`, "gray"));
let secretsFound = 0;

sourceFiles.forEach((filePath) => {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    return;
  }

  const lines = content.split(/\r?\n/);

  secretPatterns.forEach((pattern) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(content)) !== null) {
      const before = content.slice(0, match.index);
      const lineNumber = before.split(/\r?\n/).length;
      const lineText = (lines[lineNumber - 1] || "").trim();
      const relativePath = path.relative(projectRoot, filePath);

      console.log(
        colorize(
          `Potential ${pattern.name} in ${relativePath}:${lineNumber}\n   ${lineText}`,
          "red",
        ),
      );
      secretsFound += 1;
    }
  });
});

if (secretsFound === 0) {
  console.log(colorize("No hardcoded secrets detected.", "green"));
} else {
  errorCount += secretsFound;
}

// 4. Verify package-lock.json exists
logSection("4. Verifying package-lock.json presence");
if (fs.existsSync(path.join(projectRoot, "package-lock.json"))) {
  console.log(colorize("package-lock.json is present.", "green"));
} else {
  errorCount += 1;
  console.log(colorize("package-lock.json is missing!", "red"));
}

// 5. Ensure .env files are not tracked
logSection("5. Checking for tracked .env files");
const gitResult = runCommand("git", ["ls-files"]);

if (gitResult.status !== 0) {
  console.log(colorize("Unable to determine tracked files (git command failed).", "yellow"));
} else {
  const trackedFiles = gitResult.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => file.toLowerCase().endsWith(".env"));

  if (trackedFiles.length === 0) {
    console.log(colorize("No .env files tracked in git.", "green"));
  } else {
    errorCount += trackedFiles.length;
    console.log(colorize("Tracked .env files detected:", "red"));
    trackedFiles.forEach((file) => console.log(` - ${file}`));
  }
}

// 6. Confirm SECURITY.md exists
logSection("6. Checking security documentation");
if (fs.existsSync(path.join(projectRoot, "SECURITY.md"))) {
  console.log(colorize("SECURITY.md is present.", "green"));
} else {
  console.log(colorize("SECURITY.md is missing.", "yellow"));
}

console.log("\n----------------------------------------");
if (errorCount === 0) {
  console.log(colorize("All security checks passed.", "green"));
  process.exit(0);
} else {
  console.log(colorize(`Security checks failed (${errorCount} issue${
    errorCount === 1 ? "" : "s"
  }).`, "red"));
  process.exit(1);
}
