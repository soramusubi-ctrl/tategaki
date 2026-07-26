const crypto = require('crypto');

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis environment variables are missing');
  return { url: url.replace(/\/$/, ''), token };
}

async function command(args) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || 'Redis request failed');
  return payload.result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const story = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!story || typeof story.body !== 'string' || !story.body.trim()) {
      return res.status(400).json({ error: '本文が空です' });
    }
    if (story.body.length > 200000) {
      return res.status(413).json({ error: '本文が長すぎます' });
    }

    const id = crypto.randomBytes(5).toString('base64url');
    const stored = {
      title: String(story.title || '無題').slice(0, 200),
      body: story.body,
      source: String(story.source || '').slice(0, 2000),
      theme: ['', 'blue', 'sakura', 'night'].includes(story.theme) ? story.theme : '',
      font: story.font === 'sans' ? 'sans' : 'serif',
      size: String(story.size || '22'),
      line: String(story.line || '2.05'),
      createdAt: new Date().toISOString(),
    };

    await command(['SET', `story:${id}`, JSON.stringify(stored)]);
    return res.status(200).json({ id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '保存先に接続できませんでした' });
  }
};