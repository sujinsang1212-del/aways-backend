// ============================================================
// 진단 결과 이메일 발송 (+ 마케팅 동의자에게 다음 날 리마인드 예약)
// 경로: api/send-result.js
// 필요 환경변수: RESEND_API_KEY, FROM_EMAIL (인증된 도메인 주소)
// 선택 환경변수: RESEND_AUDIENCE_ID (마케팅 동의자 연락처 저장용)
// ============================================================
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = 'https://awaysbiz.com';
const FROM = `AWAYS <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;

const TYPES = {
 "S-H": {
  "name": "하드 스트레이트",
  "nick": "셋업이 교복인 사람",
  "color": "#2F3A4A",
  "tint": "#E8EBEE",
  "sub": "선명하고 도시적인 인상의 체형",
  "story": {
   "title": "부드러운 블라우스가<br>유독 어색했던 이유",
   "hook": "여리여리한 러플 블라우스, 하늘거리는 A라인 스커트. 막상 입으면 옷과 내가 따로 노는 것 같았던 적 있지 않나요?",
   "weapon": "하드 스트레이트의 가장 큰 무기는 <b>입체적인 상체와 선명한 라인</b>이에요.",
   "proof": "<b>정장형 블레이저, H라인 스커트, 각진 카라 셔츠</b>처럼 군더더기 없는 옷을 입은 날 \"오늘 멋있다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>탄탄한 울, 빳빳한 코튼</b>처럼 형태가 잡힌 소재가 당신의 선명함을 받쳐줘요."
  },
  "colorsOpen": [
   [
    "블랙",
    "#1A1A1A"
   ],
   [
    "퓨어 화이트",
    "#FFFFFF"
   ],
   [
    "차콜",
    "#3B3B3B"
   ]
  ],
  "colorCount": 6,
  "neckStory": "깊게 파인 <b>각진 V넥</b>은 입체적인 상체에 시원한 세로선을 만들어, 하드 스트레이트의 도시적인 인상을 또렷하게 살려줘요.",
  "colorEnd": "하드 스트레이트의 시크함을 가장 잘 받쳐줘요"
 },
 "S-Soft": {
  "name": "소프트 스트레이트",
  "nick": "기본템이 제일 비싸 보이는 사람",
  "color": "#5A6E8C",
  "tint": "#EAEEF4",
  "sub": "단정하고 클래식한 인상의 체형",
  "story": {
   "title": "퍼프 소매 블라우스가<br>유독 답답해 보였던 이유",
   "hook": "사랑스러워 보여서 산 퍼프 소매 블라우스, 셔링이 많은 원피스. 막상 입으면 상체가 더 커 보이고 답답해 보였던 적 있지 않나요?",
   "weapon": "소프트 스트레이트의 가장 큰 무기는 <b>자연스러운 볼륨과 단정한 분위기</b>예요.",
   "proof": "<b>정핏 셔츠, 일자 슬랙스, 스트레이트 원피스</b>처럼 장식 없는 옷을 입은 날 \"오늘 고급스러워 보인다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>캐시미어, 부드러운 코튼</b>처럼 단정하게 떨어지는 소재가 분위기를 한층 고급스럽게 만들어줘요."
  },
  "colorsOpen": [
   [
    "베이지",
    "#E8DFCC"
   ],
   [
    "크림",
    "#F5EFE7"
   ],
   [
    "더스티 핑크",
    "#D4A4A4"
   ]
  ],
  "colorCount": 6,
  "neckStory": "적당한 크기의 <b>라운드 넥</b>은 단정하고 미니멀한 인상을 만들어, 소프트 스트레이트의 클래식한 분위기를 가장 잘 살려줘요.",
  "colorEnd": "단정한 인상에 고급스러움을 더해줘요"
 },
 "W-H": {
  "name": "하드 웨이브",
  "nick": "허리선 하나로 완성하는 사람",
  "color": "#7A2E3A",
  "tint": "#F4E8EA",
  "sub": "곡선과 선명함을 함께 가진 체형",
  "story": {
   "title": "흐르는 원피스가<br>유독 퍼져 보였던 이유",
   "hook": "하늘하늘한 저지 원피스, 풍성한 플레어 스커트. 막상 입으면 몸이 퍼져 보이고 인상까지 흐릿해 보였던 적 있지 않나요?",
   "weapon": "하드 웨이브의 가장 큰 무기는 <b>샤프한 허리 라인</b>이에요.",
   "proof": "<b>구조적인 재킷, 샤프한 페플럼, 펜슬 스커트</b>처럼 핏이 딱 잡힌 옷을 입은 날 \"오늘 세련돼 보인다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>탄탄한 울, 트위드</b>처럼 형태를 잡아주는 소재가 당신의 라인을 또렷하게 만들어줘요."
  },
  "colorsOpen": [
   [
    "블랙",
    "#1A1A1A"
   ],
   [
    "차콜",
    "#3B3B3B"
   ],
   [
    "와인",
    "#7B2D3F"
   ]
  ],
  "colorCount": 6,
  "neckStory": "<b>각진 V넥</b>은 샤프한 골격감과 잘 어울려서, 하드 웨이브의 선명한 인상을 한층 세련되게 만들어줘요.",
  "colorEnd": "샤프한 라인을 세련되게 살려줘요"
 },
 "W-Soft": {
  "name": "소프트 웨이브",
  "nick": "원피스가 제일 잘 받는 사람",
  "color": "#9A5266",
  "tint": "#F8ECEF",
  "sub": "부드러운 곡선이 매력적인 체형",
  "story": {
   "title": "박시한 니트가<br>유독 안 어울렸던 이유",
   "hook": "예쁘다고 산 박시한 니트. 막상 입고 거울을 보면 몸이 커 보이고 축 처져 보였던 적 있지 않나요?",
   "weapon": "소프트 웨이브의 가장 큰 무기는 <b>잘록한 허리</b>예요.",
   "proof": "허리를 잡아주는 <b>랩 원피스, A라인 스커트</b>를 입은 날 \"오늘 뭔가 달라 보인다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>실크, 새틴</b>처럼 몸을 따라 흐르는 소재가 곡선을 우아하게 감싸줘요."
  },
  "colorsOpen": [
   [
    "베이지",
    "#E8DFCC"
   ],
   [
    "더스티 로즈",
    "#D4A4A4"
   ],
   [
    "네이비",
    "#2C3E50"
   ]
  ],
  "colorCount": 6,
  "neckStory": "<b>라운드 넥</b>은 부드러운 곡선이 어깨선과 자연스럽게 이어져서, 소프트 웨이브의 여성스러운 분위기를 가장 잘 살려줘요.",
  "colorEnd": "부드러운 곡선을 더 화사하게 만들어줘요"
 },
 "N-H": {
  "name": "하드 내추럴",
  "nick": "오버핏이 멋이 되는 사람",
  "color": "#4E5B3A",
  "tint": "#EDEFE6",
  "sub": "당당한 골격감이 매력인 체형",
  "story": {
   "title": "딱 붙는 니트가<br>유독 어색했던 이유",
   "hook": "몸에 딱 맞는 니트, 작은 디테일이 많은 블라우스. 막상 입으면 어깨와 뼈대만 도드라져 보이고 답답해 보였던 적 있지 않나요?",
   "weapon": "하드 내추럴의 가장 큰 무기는 <b>당당한 골격감</b>이에요.",
   "proof": "<b>오버사이즈 셔츠, 와이드 진, 툭 걸친 롱 코트</b>처럼 힘을 뺀 옷을 입은 날 \"오늘 분위기 있다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>워싱된 데님, 거친 트위드</b>처럼 결이 살아 있는 소재가 당신의 멋을 더 살려줘요."
  },
  "colorsOpen": [
   [
    "다크 브라운",
    "#5C3A28"
   ],
   [
    "차콜",
    "#3B3B3B"
   ],
   [
    "머스터드",
    "#B8861B"
   ]
  ],
  "colorCount": 6,
  "neckStory": "깊게 파인 <b>V넥</b>은 골격감을 부드럽게 흐려주고 목선을 길어 보이게 해서, 하드 내추럴의 멋을 한층 세련되게 만들어줘요.",
  "colorEnd": "자연스러운 멋을 깊이 있게 살려줘요"
 },
 "N-Soft": {
  "name": "소프트 내추럴",
  "nick": "린넨이 제일 잘 어울리는 사람",
  "color": "#5F6F58",
  "tint": "#EEF1EB",
  "sub": "편안하고 자연스러운 인상의 체형",
  "story": {
   "title": "스키니진이<br>유독 불편해 보였던 이유",
   "hook": "다들 입는 스키니진, 어깨가 각진 재킷. 막상 입으면 몸이 꽉 끼어 보이고 어딘가 어색했던 적 있지 않나요?",
   "weapon": "소프트 내추럴의 가장 큰 무기는 <b>자연스럽게 흐르는 실루엣</b>이에요.",
   "proof": "<b>드롭 숄더 니트, 와이드 팬츠, 롱 셔츠</b>처럼 여유 있게 흐르는 옷을 입은 날 \"편해 보이는데 예쁘다\"는 말을 듣게 돼요.",
   "material": "소재도 마찬가지예요. <b>린넨, 슬러브 코튼</b>처럼 자연스러운 결이 있는 소재가 분위기를 가장 잘 살려줘요."
  },
  "colorsOpen": [
   [
    "카멜",
    "#C19A6B"
   ],
   [
    "커피 브라운",
    "#8B6F47"
   ],
   [
    "올리브",
    "#6B7A4C"
   ]
  ],
  "colorCount": 6,
  "neckStory": "<b>V넥</b>은 골격을 부드럽게 흐려주고 목선을 길어 보이게 해서, 소프트 내추럴의 편안한 분위기를 더 우아하게 만들어줘요.",
  "colorEnd": "편안한 분위기를 가장 잘 살려줘요"
 }
};

const BUSINESS_FOOTER = `
  <p style="margin:0;font-size:11px;line-height:1.7;color:#8A747A;">
    어웨이즈(AWAYS) · 대표 박수진 · 사업자등록번호 201-33-01726<br>
    서울시 동작구 여의대방로24다길40 102동 1001호 · 통신판매업 신고 제2026-서울동작-0643호<br>
    문의 awaysbiz@gmail.com
  </p>`;

// 같은 서버 인스턴스 안에서의 간단한 남용 방지 (IP당 10분에 5회)
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

// 받침에 따라 '이/가'
const ga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + ((c >= 0 && c <= 11171 && c % 28) ? '이' : '가'); };
const stripTags = (h) => h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');
const boldColor = (h, c) => h.replace(/<b>/g, `<b style="color:${c};">`);

function paymentUrl(key, t, source) {
  const q = new URLSearchParams({ bodyType: key, typeName: t.name, utm_source: 'email', utm_medium: 'email', utm_campaign: source });
  return `${SITE}/payment.html?${q.toString()}`;
}

function resultEmail(key, t) {
  const st = t.story;
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;padding:0;word-break:keep-all;background:#F6EFEC;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6EFEC;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:#4A1C26;padding:18px 28px;"><span style="color:#ffffff;font-weight:700;letter-spacing:2px;font-size:16px;">AWAYS</span></td></tr>
      <tr><td style="background:${t.color};padding:30px 28px;" align="center">
        <div style="font-size:12px;color:rgba(255,255,255,0.8);">나의 체형 타입</div>
        <div style="font-size:30px;font-weight:700;color:#ffffff;margin:6px 0 10px;">${t.name}</div>
        <div style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;font-size:14px;font-weight:600;padding:6px 14px;border-radius:16px;">"${t.nick}"</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:10px;">${t.sub}</div>
      </td></tr>
      <tr><td><img src="${SITE}/images/mood/${key}.jpg" width="520" alt="${t.name} 스타일 예시" style="display:block;width:100%;height:auto;"></td></tr>
      <tr><td style="padding:26px 28px 6px;">
        <div style="font-size:12px;font-weight:700;color:${t.color};margin-bottom:6px;">${t.name}인 당신에게</div>
        <div style="font-size:22px;font-weight:700;line-height:1.4;color:#2B1217;margin-bottom:14px;word-break:keep-all;">${stripTags(st.title)}</div>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#6E4A51;">${st.hook}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#2B1217;">옷이 잘못된 게 아니에요. <b>체형과 반대 방향의 옷</b>이었기 때문이에요.</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#2B1217;">${boldColor(st.weapon, t.color)}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#2B1217;">${boldColor(st.proof, t.color)}</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#2B1217;">${boldColor(st.material, t.color)}</p>
      </td></tr>
      <tr><td style="padding:22px 28px 26px;border-top:1px solid #E6D9D5;">
        <p style="margin:0 0 10px;font-size:12px;color:#8A747A;line-height:1.7;">이 메일은 awaysbiz.com에서 체형 진단을 마치고 결과 받기를 요청하셔서 보내드렸어요.</p>
        ${BUSINESS_FOOTER}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function reminderEmail(key, t) {
  const P = (html, extra = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#2B1217;${extra}">${html}</p>`;
  const colorNames = t.colorsOpen.map(c => c[0]).join(', ');
  const sw = (c) => `<td align="center" valign="top" style="padding:0 3px;"><div style="width:38px;height:38px;border-radius:19px;background:${c[1]};border:1px solid #E6D9D5;margin:0 auto;"></div><div style="font-size:11px;color:#533A3F;margin-top:5px;">${c[0]}</div></td>`;
  const lockSw = `<td align="center" valign="top" style="padding:0 3px;"><div style="width:36px;height:36px;border-radius:19px;background:#F6EFEC;border:1px dashed #C9B6B9;margin:0 auto;line-height:36px;font-size:14px;color:#A8959A;">?</div><div style="font-size:11px;color:#A8959A;margin-top:5px;">리포트에서</div></td>`;
  const swatches = t.colorsOpen.map(sw).join('') + Array.from({ length: t.colorCount - t.colorsOpen.length }, () => lockSw).join('');
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;padding:0;word-break:keep-all;background:#F6EFEC;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6EFEC;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:#4A1C26;padding:18px 28px;"><span style="color:#ffffff;font-weight:700;letter-spacing:2px;font-size:16px;">AWAYS</span></td></tr>
      <tr><td style="padding:28px 28px 4px;">
        <div style="font-size:13px;font-weight:700;color:${t.color};margin-bottom:6px;">${t.name}인 당신에게</div>
        <div style="font-size:23px;font-weight:700;line-height:1.4;color:#2B1217;margin-bottom:18px;word-break:keep-all;">같은 옷인데 어떤 날은<br>얼굴이 환해 보였던 이유</div>
        ${P(`똑같은 옷차림인데 어떤 날은 "오늘 얼굴 좋아 보인다"는 말을 듣고, 어떤 날은 "피곤해 보인다"는 말을 들은 적 있지 않나요?`, 'color:#6E4A51;')}
        <div style="font-size:17px;font-weight:600;line-height:1.7;color:#2B1217;padding:14px 16px;border-left:3px solid ${t.color};background:#F6EFEC;border-radius:0 12px 12px 0;margin-bottom:18px;">메이크업 차이가 아니에요.<br><b style="background:linear-gradient(transparent 58%,#F3DCE3 58%);">목선 모양과 옷 색깔</b>이 달랐기 때문이에요.</div>
        ${P(t.neckStory.replace(/<b>/g, `<b style="color:${t.color};">`))}
        ${P(`색도 마찬가지예요. <b style="color:${t.color};">${colorNames}</b> 같은 베이스 컬러는 ${t.colorEnd}.`)}
      </td></tr>
      <tr><td style="padding:0 28px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${swatches}</tr></table>
      </td></tr>
      <tr><td style="padding:0 28px;">
        <div style="background:#FBF1F0;border-radius:14px;padding:16px 16px 6px;">
          <p style="margin:0 0 10px;font-size:16px;line-height:1.8;color:#2B1217;">그런데 ${ga(t.name)} <b style="color:#7A2E3A;">꼭 피해야 할 목선</b>도 있어요. 옷장에 하나쯤은 있는 디자인이라 더 조심해야 하는데, 바로</p>
          <p style="margin:0 0 10px;font-size:16px;line-height:1.8;color:#C9B6B9;letter-spacing:1px;">████ ██ ███이에요. 이 목선은 ███ ████ ██████ ███ ██.</p>
        </div>
      </td></tr>
      <tr><td style="padding:18px 28px 8px;" align="center">
        <div style="font-size:13px;color:#6E4A51;margin-bottom:12px;">피해야 할 목선과 나머지 베이스 컬러 ${t.colorCount - t.colorsOpen.length}가지는 리포트에서 알려드려요</div>
        <a href="${paymentUrl(key, t, 'reminder_d1')}" style="display:block;background:#4A1C26;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px;border-radius:28px;">이어서 읽기 · 9,800원</a>
        <p style="margin:10px 0 0;font-size:12px;color:#8A747A;">약 30페이지 ${t.name} 리포트 · 7일 이내 환불 보장</p>
      </td></tr>
      <tr><td style="padding:22px 28px 26px;border-top:1px solid #E6D9D5;">
        <p style="margin:0 0 10px;font-size:12px;color:#8A747A;line-height:1.7;">이 메일은 진단 후 스타일 팁·리포트 소식 수신에 동의하신 분께 보내드렸어요. 더 이상 받지 않으려면 <a href="mailto:awaysbiz@gmail.com?subject=%EC%88%98%EC%8B%A0%EA%B1%B0%EB%B6%80" style="color:#6E4A51;">awaysbiz@gmail.com으로 '수신거부'</a>라고 보내주세요.</p>
        ${BUSINESS_FOOTER}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, typeKey, marketing } = req.body || {};
  const t = TYPES[typeKey];
  if (!t || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return res.status(400).json({ error: 'invalid' });
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: 'too many requests' });

  const agreed = marketing === true;
  try {
    // 1) 결과 메일 (바로)
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `[AWAYS] 나의 체형 타입은 ${t.name}`,
      html: resultEmail(typeKey, t),
    });
    if (error) { console.error('결과 메일 실패:', error); return res.status(200).json({ success: false }); }

    if (agreed) {
      // 2) 마케팅 동의자: 다음 날 오전 리마인드 예약 (광고성 메일이라 제목에 (광고) 표시)
      // 한국 시간 기준 '다음 날 오전 10시'
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const at = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + 1, 1, 0, 0));
      const r2 = await resend.emails.send({
        from: FROM,
        to: email,
        subject: `(광고) 같은 옷인데 어떤 날은 얼굴이 환해 보였던 이유`,
        html: reminderEmail(typeKey, t),
        scheduledAt: at.toISOString(),
      });
      if (r2.error) console.error('리마인드 예약 실패:', r2.error);
      // 3) 연락처 목록 저장 (환경변수가 있을 때만)
      if (process.env.RESEND_AUDIENCE_ID) {
        try { await resend.contacts.create({ audienceId: process.env.RESEND_AUDIENCE_ID, email, unsubscribed: false }); }
        catch (e) { console.error('연락처 저장 실패:', e); }
      }
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('send-result 오류:', e);
    return res.status(500).json({ success: false });
  }
}
