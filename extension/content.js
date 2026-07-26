(() => {
  const BUTTON_ID = "tategaki-reader-button";
  const MODAL_ID = "tategaki-consent-modal";
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "この記事を縦読みで開く");
  button.innerHTML = '<span class="tategaki-mark">縦</span><span class="tategaki-label">縦読み</span>';
  document.body.appendChild(button);

  button.addEventListener("click", showConsent);

  function showConsent() {
    document.getElementById(MODAL_ID)?.remove();
    const overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.innerHTML = `
      <div class="tategaki-dialog" role="dialog" aria-modal="true" aria-labelledby="tategaki-dialog-title">
        <div class="tategaki-dialog-mark">縦</div>
        <h2 id="tategaki-dialog-title">この記事を縦読みで開きますか？</h2>
        <p>表示中の記事のタイトル、本文、記事URLを<strong>縦読みの部屋</strong>へ送信し、共有可能な縦書きページとして保存します。</p>
        <p class="tategaki-note">ボタンを押すまで送信しません。ログイン情報やCookieは送信しません。画面に表示されている本文だけを使用します。</p>
        <div class="tategaki-dialog-actions">
          <button type="button" data-action="cancel">やめる</button>
          <button type="button" data-action="confirm">送信して縦読みで開く</button>
        </div>
        <a href="https://tategaki-substack-reader.vercel.app/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener("click", async () => {
      overlay.remove();
      await publishCurrentArticle();
    });
  }

  async function publishCurrentArticle() {
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="tategaki-label">読込中…</span>';
    try {
      const story = extractStory();
      if (!story.body || story.body.length < 20) throw new Error("記事本文を見つけられませんでした");
      const result = await chrome.runtime.sendMessage({ type: "PUBLISH_STORY", story });
      if (!result?.ok) throw new Error(result?.error || "縦読みページを作れませんでした");
      button.innerHTML = '<span class="tategaki-label">開きました</span>';
      setTimeout(() => resetButton(original), 1600);
    } catch (error) {
      button.innerHTML = '<span class="tategaki-label">失敗</span>';
      button.title = error.message;
      setTimeout(() => resetButton(original), 2400);
    }
  }

  function resetButton(original) {
    button.disabled = false;
    button.innerHTML = original;
    button.title = "";
  }

  function extractStory() {
    const title =
      document.querySelector("article h1")?.innerText?.trim() ||
      document.querySelector("main h1")?.innerText?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content?.trim() ||
      document.title.replace(/\s*[-|]\s*[^-|]+$/, "").trim() ||
      "無題";
    const content = findArticleBody();
    if (!content) throw new Error("Substackの記事本文を見つけられませんでした");
    const clone = content.cloneNode(true);
    clone.querySelectorAll([
      "script", "style", "button", "form", "nav", "aside", "footer",
      "[role='button']", "[data-testid*='subscribe']", "[class*='subscribe']",
      "[class*='paywall']", "[class*='share']", "[class*='comment']"
    ].join(",")).forEach((node) => node.remove());
    return {
      title,
      body: normalizeText(clone.innerText || clone.textContent || ""),
      source: location.href.split("?")[0].split("#")[0],
      theme: "",
      font: "serif",
      size: "22",
      line: "2.05"
    };
  }

  function findArticleBody() {
    const selectors = [
      "article .body.markup",
      "article .available-content",
      "article [class*='body'][class*='markup']",
      "article [class*='post-content']",
      "article",
      "main article"
    ];
    return selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .sort((a, b) => textLength(b) - textLength(a))[0] || null;
  }

  function textLength(node) {
    return (node.innerText || node.textContent || "").trim().length;
  }

  function normalizeText(text) {
    return text
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
})();