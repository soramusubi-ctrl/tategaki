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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const id = String(req.query.id || '');
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid story id' });
    }

    const raw = await command(['GET', `story:${id}`]);
    if (!raw) return res.status(404).json({ error: '物語が見つかりません' });

    return res.status(200).json({ story: JSON.parse(raw) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '保存先に接続できませんでした' });
  }
};