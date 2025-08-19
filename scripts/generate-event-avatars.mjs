import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const OUTPUT_DIR = path.resolve(process.cwd(), "public", "upload");
const SIZE = 512;

function svgBase({ bg, elements }) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="32" ry="32" fill="${bg}"/>
  <rect x="0" y="0" width="${SIZE}" height="${
    SIZE / 2
  }" rx="32" ry="32" fill="url(#gloss)"/>
  ${elements}
</svg>`);
}

// Simple icon-like illustrations per event type (no text)
function sceneSummer({ primary = "#ffffff", accent = "#000000" } = {}) {
  const rays = Array.from({ length: 12 })
    .map((_, i) => {
      const angle = (i * Math.PI * 2) / 12;
      const x1 = 360 + Math.cos(angle) * 100;
      const y1 = 180 + Math.sin(angle) * 100;
      const x2 = 360 + Math.cos(angle) * 130;
      const y2 = 180 + Math.sin(angle) * 130;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${primary}" stroke-width="10" stroke-linecap="round"/>`;
    })
    .join("");
  return `
  <g>
    <circle cx="360" cy="180" r="80" fill="${primary}" opacity="0.95"/>
    ${rays}
    <g opacity="0.9">
      <circle cx="170" cy="310" r="30" fill="${primary}"/>
      <rect x="140" y="340" width="60" height="90" rx="20" fill="${primary}"/>
      <circle cx="250" cy="330" r="26" fill="${primary}"/>
      <rect x="224" y="356" width="52" height="74" rx="18" fill="${primary}"/>
    </g>
    <rect x="80" y="430" width="352" height="24" rx="12" fill="${accent}" opacity="0.25"/>
  </g>`;
}

function sceneFoosball({ primary = "#ffffff", accent = "#111827" } = {}) {
  return `
  <g>
    <rect x="64" y="206" width="384" height="20" rx="10" fill="${accent}" opacity="0.85"/>
    <rect x="64" y="286" width="384" height="20" rx="10" fill="${accent}" opacity="0.85"/>
    ${[120, 240, 360]
      .map(
        (cx) => `
      <g>
        <circle cx="${cx}" cy="216" r="18" fill="${primary}"/>
        <rect x="${
          cx - 14
        }" y="236" width="28" height="36" rx="8" fill="${primary}"/>
      </g>`
      )
      .join("")}
    ${[180, 300]
      .map(
        (cx) => `
      <g>
        <circle cx="${cx}" cy="296" r="18" fill="${primary}"/>
        <rect x="${
          cx - 14
        }" y="316" width="28" height="36" rx="8" fill="${primary}"/>
      </g>`
      )
      .join("")}
    <rect x="80" y="420" width="352" height="28" rx="14" fill="${accent}" opacity="0.15"/>
  </g>`;
}

function sceneVaccine({ primary = "#111827", accent = "#E91E63" } = {}) {
  return `
  <g>
    <rect x="120" y="220" width="240" height="60" rx="12" fill="${primary}" opacity="0.95"/>
    <rect x="330" y="235" width="70" height="30" rx="8" fill="${primary}" opacity="0.95"/>
    <rect x="90" y="235" width="40" height="30" rx="6" fill="${primary}" opacity="0.95"/>
    <rect x="70" y="244" width="30" height="12" rx="6" fill="${primary}" opacity="0.95"/>
    <rect x="400" y="246" width="30" height="8" rx="4" fill="${primary}" opacity="0.95"/>
    <path d="M430 250 L460 250" stroke="${primary}" stroke-width="8" stroke-linecap="round"/>
    <path d="M470 258 C462 248, 462 238, 470 228 C478 238, 478 248, 470 258 Z" fill="${accent}"/>
    <g opacity="0.2">
      <rect x="140" y="232" width="40" height="36" fill="#ffffff"/>
      <rect x="200" y="232" width="40" height="36" fill="#ffffff"/>
      <rect x="260" y="232" width="40" height="36" fill="#ffffff"/>
    </g>
  </g>`;
}

function sceneParty({ primary = "#ffffff", accent = "#E91E63" } = {}) {
  const lines = Array.from({ length: 12 })
    .map((_, i) => {
      const a = (i * Math.PI * 2) / 12;
      const x1 = 256 + Math.cos(a) * 0;
      const y1 = 170 + Math.sin(a) * 0;
      const x2 = 256 + Math.cos(a) * 90;
      const y2 = 170 + Math.sin(a) * 90;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${primary}" stroke-width="8" stroke-linecap="round"/>`;
    })
    .join("");
  return `
  <g>
    <circle cx="256" cy="170" r="6" fill="${primary}"/>
    ${lines}
    ${[60, 120, 300, 360]
      .map(
        (a) =>
          `<line x1="256" y1="170" x2="${
            256 + Math.cos((a * Math.PI) / 180) * 110
          }" y2="${
            170 + Math.sin((a * Math.PI) / 180) * 110
          }" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>`
      )
      .join("")}
    ${[
      [100, 380],
      [180, 420],
      [320, 380],
      [380, 420],
    ]
      .map(
        ([x, y]) =>
          `<polygon points="${x},${y} ${x + 18},${y + 8} ${x + 6},${
            y + 22
          }" fill="${accent}" opacity="0.9"/>`
      )
      .join("")}
    <path d="M120 360 L200 400 L140 420 Z" fill="${primary}" opacity="0.9"/>
  </g>`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generatePng({ filename, bg, elements }) {
  const svg = svgBase({ bg, elements });
  const outPath = path.join(OUTPUT_DIR, filename);
  await sharp(svg).png({ compressionLevel: 9 }).toFile(outPath);
  return outPath;
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const tasks = [
    {
      filename: "summer-team-building.png",
      bg: "#E91E63",
      elements: sceneSummer({ primary: "#ffffff", accent: "#000000" }),
    },
    {
      filename: "table-kicker.png",
      bg: "#9CA3AF",
      elements: sceneFoosball({ primary: "#ffffff", accent: "#111827" }),
    },
    {
      filename: "vaccination.png",
      bg: "#ffffff",
      elements: sceneVaccine({ primary: "#111827", accent: "#E91E63" }),
    },
    {
      filename: "new-year-party.png",
      bg: "#000000",
      elements: sceneParty({ primary: "#ffffff", accent: "#E91E63" }),
    },
  ];

  const results = await Promise.all(tasks.map(generatePng));
  console.log("Generated avatars:\n" + results.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
