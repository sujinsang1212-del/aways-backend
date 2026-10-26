// ============================================================
// 결제 승인 + 미리 만든 PDF 첨부 + 이메일 발송
// 경로: api/confirm-payment.js
// 배포: Vercel Serverless Function
// ============================================================

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { kv, kvEnabled, newGiftCode, GIFT_TTL_SEC, GIFT_PRICE } from '../lib/kv.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// 체형별 PDF 파일 매핑 (reports 폴더에 미리 만들어 둔 PDF)
const REPORT_MAP = {
  'soft-wave':     'report-soft-wave.pdf',
  'soft-natural':  'report-soft-natural.pdf',
  'hard-wave':     'report-hard-wave.pdf',
  'hard-natural':  'report-hard-natural.pdf',
  'soft-straight': 'report-soft-straight.pdf',
  'hard-straight': 'report-hard-straight.pdf',
};

// 체형 한글명 매핑
const BODY_TYPE_KR = {
  'soft-wave':     '소프트 웨이브',
  'soft-natural':  '소프트 내추럴',
  'hard-wave':     '하드 웨이브',
  'hard-natural':  '하드 내추럴',
  'soft-straight': '소프트 스트레이트',
  'hard-straight': '하드 스트레이트',
};

// ============================================================
// 체형 값 정규화
// 진단 페이지가 어떤 형식으로 보내도 REPORT_MAP 키로 맞춰준다.
//   'S-Soft' → 'soft-straight'   (S=스트레이트, W=웨이브, N=내추럴)
//   'W-Hard' → 'hard-wave'
//   'soft-straight', 'Soft Straight', 'STRAIGHT_SOFT' 등도 모두 인식
// ============================================================
function normalizeBodyType(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (REPORT_MAP[s]) return s;

  const parts = s.split(/[^a-z]+/).filter(Boolean);
  const LINE = {
    s: 'straight', straight: 'straight',
    w: 'wave',     wave: 'wave',
    n: 'natural',  natural: 'natural',
  };
  const TONE = { soft: 'soft', s: 'soft', hard: 'hard', h: 'hard' };

  let tone, line;
  if (parts.length === 2 && LINE[parts[0]] && TONE[parts[1]]) {
    // 'S-H', 'S-Soft', 'N-S', 'W-Hard' 형식: 앞=라인, 뒤=톤
    line = LINE[parts[0]];
    tone = TONE[parts[1]];
  } else {
    // 'soft-straight', 'Hard Wave' 등 풀네임 형식
    tone = parts.find(p => p === 'soft' || p === 'hard');
    line = parts.map(p => LINE[p]).find(Boolean);
  }
  if (!tone || !line) return null;

  const key = `${tone}-${line}`;
  return REPORT_MAP[key] ? key : null;
}

