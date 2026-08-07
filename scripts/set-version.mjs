import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkgPath = resolve(root, "package.json");
const versionFilePath = resolve(root, ".next-version");

function getLatestTag() {
  try {
    const tag = execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
    return tag.replace(/^v/, "");
  } catch {
    return null;
  }
}

function getCurrentPkgVersion() {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

function resolveVersion() {
  const envVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  if (envVersion) return envVersion;

  const tagVersion = getLatestTag();
  if (tagVersion) return tagVersion;

  return getCurrentPkgVersion();
}

const version = resolveVersion();

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[set-version] package.json updated: ${version}`);
} else {
  console.log(`[set-version] version unchanged: ${version}`);
}

writeFileSync(versionFilePath, version, "utf-8");