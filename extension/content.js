(() => {
  const BUTTON_ID = "tategaki-reader-button";
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "この記事を縦読みで開く");
  button.innerHTML = '<span class="tategaki-mark">縦</span><span class="tategaki-label">縦読み</span>';
  document.body.appendChild(button);

  button.addEventListener("click", async () => {
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="tategaki-label">読込中…</span>';

    try {
      const story = extractStory();
      if (!story.body || story.body.length < 20) {
        throw new Error("記事本文を見つけられませんでした");
      }

      const result = await chrome.runtime.sendMessage({
        type: "PUBLISH_STORY",
        story,
      });

      if (!result?.ok) throw new Error(result?.error || "共有ページを作れませんでした");
      button.innerHTML = '<span class="tategaki-label">開きました</span>';
      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = original;
      }, 1600);
    } catch (error) {
      button.disabled = false;
      button.innerHTML = '<span class="tategaki-label">失敗</span>';
      button.title = error.message;
      setTimeout(() => {
        button.innerHTML = original;
        button.title = "";
      }, 2200);
    }
  });

  function extractStory() {
    const title =
      document.querySelector("article h1")?.innerText?.trim() ||
      document.querySelector("main h1")?.innerText?.trim() ||
      document.querySelector('meta[property="og:title"]')?.content?.trim() ||
      document.title.replace(/\s*-\s*[^-]+$/, "").trim() ||
      "無題";

    const content = findArticleBody();
    if (!content) throw new Error("Substackの記事本文を見つけられませんでした");

    const clone = content.cloneNode(true);
    clone.querySelectorAll([
      "script",
      "style",
      "button",
      "form",
      "nav",
      "aside",
      "footer",
      "[role='button']",
      "[data-testid*='subscribe']",
      "[class*='subscribe']",
      "[class*='paywall']",
      "[class*='share']",
    ].join(",")).forEach((node) => node.remove());

    const body = normalizeText(clone.innerText || clone.textContent || "");

    return {
      title,
      body,
      source: location.href.split("?")[0],
      theme: "",
      font: "serif",
      size: "22",
      line: "2.05",
    };
  }

  function findArticleBody() {
    const selectors = [
      "article .body.markup",
      "article .available-content",
      "article [class*='body'][class*='markup']",
      "article [class*='post-content']",
      "article",
      "main article",
    ];

    const candidates = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    return candidates.sort((a, b) => textLength(b) - textLength(a))[0] || null;
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