// ============================================================
// 미리 만들어 둔 PDF 읽기
// ============================================================
function loadPDF(bodyType) {
  const reportFile = REPORT_MAP[bodyType];
  if (!reportFile) throw new Error(`알 수 없는 체형: ${bodyType}`);

  const pdfPath = path.join(process.cwd(), 'reports', reportFile);
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF 파일 없음: reports/${reportFile}`);

  return fs.readFileSync(pdfPath);
}

// ============================================================
// 이메일 발송 (Resend + PDF 첨부)
// ============================================================
async function sendEmail(email, bodyType, pdfBuffer, giftUrl = null) {
  const bodyTypeKr = BODY_TYPE_KR[bodyType] || bodyType;

  const { data, error } = await resend.emails.send({
    from: `AWAYS <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
    to: email,
    subject: `[AWAYS] ${bodyTypeKr} 체형 맞춤 스타일 가이드가 도착했습니다`,
    html: `
      <div style="font-family: -apple-system, 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFFFF;">

        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; color: #2B1217; margin-bottom: 8px; font-weight: 700; letter-spacing: 0.06em;">AWAYS</h1>
          <p style="color: #4A1C26; font-size: 11px; letter-spacing: 0.2em; margin: 0;">체형 스타일 진단</p>
        </div>

        <!-- 메인 카드 -->
        <div style="background: #F6EFEC; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <h2 style="font-size: 20px; color: #2B1217; margin: 0 0 16px 0; font-weight: 600;">
            ${bodyTypeKr} 리포트가 준비되었습니다
          </h2>
          <p style="color: #533A3F; line-height: 1.8; font-size: 15px; margin: 0;">
            AWAYS 체형진단 프리미엄 리포트가 완성되었습니다.<br>
            첨부된 PDF 파일을 다운로드하여 확인해주세요.
          </p>
        </div>

        ${giftUrl ? `
        <!-- 친구 선물 링크 -->
        <div style="background: #FBF1F0; border: 1px solid #EBCFCB; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="font-size: 15px; color: #7A2E3A; font-weight: 700; margin: 0 0 8px 0;">🎁 친구에게 보낼 선물 링크</p>
          <p style="font-size: 13px; color: #533A3F; line-height: 1.8; margin: 0 0 14px 0;">친구가 이 링크로 진단을 마치면, 친구 체형에 맞는 리포트가 친구 이메일로 바로 발송돼요.<br>링크는 <b>30일 동안, 한 번만</b> 사용할 수 있어요.</p>
          <a href="${giftUrl}" style="display: block; background: #4A1C26; color: #ffffff; text-decoration: none; text-align: center; font-weight: 700; font-size: 15px; padding: 14px; border-radius: 24px;">선물 링크 열기</a>
          <p style="font-size: 12px; color: #6E4A51; margin: 10px 0 0 0; word-break: break-all;">${giftUrl}</p>
        </div>` : ''}

        <!-- 리포트 구성 -->
        <div style="background: #FFFFFF; border: 1px solid #E6D9D5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #4A1C26; margin: 0 0 16px 0;">약 30페이지 리포트 구성</h3>
          <table style="width: 100%; font-size: 13px; color: #533A3F; line-height: 2;">
            <tr><td>Ch.1</td><td>내 타입의 시그니처 · 다른 타입과 비교</td></tr>
            <tr><td>Ch.2</td><td>핏 공식 · 피해야 할 핏 · 네크라인</td></tr>
            <tr><td>Ch.3</td><td>소재 7가지 · 피해야 할 소재 5가지 · 패턴 · 컬러</td></tr>
            <tr><td>Ch.4</td><td>코디 공식 5가지 · 액세서리</td></tr>
            <tr><td>Ch.5</td><td>핵심 아이템 12가지 · 추천 브랜드</td></tr>
            <tr><td>Ch.6</td><td>사계절 가이드 · Q&A · 옷장 자가진단</td></tr>
          </table>
        </div>

        <!-- 안내 -->
        <div style="background: #F6EFEC; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
          <p style="font-size: 13px; color: #4A1C26; margin: 0; line-height: 1.8;">
            <strong>Tip</strong> · 리포트를 핸드폰에 저장해두면 쇼핑할 때 바로 참고할 수 있어요!
          </p>
        </div>

        <!-- 푸터 -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #E6D9D5;">
          <p style="color: #6E4A51; font-size: 11px; line-height: 1.8; margin: 0;">
            본 이메일은 AWAYS 체형진단 서비스에서 자동 발송되었습니다.<br>
            문의: awaysbiz@gmail.com
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `AWAYS-${bodyTypeKr}-스타일가이드.pdf`,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) throw new Error(`이메일 발송 실패: ${JSON.stringify(error)}`);
  return data;
}

// ============================================================
// API Handler
// ============================================================
// ============================================================
// 메타 전환 API: 서버에서 직접 구매 이벤트 전송
// 브라우저 픽셀과 같은 event_id(주문번호)를 써서 메타가 중복 없이 합쳐요.
// 필요 환경변수: META_CAPI_TOKEN  (없으면 이 단계는 건너뜀)
// 선택 환경변수: META_PIXEL_ID, META_TEST_EVENT_CODE (테스트 이벤트 확인용)
// ============================================================
const META_API_VERSION = 'v25.0';
const sha256 = (v) => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

async function sendMetaPurchase({ orderId, amount, email, bodyType, ip, ua, fbp, fbc, sourceUrl }) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { skipped: true };
  const pixelId = process.env.META_PIXEL_ID || '1416204774046914';
  const userData = { client_ip_address: ip || undefined, client_user_agent: ua || undefined };
  if (email) userData.em = [sha256(email)];
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: orderId,
      action_source: 'website',
      event_source_url: sourceUrl || 'https://awaysbiz.com/payment-success.html',
      user_data: userData,
      custom_data: { value: Number(amount), currency: 'KRW', content_name: bodyType || '', content_type: 'product' },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) console.error('[전환 API 실패]', out);
    else console.log(`[전환 API 전송] orderId: ${orderId}, events_received: ${out.events_received}`);
    return out;
  } catch (e) {
    console.error('[전환 API 오류]', e.message);
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentKey, orderId, amount, email, bodyType, fbp, fbc } = req.body;

  // 진단 페이지에서 온 체형 값을 리포트 키로 변환 (예: 'S-Soft' → 'soft-straight')
  const bodyTypeKey = normalizeBodyType(bodyType);

  // ========================================
  // 0. 결제 승인에 필요한 필수값만 검증
  //    (이메일·체형은 리포트 발송용이라 승인 단계에서는 막지 않는다)
  // ========================================
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: '결제 정보(paymentKey, orderId, amount)가 누락되었습니다' });
  }

  // 결제 금액 검증: 브라우저에서 금액을 조작해 결제하는 것을 막는다.
  // 가격을 바꿀 때는 payment.html의 PRODUCT.price와 이 값을 함께 바꿀 것.
  const PRODUCT_PRICE = 19800;
  const wantsGift = req.body.gift === true;
  const expected = wantsGift ? PRODUCT_PRICE + GIFT_PRICE : PRODUCT_PRICE;
  if (Number(amount) !== expected) {
    console.error(`[금액 불일치] orderId: ${orderId}, amount: ${amount}, gift: ${wantsGift}`);
    return res.status(400).json({ error: '결제 금액이 올바르지 않습니다' });
  }

  const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
  if (!TOSS_SECRET_KEY) {
    console.error('[설정 오류] TOSS_SECRET_KEY 환경변수가 없습니다');
    return res.status(500).json({ error: '서버 결제 설정이 완료되지 않았습니다' });
  }

  try {
    // ========================================
    // 1. 토스페이먼츠 결제 승인
    // ========================================
    const encryptedSecretKey = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('[결제 승인 실패]', tossData);
      return res.status(400).json({
        error: '결제 승인 실패',
        code: tossData.code,
        message: tossData.message,
      });
    }

    console.log(`[결제 승인 성공] orderId: ${orderId}, amount: ${amount}`);

    // 결제수단 라벨 (성공 화면 표시용)
    // 결제수단: 간편결제는 토스가 '카드'로 표시하는 경우가 있어, 간편결제사를 따로 확인
    const easyPayProvider = (tossData.easyPay && tossData.easyPay.provider) || '';
    const methodLabel = easyPayProvider ? `${easyPayProvider}${tossData.method && tossData.method !== '간편결제' ? ` (${tossData.method})` : ''}` : (tossData.method || '카드');
    console.log(`[결제수단] method: ${tossData.method}, easyPay: ${easyPayProvider || '-'}`);

    // ========================================
    // 2. 리포트 생성 + 이메일 발송 (승인 성공 후 부가 단계)
    //    여기서 실패해도 결제는 이미 승인됐으므로 200을 돌려준다.
    // ========================================
    // 친구 선물 옵션: 선물 코드 생성 (같은 주문은 한 번만)
    let giftUrl = null;
    let giftError = false;
    if (wantsGift) {
      try {
        if (!kvEnabled()) throw new Error('KV 미설정');
        let code = await kv(['GET', `gift-order:${orderId}`]);
        if (!code) {
          code = newGiftCode();
          const created = await kv(['SET', `gift-order:${orderId}`, code, 'NX', 'EX', GIFT_TTL_SEC]);
          if (created !== 'OK') code = await kv(['GET', `gift-order:${orderId}`]);
          else await kv(['SET', `gift:${code}`, JSON.stringify({ orderId, at: new Date().toISOString() }), 'EX', GIFT_TTL_SEC]);
        }
        giftUrl = `https://awaysbiz.com/?gift=${code}`;
        console.log(`[선물 코드 생성] orderId: ${orderId}, code: ${code}`);
      } catch (e) {
        giftError = true;
        console.error(`[선물 코드 생성 실패 · 결제는 승인됨] orderId: ${orderId}`, e.message);
      }
    }

    let reportSent = false;
    let emailId = null;

    if (email && bodyTypeKey) {
      try {
        console.log(`[PDF 준비] bodyType: ${bodyType} → ${bodyTypeKey}`);
        const pdfBuffer = loadPDF(bodyTypeKey);
        console.log(`[PDF 준비 완료] ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB`);

        console.log(`[이메일 발송] to: ${email}`);
        const emailResult = await sendEmail(email, bodyTypeKey, pdfBuffer, giftUrl);
        emailId = emailResult?.id;
        reportSent = true;
        console.log(`[이메일 발송 완료] id: ${emailId}`);
      } catch (reportErr) {
        // 결제는 성공했지만 리포트 단계만 실패 — 결제를 깨지 않는다
        console.error(`[리포트 발송 실패 · 결제는 승인됨] orderId: ${orderId}, email: ${email}, bodyType: ${bodyType}`, reportErr.message);
      }
    } else if (!email) {
      console.warn(`[리포트 건너뜀] 이메일 없음 (orderId: ${orderId}, bodyType: ${bodyType})`);
    } else {
      console.warn(`[리포트 건너뜀] 인식할 수 없는 체형 값 (orderId: ${orderId}, email: ${email}, bodyType: ${bodyType})`);
    }

    // 메타 전환 API (실패해도 결제·리포트에는 영향 없음)
    await sendMetaPurchase({
      orderId, amount, email, bodyType, fbp, fbc,
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
      ua: req.headers['user-agent'] || '',
      sourceUrl: req.headers['referer'] || '',
    });

    // ========================================
    // 3. 성공 응답 (결제 승인 완료 기준)
    // ========================================
    return res.status(200).json({
      success: true,
      message: reportSent ? '결제 완료 및 리포트 발송 완료' : '결제 승인 완료 (리포트 발송은 별도 확인 필요)',
      orderId,
      bodyType: bodyTypeKey || bodyType,
      method: methodLabel,
      easyPay: easyPayProvider,
      reportSent,
      emailId,
      gift: wantsGift,
      giftUrl,
      giftError,
    });

  } catch (err) {
    console.error('[서버 에러]', err.message);
    return res.status(500).json({
      error: '서버 처리 중 오류가 발생했습니다',
      message: err.message,
    });
  }
}
