// ============================================================
// 리포트 PDF 읽기 + 선물 리포트 메일 (api/gift.js에서 사용)
// ============================================================
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `AWAYS <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;

export const REPORT_MAP = {
  'soft-wave': 'report-soft-wave.pdf',
  'soft-natural': 'report-soft-natural.pdf',
  'hard-wave': 'report-hard-wave.pdf',
  'hard-natural': 'report-hard-natural.pdf',
  'soft-straight': 'report-soft-straight.pdf',
  'hard-straight': 'report-hard-straight.pdf',
};
export const BODY_TYPE_KR = {
  'soft-wave': '소프트 웨이브', 'soft-natural': '소프트 내추럴', 'hard-wave': '하드 웨이브',
  'hard-natural': '하드 내추럴', 'soft-straight': '소프트 스트레이트', 'hard-straight': '하드 스트레이트',
};
const KEY_FROM_SHORT = {
  'S-H': 'hard-straight', 'S-Soft': 'soft-straight', 'W-H': 'hard-wave',
  'W-Soft': 'soft-wave', 'N-H': 'hard-natural', 'N-Soft': 'soft-natural',
};
export function toReportKey(typeKey) {
  if (KEY_FROM_SHORT[typeKey]) return KEY_FROM_SHORT[typeKey];
  const s = String(typeKey || '').toLowerCase();
  return REPORT_MAP[s] ? s : null;
}

export function loadPDF(reportKey) {
  const file = REPORT_MAP[reportKey];
  if (!file) throw new Error(`알 수 없는 체형: ${reportKey}`);
  const p = path.join(process.cwd(), 'reports', file);
  if (!fs.existsSync(p)) throw new Error(`PDF 파일 없음: reports/${file}`);
  return fs.readFileSync(p);
}

export async function sendGiftReportEmail(email, reportKey) {
  const name = BODY_TYPE_KR[reportKey] || reportKey;
  const pdf = loadPDF(reportKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `[AWAYS] 선물받은 ${name} 체형 리포트가 도착했어요`,
    html: `
      <div style="font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#FFFFFF;word-break:keep-all;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:24px;color:#2B1217;margin:0 0 8px;font-weight:700;letter-spacing:0.06em;">AWAYS</h1>
          <p style="color:#4A1C26;font-size:11px;letter-spacing:0.2em;margin:0;">체형 스타일 진단</p>
        </div>
        <div style="background:#F6EFEC;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-size:14px;color:#7A2E3A;font-weight:700;margin:0 0 8px;">🎁 친구가 보낸 선물이에요</p>
          <h2 style="font-size:20px;color:#2B1217;margin:0 0 16px;font-weight:700;">${name} 맞춤 스타일 가이드</h2>
          <p style="color:#533A3F;line-height:1.8;font-size:15px;margin:0;">친구가 AWAYS 체형 리포트를 선물했어요.<br>첨부된 약 30페이지 PDF에서 내 체형에 맞는 핏, 소재, 컬러, 코디 공식을 확인해보세요.</p>
        </div>
        <div style="background:#F6EFEC;border-radius:12px;padding:20px;margin-bottom:32px;">
          <p style="font-size:13px;color:#4A1C26;margin:0;line-height:1.8;"><strong>Tip</strong> · 친구와 같은 타입이라면 서로 옷을 바꿔 입어도 잘 어울려요. 결과를 친구에게 공유해보세요!</p>
        </div>
        <div style="text-align:center;padding-top:24px;border-top:1px solid #E6D9D5;">
          <p style="color:#6E4A51;font-size:11px;line-height:1.8;margin:0;">본 이메일은 선물 링크로 진단을 마치신 분께 자동 발송되었습니다.<br>문의: awaysbiz@gmail.com</p>
        </div>
      </div>`,
    attachments: [{ filename: `AWAYS-${name}-스타일가이드.pdf`, content: pdf.toString('base64'), contentType: 'application/pdf' }],
  });
  if (error) throw new Error(`선물 리포트 메일 실패: ${JSON.stringify(error)}`);
  return data;
}
