const { chromium } = require("playwright");

const title = process.env.NOTE_TITLE || "BOAT RACE AI予想";
const body = process.env.NOTE_BODY || "";
const email = process.env.NOTE_EMAIL || "";
const password = process.env.NOTE_PASSWORD || "";

async function findVisible(page, selectors, timeout = 3000) {
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout })) return el;
    } catch (_) {}
  }
  return null;
}

async function saveShot(page, name) {
  try {
    await page.screenshot({
      path: name,
      fullPage: true
    });
  } catch (_) {}
}

(async () => {
  if (!email || !password) {
    throw new Error(
      "GitHub Secrets の NOTE_EMAIL / NOTE_PASSWORD を確認してください"
    );
  }

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    viewport: {
      width: 1280,
      height: 900
    }
  });

  const page = await context.newPage();

  try {
    console.log("noteログイン画面を開きます");

    await page.goto("https://note.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(2500);

    await saveShot(page, "note-login-page.png");

    const emailBox = await findVisible(page, [
      'input[placeholder*="メールアドレス"]',
      'input[placeholder*="note ID"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[name="login"]',
      'input[autocomplete="username"]',
      'input[type="text"]'
    ], 5000);

    if (!emailBox) {
      throw new Error(
        "noteのメールアドレス / note ID入力欄を取得できませんでした"
      );
    }

    const passwordBox = await findVisible(page, [
      'input[placeholder*="パスワード"]',
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]'
    ], 5000);

    if (!passwordBox) {
      throw new Error(
        "noteのパスワード入力欄を取得できませんでした"
      );
    }

    console.log("ログイン情報を入力します");

    await emailBox.fill(email);
    await passwordBox.fill(password);

    const loginButton = await findVisible(page, [
      'button:has-text("ログイン")',
      'button[type="submit"]',
      'input[type="submit"]'
    ], 5000);

    if (!loginButton) {
      throw new Error(
        "noteのログインボタンを取得できませんでした"
      );
    }

    await loginButton.click();

    await page.waitForTimeout(5000);

    console.log("ログイン後URL:", page.url());

    await saveShot(page, "note-after-login.png");

    if (page.url().includes("/login")) {
      throw new Error(
        "noteにログインできませんでした。追加認証・ログイン情報を確認してください"
      );
    }

    console.log("記事作成画面を開きます");

    await page.goto("https://note.com/notes/new", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(4000);

    await saveShot(page, "note-editor-page.png");

    const titleBox = await findVisible(page, [
      'textarea[placeholder*="タイトル"]',
      'input[placeholder*="タイトル"]',
      '[contenteditable="true"][data-placeholder*="タイトル"]',
      '[contenteditable="true"][aria-label*="タイトル"]',
      'h1[contenteditable="true"]'
    ], 5000);

    if (!titleBox) {
      throw new Error(
        "noteの記事タイトル欄を取得できませんでした"
      );
    }

    await titleBox.click();

    try {
      await titleBox.fill(title);
    } catch (_) {
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+A" : "Control+A"
      );
      await page.keyboard.type(title, {
        delay: 10
      });
    }

    const bodyBox = await findVisible(page, [
      'div.ProseMirror[contenteditable="true"]',
      '[contenteditable="true"][data-placeholder*="本文"]',
      '[contenteditable="true"][aria-label*="本文"]',
      'article [contenteditable="true"]',
      'main [contenteditable="true"]'
    ], 5000);

    if (!bodyBox) {
      throw new Error(
        "noteの記事本文欄を取得できませんでした"
      );
    }

    await bodyBox.click();

    await page.keyboard.type(body, {
      delay: 2
    });

    await page.waitForTimeout(2000);

    await saveShot(page, "note-before-save.png");

    const saveButton = await findVisible(page, [
      'button:has-text("下書き保存")',
      'button:has-text("保存")'
    ], 4000);

    if (saveButton) {
      console.log("下書き保存ボタンを押します");
      await saveButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log(
        "明示的な保存ボタンはありません。noteの自動保存を待ちます"
      );
      await page.waitForTimeout(5000);
    }

    await saveShot(page, "note-draft-result.png");

    console.log("✅ note下書き作成処理が完了しました");
    console.log("現在URL:", page.url());

  } catch (err) {
    console.error("❌ note下書き処理エラー:", err.message);

    await saveShot(
      page,
      "note-draft-result.png"
    );

    throw err;

  } finally {
    await browser.close();
  }
})();
