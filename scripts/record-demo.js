#!/usr/bin/env node
/**
 * Records a GIF of the askable-ui demo.
 * Captures frames via puppeteer screenshots, assembles with ffmpeg.
 *
 * Usage: node scripts/record-demo.js
 * Output: docs/demo.gif
 */

const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3456/redesign.html';
const OUT_DIR = path.join(__dirname, '../docs');
const FRAMES_DIR = path.join(__dirname, '../.gif-frames');
const OUT_GIF = path.join(OUT_DIR, 'demo.gif');
const FPS = 12;
const WIDTH = 1200;
const HEIGHT = 720;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let frameIndex = 0;
async function snap(page) {
  const file = path.join(FRAMES_DIR, `frame${String(frameIndex).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  frameIndex++;
}

async function snapFor(page, ms, intervalMs = 80) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await snap(page);
    await sleep(intervalMs);
  }
}

(async () => {
  // Clean frames dir
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: WIDTH, height: HEIGHT },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });

  // Disable smooth scrolling so nav never disappears mid-scroll
  await page.addStyleTag({ content: '* { scroll-behavior: auto !important; }' });

  // Wait for page to settle
  await snapFor(page, 700);

  // Hover over MRR card in hero — show the focus lens working
  const mrrStat = await page.$('[data-mini="revenue"]');
  await mrrStat.hover();
  await snapFor(page, 800);

  // Hover over NPS
  const npsStat = await page.$('[data-mini="nps"]');
  await npsStat.hover();
  await snapFor(page, 700);

  // Hover over Upsell
  const upsellStat = await page.$('[data-mini="upsell"]');
  await upsellStat.hover();
  await snapFor(page, 600);

  // Instant scroll to demo section, then wait for layout to settle
  await page.evaluate(() => {
    document.getElementById('demo').scrollIntoView();
  });
  await sleep(200); // let sticky nav re-paint
  await snapFor(page, 600);

  // Click MRR KPI card
  const kpiCards = await page.$$('.kpi-card');
  if (kpiCards[0]) {
    await kpiCards[0].click();
    await snapFor(page, 1100);
  }

  // Click churn card
  if (kpiCards[1]) {
    await kpiCards[1].click();
    await snapFor(page, 1000);
  }

  // Click Globex row
  const rows = await page.$$('tbody tr[data-askable]');
  if (rows[1]) {
    await rows[1].click();
    await snapFor(page, 1100);
  }

  // Click Umbrella row
  if (rows[3]) {
    await rows[3].click();
    await snapFor(page, 900);
  }

  // Type a question in the chat
  const input = await page.$('#chat-input');
  await input.click();
  await snapFor(page, 300);
  await page.type('#chat-input', 'Which account is at risk?', { delay: 60 });
  await snapFor(page, 400);
  await page.keyboard.press('Enter');
  await snapFor(page, 2000);

  // Freeze on last frame
  await snapFor(page, 600, 80);

  await browser.close();

  console.log(`Captured ${frameIndex} frames. Encoding GIF…`);

  // Use ffmpeg: frames → palette → GIF
  const palette = path.join(FRAMES_DIR, 'palette.png');
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame%05d.png" -vf "fps=${FPS},scale=1200:-1:flags=lanczos,palettegen=stats_mode=diff" "${palette}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame%05d.png" -i "${palette}" -lavfi "fps=${FPS},scale=1200:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${OUT_GIF}"`,
    { stdio: 'inherit' }
  );

  // Cleanup frames
  fs.rmSync(FRAMES_DIR, { recursive: true });

  const size = (fs.statSync(OUT_GIF).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓ GIF saved to ${OUT_GIF} (${size} MB)`);
})().catch(err => { console.error(err); process.exit(1); });
