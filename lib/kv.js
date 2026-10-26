// ============================================================
// 선물 코드 저장소 (Upstash Redis, REST 방식)
// Vercel에서 Upstash Redis를 연결하면 아래 환경변수가 자동으로 생겨요.
//   KV_REST_API_URL / KV_REST_API_TOKEN  (또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
// ============================================================
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const kvEnabled = () => Boolean(URL_ && TOKEN);

export async function kv(command) {
  if (!kvEnabled()) throw new Error('KV not configured');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// 선물 코드: 헷갈리는 글자(0, O, 1, I, L)를 뺀 10자리
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newGiftCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

export const GIFT_TTL_SEC = 30 * 24 * 60 * 60;   // 선물 링크 유효기간 30일
export const GIFT_PRICE = 9900;
