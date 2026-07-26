const READER_ORIGIN = "https://tategaki-substack-reader.vercel.app";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "PUBLISH_STORY") return false;

  publishStory(message.story)
    .then((url) => sendResponse({ ok: true, url }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function publishStory(story) {
  const response = await fetch(`${READER_ORIGIN}/api/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(story),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    throw new Error(payload.error || "縦読みページを作れませんでした");
  }

  const url = `${READER_ORIGIN}/s/${payload.id}`;
  await chrome.tabs.create({ url });
  return url;
}
