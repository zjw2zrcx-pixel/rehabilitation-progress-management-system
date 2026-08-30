const puppeteer = require('puppeteer-core');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const unique = (values) => [...new Set(values)];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  const audit = async (name) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const findings = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      const textFindings = [...document.querySelectorAll('body *')]
        .filter((element) => visible(element) && /[\u3400-\u9fff]/.test(element.innerText || ''))
        .filter((element) => ![...element.children].some((child) => visible(child) && /[\u3400-\u9fff]/.test(child.innerText || '')))
        .map((element) => `${element.tagName.toLowerCase()}.${element.className || '-'} :: ${(element.innerText || '').trim()}`);
      const attributeFindings = [...document.querySelectorAll('input, textarea, select, button')]
        .filter((element) => visible(element))
        .flatMap((element) => ['value', 'placeholder', 'title', 'aria-label'].map((attribute) => [attribute, element.getAttribute(attribute)]))
        .filter(([, value]) => /[\u3400-\u9fff]/.test(value || ''))
        .map(([attribute, value]) => `attribute.${attribute} :: ${value}`);
      return [...textFindings, ...attributeFindings];
    });
    console.log(`\n[${name}]`);
    unique(findings).forEach((finding) => console.log(finding));
  };

  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');
  await audit('login-en');

  await page.evaluate(() => [...document.querySelectorAll('.demo-chip')].find((button) => button.textContent.trim() === 'Admin').click());
  await page.waitForFunction(() => location.pathname === '/dashboard');
  await audit('dashboard-en');

  await page.goto(`${FRONTEND}/patients`);
  await audit('patients-en');
  for (let patientId = 1; patientId <= 8; patientId += 1) {
    await page.goto(`${FRONTEND}/patients/${patientId}`);
    await audit(`patient-${patientId}-overview-en`);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Edit')?.click());
    await audit(`patient-${patientId}-edit-en`);
    await page.evaluate(() => [...document.querySelectorAll('.tab')].find((button) => button.textContent.trim() === 'Rehabilitation Plans')?.click());
    await audit(`patient-${patientId}-plans-en`);
  }

  await page.goto(`${FRONTEND}/patients/1`);
  for (const label of ['Assessments', 'Trends', 'Prediction', 'Data Export']) {
    await page.evaluate((text) => [...document.querySelectorAll('.tab')].find((button) => button.textContent.trim() === text)?.click(), label);
    await audit(`patient-1-${label.toLowerCase().replaceAll(' ', '-')}-en`);
  }

  await page.goto(`${FRONTEND}/users`);
  await audit('users-en');
  await page.goto(`${FRONTEND}/register`);
  await audit('register-en');

  await page.evaluate(() => localStorage.clear());
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.auth-card');
  await page.evaluate(() => [...document.querySelectorAll('.demo-chip')].find((button) => button.textContent.trim() === 'Patient').click());
  await page.waitForFunction(() => location.pathname === '/dashboard');
  await audit('patient-dashboard-en');
  await page.goto(`${FRONTEND}/my-progress`);
  await audit('patient-training-log-en');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
