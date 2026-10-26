// ============================================================
// 친구 선물 리포트 API
//   GET  /api/gift?action=status            → 선물 기능 사용 가능 여부
//   GET  /api/gift?action=check&code=XXXX   → 선물 링크 상태 (valid / used / invalid)
//   POST /api/gift  { action:'redeem', code, email, typeKey } → 리포트 발송 (1회만)
// ============================================================
import { kv, kvEnabled } from '../lib/kv.js';
import { toReportKey, sendGiftReportEmail } from '../lib/report.js';

const SITE = 'https://awaysbiz.com';
const CODE_RE = /^[A-Z0-9]{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

async function giftState(code) {
  const raw = await kv(['GET', `gift:${code}`]);
  if (!raw) return 'invalid';                         // 없거나 30일 지나 만료
  const used = await kv(['GET', `gift:${code}:used`]);
  return used ? 'used' : 'valid';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: 'too many requests' });

  try {
    if (req.method === 'GET') {
      const action = req.query.action;
      if (action === 'status') return res.status(200).json({ enabled: kvEnabled() });
      if (action === 'check') {
        const code = String(req.query.code || '').toUpperCase();
        if (!CODE_RE.test(code) || !kvEnabled()) return res.status(200).json({ state: 'invalid' });
        return res.status(200).json({ state: await giftState(code) });
      }
      return res.status(400).json({ error: 'unknown action' });
    }

    if (req.method === 'POST') {
      const { action, code: rawCode, email, typeKey } = req.body || {};
      if (action !== 'redeem') return res.status(400).json({ error: 'unknown action' });
      const code = String(rawCode || '').toUpperCase();
      const reportKey = toReportKey(typeKey);
      if (!CODE_RE.test(code) || !EMAIL_RE.test(String(email || '')) || !reportKey) {
        return res.status(400).json({ success: false, state: 'invalid' });
      }
      if (!kvEnabled()) return res.status(503).json({ success: false, state: 'unavailable' });

      const gift = await kv(['GET', `gift:${code}`]);
      if (!gift) return res.status(200).json({ success: false, state: 'invalid' });

      // 한 번만 쓰이도록: 먼저 '사용됨'을 선점 (동시에 두 명이 눌러도 한 명만 성공)
      const usedInfo = JSON.stringify({ email, typeKey, at: new Date().toISOString() });
      const claimed = await kv(['SET', `gift:${code}:used`, usedInfo, 'NX', 'EX', 90 * 24 * 60 * 60]);
      if (claimed !== 'OK') return res.status(200).json({ success: false, state: 'used' });

      try {
        await sendGiftReportEmail(email, reportKey);
      } catch (e) {
        // 메일을 못 보냈으면 '사용됨'을 되돌려서 다시 시도할 수 있게
        await kv(['DEL', `gift:${code}:used`]).catch(() => {});
        console.error('[선물 리포트 발송 실패]', e.message);
        return res.status(200).json({ success: false, state: 'send_failed' });
      }
      console.log(`[선물 사용] code: ${code}, type: ${reportKey}`);
      return res.status(200).json({ success: true, state: 'redeemed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[gift API 오류]', e.message);
    return res.status(500).json({ success: false, state: 'error' });
  }
}
