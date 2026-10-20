#!/usr/bin/env node
// 一行指令截圖：建置 → 啟動 server（dist）→ Playwright 拍各分頁與主要彈窗（手機／手機橫向／平板／電腦）。
// 用法：npm run screenshot -- [--out 資料夾] [--tab overview,swing] [--no-build] [--no-modals] [--viewport phone,desktop] [--vite-preview]
// 此檔位於 scripts/，不在 index.html 的依賴圖內，不會被 vite 打包進 APP。
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VIEWPORTS = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'phone-landscape': { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

// 分頁 id 對應 Header.tsx；modal 為各分頁可開啟的主要彈窗（opener 以可見文字／role 定位）。
const TABS = {
  overview: { label: '總覽概況', modals: { quote: (p) => p.getByRole('button', { name: '最新報價' }).first().click() } },
  intelligence: {
    label: '客觀趨勢情報中心',
    modals: { signal: (p) => p.locator('button.w-full.text-left').first().click() },
  },
  radar: { label: '四象限基本面雷達', modals: {} },
  swing: { label: '波段觀察', modals: { 'stock-chart': (p) => p.locator('td button[title^="看即時價"]').first().click() } },
  dividends: { label: '股利入帳與達標試算', modals: {} },
};

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);
const list = (v, all) => (v ? v.split(',').map((s) => s.trim()) : all);

const outDir = resolve(opt('out') ?? 'screenshots');
// intelligence 分頁暫時下架（src/config/features.ts），預設不拍；重新上架後把它加回預設清單。
const tabs = list(opt('tab'), Object.keys(TABS).filter((t) => t !== 'intelligence'));
const vps = list(opt('viewport'), Object.keys(VIEWPORTS));
for (const t of tabs) if (!TABS[t]) die(`未知分頁 ${t}，可用：${Object.keys(TABS).join(', ')}`);
for (const v of vps) if (!VIEWPORTS[v]) die(`未知尺寸 ${v}，可用：${Object.keys(VIEWPORTS).join(', ')}`);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function loadPlaywright() {
  const roots = [process.cwd() + '/', '/node-tools/', ...(process.env.NODE_PATH ?? '').split(':').filter(Boolean).map((p) => p + '/')];
  for (const root of roots) {
    for (const name of ['playwright', 'playwright-core']) {
      try {
        return createRequire(root)(name);
      } catch {}
    }
  }
  const g = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout.trim();
  try {
    return createRequire(g + '/')('playwright');
  } catch {}
  die('找不到 playwright（雲端環境應已內建於 npm 全域目錄）；可執行 npm i --no-save playwright');
}

function chromiumPath() {
  const cands = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'];
  return cands.find((p) => p && existsSync(p));
}

const PORT = Number(opt('port') ?? (flag('vite-preview') ? 4173 : 3000)); // server.ts 固定聽 3000
const base = `http://127.0.0.1:${PORT}`;

if (!flag('no-build')) {
  const b = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit' });
  if (b.status !== 0) die('vite build 失敗');
}
// 用正式模式的 server.ts（靜態 dist + /api 代理），彈窗才有資料；--vite-preview 改用純 vite preview。
const server = flag('vite-preview')
  ? spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  : spawn('npx', ['tsx', 'server.ts'], { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
const stop = () => server.kill();
process.on('exit', stop);
process.on('SIGINT', () => process.exit(130));

for (let i = 0; ; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  if (i > 60) die('server 啟動逾時');
  await new Promise((r) => setTimeout(r, 500));
}

const { chromium } = loadPlaywright();
const executablePath = chromiumPath();
const browser = await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox'] } : {});
mkdirSync(outDir, { recursive: true });
const shots = [];
const failures = [];

for (const vp of vps) {
  const ctx = await browser.newContext({ viewport: { width: VIEWPORTS[vp].width, height: VIEWPORTS[vp].height }, ...VIEWPORTS[vp] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' }).catch(() => {});
  for (const t of tabs) {
    const { label, modals } = TABS[t];
    try {
      await page.getByRole('button', { name: label }).first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(800);
      const f = join(outDir, `${t}-${vp}.png`);
      await page.screenshot({ path: f, fullPage: true });
      shots.push(f);
    } catch (e) {
      failures.push(`${t}-${vp}: ${e.message.split('\n')[0]}`);
      continue;
    }
    if (flag('no-modals')) continue;
    for (const [name, open] of Object.entries(modals)) {
      try {
        await open(page);
        await page.waitForSelector('[role="dialog"], .fixed.inset-0', { timeout: 5000 });
        await page.waitForTimeout(800);
        const f = join(outDir, `${t}-${name}-${vp}.png`);
        await page.screenshot({ path: f });
        shots.push(f);
      } catch (e) {
        failures.push(`${t}-${name}-${vp}: ${e.message.split('\n')[0]}`);
      }
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '關閉' }).first().click({ timeout: 500 }).catch(() => {});
      await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
      await page.getByRole('button', { name: label }).first().click().catch(() => {});
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`已輸出 ${shots.length} 張截圖到 ${outDir}`);
shots.forEach((s) => console.log(' ', s));
if (failures.length) {
  console.error(`有 ${failures.length} 張失敗：`);
  failures.forEach((f) => console.error('  ', f));
  process.exitCode = 1;
}
stop();
process.exit(process.exitCode ?? 0);
