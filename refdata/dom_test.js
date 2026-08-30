/* DOM-based integration verification: asserts page text content only.
   No screenshots / no image reading. Requires: backend :8000 up, frontend :3000 up. */
const puppeteer = require('puppeteer-core');

const FRONT = 'http://localhost:3000';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const passed = [], failed = [];

function check(name, ok, detail = '') {
  if (ok) { passed.push(name); console.log('  PASS  ' + name); }
  else { failed.push(name); console.log('  FAIL  ' + name + '  ' + String(detail).slice(0, 220)); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bodyText = (page) => page.evaluate(() => document.body.innerText);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ---------- 1. login page renders ----------
  await page.goto(FRONT + '/login', { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.auth-card', { timeout: 8000 }); } catch {}
  await sleep(500);
  const loginText = await bodyText(page);
  check('登录页渲染(中文标题)', loginText.includes('康复进展管理与数据可视化系统'), loginText.slice(0, 60));
  check('演示账号三角色chip', loginText.includes('管理员') && loginText.includes('治疗师') && loginText.includes('患者'), loginText.slice(0, 120));

  // ---------- 2. login as admin via demo chip ----------
  await page.evaluate(() => {
    [...document.querySelectorAll('button.demo-chip')].find((b) => b.innerText.trim() === '管理员').click();
  });
  try {
    await page.waitForFunction(() => location.pathname.includes('dashboard'), { timeout: 10000 });
  } catch (e) { failed.push('admin登录跳转'); console.log('  FAIL  admin登录跳转'); }
  await sleep(1500);
  const dashText = await bodyText(page);
  check('admin进入Dashboard', dashText.includes('系统概览'), dashText.slice(0, 120));
  check('admin统计卡可见', dashText.includes('患者总数') && dashText.includes('风险患者'), dashText.slice(0, 200));
  check('admin风险提醒区', /风险/.test(dashText), dashText.slice(0, 200));

  // ---------- 3. patient list ----------
  try {
    await page.evaluate(() => {
      [...document.querySelectorAll('a')].find((a) => a.innerText.includes('患者')).click();
    });
  } catch (e) { console.log('  FAIL  找不到患者导航'); failed.push('患者导航'); }
  try { await page.waitForFunction(() => location.pathname === '/patients', { timeout: 8000 }); } catch {}
  await sleep(1500);
  const listText = await bodyText(page);
  check('患者列表页', listText.includes('患者档案管理') || listText.includes('我的患者'), listText.slice(0, 80));
  check('列表含种子患者', listText.includes('张伟') && listText.includes('王芳'), listText.slice(0, 220));

  // ---------- 4. patient detail ----------
  await page.goto(FRONT + '/patients/1', { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const detText = await bodyText(page);
  check('患者详情页', detText.includes('张伟') && detText.includes('膝骨性关节炎'), detText.slice(0, 160));

  // ---------- 5. trends tab ----------
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.innerText.trim().includes('趋势'))?.click();
  });
  await sleep(2500);
  const trendText = await bodyText(page);
  const trendOK = trendText.includes('疼痛评分') || trendText.includes('疼痛') || trendText.includes('ROM');
  check('趋势Tab图表渲染', trendOK, trendText.slice(0, 200));

  // ---------- 6. prediction tab ----------
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.innerText.trim().includes('预测'))?.click();
  });
  await sleep(1500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /预测|估算/.test(b.innerText))?.click();
  });
  await sleep(6000);
  const predText = await bodyText(page);
  check('预测结果显示', /LinearRegression|R²|斜率|预计/.test(predText), predText.slice(-260));

  // ---------- 7. patient role ----------
  await page.goto(FRONT + '/login', { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.auth-card', { timeout: 8000 }); } catch {}
  await sleep(500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button.demo-chip')].find((b) => b.innerText.trim() === '患者').click();
  });
  try { await page.waitForFunction(() => location.pathname === '/dashboard', { timeout: 10000 }); } catch {}
  await sleep(2000);
  const patText = await bodyText(page);
  check('患者登录进我的进展', patText.includes('训练完成率') || patText.includes('我的进展') || patText.includes('疼痛'), patText.slice(0, 150));
  const noAdmin = await page.evaluate(() =>
    ![...document.querySelectorAll('a')].some((a) => a.innerText.includes('用户管理')));
  check('患者无用户管理菜单', noAdmin);

  await browser.close();
  console.log(`\n==== ${passed.length} passed / ${failed.length} failed ====`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });