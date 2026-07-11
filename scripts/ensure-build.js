/**
 * scripts/ensure-build.js — prestart에서 실행
 *
 * 문제: AI SPACE 서버 작업공간에 이전 배포의 .next가 남아 있어
 *       `test -d .next || next build` 방식은 코드가 바뀌어도 빌드를 건너뜀.
 *
 * 해결: 소스 파일 전체의 해시를 계산해 .next/.source-hash 와 비교.
 *       - 해시 동일 + 빌드 존재 → 빌드 스킵 (즉시 기동, 재시작 빠름)
 *       - 해시 다름 또는 빌드 없음 → next build 실행 후 해시 기록
 *
 * 빌드 대상에 포함되는 소스: app/ components/ lib/ types/ 와 루트 설정 파일들.
 * 새 소스 디렉토리를 추가하면 아래 TARGETS에도 추가할 것.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TARGETS = [
  "app",
  "components",
  "lib",
  "types",
  "middleware.ts",
  "next.config.ts",
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
];

function collectFiles(p, acc) {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p).sort()) {
      collectFiles(path.join(p, name), acc);
    }
  } else {
    acc.push(p);
  }
}

function computeSourceHash() {
  const files = [];
  for (const t of TARGETS) collectFiles(t, files);
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(f);
    h.update("\0");
    h.update(fs.readFileSync(f));
    h.update("\0");
  }
  return h.digest("hex");
}

const markerPath = path.join(".next", ".source-hash");
const buildIdPath = path.join(".next", "BUILD_ID");

const currentHash = computeSourceHash();
const prevHash = fs.existsSync(markerPath)
  ? fs.readFileSync(markerPath, "utf8").trim()
  : null;
const hasBuild = fs.existsSync(buildIdPath);

if (hasBuild && prevHash === currentHash) {
  console.log("[ensure-build] 소스 변경 없음 — 빌드 스킵, 즉시 기동");
  process.exit(0);
}

console.log(
  `[ensure-build] ${hasBuild ? (prevHash ? "소스 변경 감지" : "해시 마커 없음(최초 전환)") : "빌드 산출물 없음"} — next build 실행`
);
const startedAt = Date.now();
execSync("npx next build", { stdio: "inherit" });
fs.writeFileSync(markerPath, currentHash);
console.log(
  `[ensure-build] 빌드 완료 (${Math.round((Date.now() - startedAt) / 1000)}초) — 해시 기록 후 기동`
);
