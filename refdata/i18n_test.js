const puppeteer = require('puppeteer-core');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');
  console.log('Loaded login page');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');

  const text = () => page.evaluate(() => document.body.innerText);
  if (!(await text()).includes('Rehabilitation Progress Management')) throw new Error('English is not the default language');
  console.log('Verified English default');
  await page.click('.language-toggle button:last-child');
  if (!(await text()).includes('康复进展管理与数据可视化系统')) throw new Error('Chinese switch failed');
  console.log('Verified Chinese switch');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');
  if (!(await text()).includes('康复进展管理与数据可视化系统')) throw new Error('Language preference was not persisted');
  console.log('Verified persistence');

  await page.click('.language-toggle button:first-child');
  await page.evaluate(() => [...document.querySelectorAll('.demo-chip')].find((button) => button.textContent.trim() === 'Admin').click());
  await page.waitForFunction(() => location.pathname === '/dashboard');
  console.log('Verified login redirect');
  await page.waitForSelector('.navbar');
  if (!(await text()).includes('System Overview')) throw new Error('Authenticated interface is not in English');

  await page.setViewport({ width: 390, height: 844 });
  const layout = await page.evaluate(() => {
    const navbar = document.querySelector('.navbar').getBoundingClientRect();
    const toggle = document.querySelector('.language-toggle').getBoundingClientRect();
    return { navbarBottom: navbar.bottom, toggleBottom: toggle.bottom, toggleRight: toggle.right, viewportWidth: innerWidth };
  });
  if (layout.toggleRight > layout.viewportWidth || layout.toggleBottom > layout.navbarBottom) throw new Error('Mobile language control overflows the navigation bar');

  console.log('PASS: default English, Chinese switching, persistence, authenticated navigation, and mobile layout');
  await browser.close();
})().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
