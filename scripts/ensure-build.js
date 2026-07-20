/**
 * scripts/ensure-build.js — prestart에서 실행
 *
 * [선택지 B 적용] GitHub Actions가 미리 빌드한 완성품(.next)이 저장소에
 * 포함되어 오는 구조로 전환됨. 완성품 마커(.next/PREBUILT)가 있으면
 * 서버에서는 빌드를 완전히 건너뛰고 즉시 기동한다.
 * → 512MB(2단계) 서버에서도 안전하게 운영 가능 (빌드 피크 799MB는 GitHub에서 처리)
 *
 * 마커가 없는 경우(과거 방식 호환)에는 기존 해시 비교 빌드 로직으로 동작:
 *   - 소스 해시 동일 + 빌드 존재 → 빌드 스킵
 *   - 해시 다름 또는 빌드 없음 → next build 실행 후 해시 기록
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── 선택지 B: GitHub Actions 완성품이 있으면 빌드 자체를 하지 않음 ──
const prebuiltMarker = path.join(".next", "PREBUILT");
const buildIdPath = path.join(".next", "BUILD_ID");

if (fs.existsSync(prebuiltMarker) && fs.existsSync(buildIdPath)) {
  const info = fs.readFileSync(prebuiltMarker, "utf8").trim();
  console.log(`[ensure-build] GitHub Actions 완성품 감지 (${info}) — 서버 빌드 생략, 즉시 기동`);
  process.exit(0);
}

// ── 이하 기존 로직 (완성품 마커가 없을 때만 동작) ──
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
