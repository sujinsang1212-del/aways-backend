// ============================================================
// 결제 승인 + PDF 자동 생성 + 이메일 발송
// 경로: api/confirm-payment.js
// 배포: Vercel Serverless Function
// ============================================================

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

// 체형별 HTML 파일 매핑
const REPORT_MAP = {
  'soft-wave':     'report-soft-wave.html',
  'soft-natural':  'report-soft-natural.html',
  'hard-wave':     'report-hard-wave.html',
  'hard-natural':  'report-hard-natural.html',
  'soft-straight': 'report-soft-straight.html',
  'hard-straight': 'report-hard-straight.html',
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
// HTML → PDF 변환 (Puppeteer + @sparticuz/chromium)
// ============================================================
async function generatePDF(bodyType) {
  const reportFile = REPORT_MAP[bodyType];
  if (!reportFile) throw new Error(`알 수 없는 체형: ${bodyType}`);

  // HTML 파일 읽기
  const htmlPath = path.join(process.cwd(), 'reports', reportFile);
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // Chromium 실행
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // HTML 로드 (base64 이미지 + 인라인 CSS 포함)
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  // 폰트 로딩 완료 대기
  await page.evaluateHandle('document.fonts.ready');

  // PDF 생성
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();

  return pdfBuffer;
}

// ============================================================
// 이메일 발송 (Resend + PDF 첨부)
// ============================================================
async function sendEmail(email, bodyType, pdfBuffer) {
  const bodyTypeKr = BODY_TYPE_KR[bodyType] || bodyType;

  const { data, error } = await resend.emails.send({
    from: `AWAYS <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
    to: email,
    subject: `[AWAYS] ${bodyTypeKr} 체형 맞춤 스타일 가이드가 도착했습니다`,
    html: `
      <div style="font-family: -apple-system, 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFFFF;">

        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; color: #1A1714; margin-bottom: 8px; font-weight: 300; letter-spacing: 0.08em;">AWAYS</h1>
          <p style="color: #8C6840; font-size: 11px; letter-spacing: 0.2em; margin: 0;">BODY TYPE STYLE GUIDE</p>
        </div>

        <!-- 메인 카드 -->
        <div style="background: #F7F3EE; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <h2 style="font-size: 20px; color: #1A1714; margin: 0 0 16px 0; font-weight: 600;">
            ${bodyTypeKr} 리포트가 준비되었습니다 ✨
          </h2>
          <p style="color: #6B6560; line-height: 1.8; font-size: 15px; margin: 0;">
            AWAYS 체형진단 프리미엄 리포트가 완성되었습니다.<br>
            첨부된 PDF 파일을 다운로드하여 확인해주세요.
          </p>
        </div>

        <!-- 리포트 구성 -->
        <div style="background: #FFFFFF; border: 1px solid #E8DFCC; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #8C6840; margin: 0 0 16px 0;">📄 22페이지 리포트 구성</h3>
          <table style="width: 100%; font-size: 13px; color: #6B6560; line-height: 2;">
            <tr><td>✅ Ch.1</td><td>체형 분석 · 시그니처 3가지</td></tr>
            <tr><td>✅ Ch.2</td><td>핏 공식 · DO & DON'T</td></tr>
            <tr><td>✅ Ch.3</td><td>추천 소재 7종 · 컬러 가이드</td></tr>
            <tr><td>✅ Ch.4</td><td>코디 공식 5가지 · 액세서리</td></tr>
            <tr><td>✅ Ch.5</td><td>쇼핑 체크리스트 12개</td></tr>
            <tr><td>✅ Ch.6</td><td>사계절 가이드 · Q&A</td></tr>
          </table>
        </div>

        <!-- 안내 -->
        <div style="background: #FFF8F0; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
          <p style="font-size: 13px; color: #B8956A; margin: 0; line-height: 1.8;">
            💡 <strong>Tip:</strong> 리포트를 핸드폰에 저장해두면 쇼핑할 때 바로 참고할 수 있어요!
          </p>
        </div>

        <!-- 푸터 -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #E8DFCC;">
          <p style="color: #A09A94; font-size: 11px; line-height: 1.8; margin: 0;">
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
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentKey, orderId, amount, email, bodyType } = req.body;

  // ========================================
  // 0. 결제 승인에 필요한 필수값만 검증
  //    (이메일·체형은 리포트 발송용이라 승인 단계에서는 막지 않는다)
  // ========================================
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: '결제 정보(paymentKey, orderId, amount)가 누락되었습니다' });
  }

  const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
  if (!TOSS_SECRET_KEY) {
    console.error('[설정 오류] TOSS_SECRET_KEY 환경변수가 없습니다');
    return res.status(500).json({ error: '서버 결제 설정이 완료되지 않았습니다' });
  }

  try {
    // ========================================
    // 1. 토스페이먼츠 결제 승인 (가장 먼저, 이것만 성공하면 심사 통과 조건 충족)
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
    const methodLabel = tossData.method || '카드';

    // ========================================
    // 2. 리포트 생성 + 이메일 발송 (승인 성공 후 부가 단계)
    //    여기서 실패해도 결제는 이미 승인됐으므로 200을 돌려준다.
    //    (실패 시 reportSent=false 로 알려 수동 재발송 가능)
    // ========================================
    let reportSent = false;
    let emailId = null;

    if (email && REPORT_MAP[bodyType]) {
      try {
        console.log(`[PDF 생성 시작] bodyType: ${bodyType}`);
        const startTime = Date.now();
        const pdfBuffer = await generatePDF(bodyType);
        console.log(`[PDF 생성 완료] ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB, ${Date.now() - startTime}ms`);

        console.log(`[이메일 발송] to: ${email}`);
        const emailResult = await sendEmail(email, bodyType, pdfBuffer);
        emailId = emailResult?.id;
        reportSent = true;
        console.log(`[이메일 발송 완료] id: ${emailId}`);
      } catch (reportErr) {
        // 결제는 성공했지만 리포트 단계만 실패 — 결제를 깨지 않는다
        console.error('[리포트 발송 실패 · 결제는 승인됨]', reportErr.message);
      }
    } else {
      console.warn(`[리포트 건너뜀] email 또는 bodyType 누락 (email=${!!email}, bodyType=${bodyType})`);
    }

    // ========================================
    // 3. 성공 응답 (결제 승인 완료 기준)
    // ========================================
    return res.status(200).json({
      success: true,
      message: reportSent ? '결제 완료 및 리포트 발송 완료' : '결제 승인 완료 (리포트 발송은 별도 확인 필요)',
      orderId,
      bodyType,
      method: methodLabel,
      reportSent,
      emailId,
    });

  } catch (err) {
    console.error('[서버 에러]', err.message);
    return res.status(500).json({
      error: '서버 처리 중 오류가 발생했습니다',
      message: err.message,
    });
  }
}
