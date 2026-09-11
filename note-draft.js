const { chromium } = require("playwright");

const title = process.env.NOTE_TITLE || "BOAT RACE AI予想";
const body = process.env.NOTE_BODY || "";
const email = process.env.NOTE_EMAIL || "";
const password = process.env.NOTE_PASSWORD || "";

async function firstVisible(page, selectors, timeout = 2500) {
  for (const selector of selectors) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout }).catch(() => false)) return el;
  }
  return null;
}

(async () => {
  if (!email || !password) {
    throw new Error("GitHub Secrets の NOTE_EMAIL / NOTE_PASSWORD を設定してください");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://note.com/login", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  const emailBox = await firstVisible(page, [
    'input[type="email"]',
    'input[name="email"]',
    'input[autocomplete="username"]'
  ], 5000);

  const passwordBox = await firstVisible(page, [
    'input[type="password"]',
    'input[name="password"]',
    'input[autocomplete="current-password"]'
  ], 5000);

  if (!emailBox || !passwordBox) throw new Error("noteのログイン欄を取得できませんでした");

  await emailBox.fill(email);
  await passwordBox.fill(password);

  const loginButton = await firstVisible(page, [
    'button[type="submit"]',
    'button:has-text("ログイン")'
  ], 5000);

  if (!loginButton) throw new Error("ログインボタンを取得できませんでした");

  await loginButton.click();
  await page.waitForTimeout(3000);

  await page.goto("https://note.com/notes/new", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  const titleBox = await firstVisible(page, [
    'textarea[placeholder*="タイトル"]',
    'input[placeholder*="タイトル"]',
    '[contenteditable="true"][data-placeholder*="タイトル"]',
    'h1[contenteditable="true"]'
  ], 5000);

  if (!titleBox) throw new Error("タイトル欄を取得できませんでした");

  await titleBox.click();
  await titleBox.fill(title).catch(async () => {
    await page.keyboard.type(title, { delay: 20 });
  });

  const bodyBox = await firstVisible(page, [
    'div[contenteditable="true"][data-placeholder*="本文"]',
    'div.ProseMirror[contenteditable="true"]',
    'article [contenteditable="true"]'
  ], 5000);

  if (!bodyBox) throw new Error("本文欄を取得できませんでした");

  await bodyBox.click();
  await page.keyboard.type(body, { delay: 2 });

  await page.waitForTimeout(1000);

  const saveButton = await firstVisible(page, [
    'button:has-text("下書き保存")',
    'button:has-text("保存")'
  ], 5000);

  if (saveButton) {
    await saveButton.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: "note-draft-result.png",
    fullPage: true
  });

  console.log("note下書き作成処理が完了しました:", page.url());
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
