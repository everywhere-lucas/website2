// 루카스 영상 카탈로그 — 홈페이지(website2) Worker에 함께 들어가는 부분
// 홈페이지 화면(dist 폴더)은 그대로 정적 파일로 나가고, 아래 주소만 이 코드가 처리해요.
//
// 필요한 설정 (Cloudflare 대시보드 > Worker > 설정)
//   KV 바인딩  : CATALOG   (wrangler.jsonc에 적혀 있어 배포 때 자동으로 만들어져요)
//   시크릿     : IG_TOKEN  (insta-status에 넣은 것과 같은 인스타 토큰)
//   시크릿     : ADMIN_KEY (관리자 화면에 들어갈 때 쓸 나만의 비밀 문구)
//   (선택) 크론 트리거: 하루 1번 → 새 영상을 자동으로 가져와 태그 초안 생성
//
// 주소
//   /embed.js  홈페이지에 검색 화면을 끼워 넣는 스크립트
//   /admin   태그 확정용 관리자 화면

const IG = 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp';
const VIDEOS_ONLY = false; // true로 바꾸면 릴스(영상)만 가져옴

// ───────────────────────── 태그 초안 규칙 ─────────────────────────
// 캡션에 아래 단어가 있으면 해당 나라/도시로 초안을 잡는다. (문자열 또는 정규식)
const GAZ = [
  { country: '이탈리아', kw: ['이탈리아', '이태리', 'italy'], cities: {
    '로마': ['로마', '콜로세움', '보르게세', '조국의 제단', '트레비', '바티칸'],
    '피렌체': ['피렌체', '베키오', '미켈란젤로 광장'],
    '밀라노': ['밀라노'], '베네치아': ['베네치아', '베니스'], '돌로미티': ['돌로미티', 'dolomit'],
    '나폴리': ['나폴리'], '아말피': ['아말피', '포지타노'] } },
  { country: '프랑스', kw: ['프랑스', 'france'], cities: {
    '파리': [/(?<![가-힣])파리(?!바게)/, '튈르리', '에펠', '루브르', '몽마르트'],
    '비스카로스': ['비스까호쓰', '비스카로스', 'biscarrosse'],
    '니스': [/(?<![가-힣])니스(?![가-힣])/], '보르도': ['보르도'] } },
  { country: '스페인', kw: ['스페인'], cities: { '바르셀로나': ['바르셀로나'], '마드리드': ['마드리드'], '세비야': ['세비야'] } },
  { country: '포르투갈', kw: ['포르투갈'], cities: { '리스본': ['리스본'], '포르투': [/포르투(?!갈)/] } },
  { country: '영국', kw: ['영국'], cities: { '런던': ['런던'] } },
  { country: '독일', kw: ['독일'], cities: { '베를린': ['베를린'], '뮌헨': ['뮌헨'], '프랑크푸르트': ['프랑크푸르트'] } },
  { country: '스위스', kw: ['스위스'], cities: { '취리히': ['취리히'], '인터라켄': ['인터라켄'], '루체른': ['루체른'], '체르마트': ['체르마트'] } },
  { country: '오스트리아', kw: ['오스트리아'], cities: { '비엔나': ['비엔나'], '잘츠부르크': ['잘츠부르크'], '할슈타트': ['할슈타트'] } },
  { country: '체코', kw: ['체코'], cities: { '프라하': ['프라하'] } },
  { country: '헝가리', kw: ['헝가리'], cities: { '부다페스트': ['부다페스트'] } },
  { country: '네덜란드', kw: ['네덜란드'], cities: { '암스테르담': ['암스테르담'] } },
  { country: '그리스', kw: ['그리스'], cities: { '아테네': ['아테네'], '산토리니': ['산토리니'] } },
  { country: '튀르키예', kw: ['튀르키예', '터키'], cities: { '이스탄불': ['이스탄불'], '카파도키아': ['카파도키아'] } },
  { country: '일본', kw: ['일본', 'japan'], cities: {
    '도쿄': ['도쿄', '시부야', '신주쿠'], '오사카': ['오사카', '도톤보리', '난바'], '교토': ['교토'],
    '후쿠오카': ['후쿠오카', '유후인'], '삿포로': ['삿포로', '홋카이도'], '오키나와': ['오키나와'],
    '나고야': ['나고야'], '고베': ['고베'] } },
  { country: '대만', kw: ['대만', '타이완'], cities: {
    '타이베이': ['타이베이', '타이페이', '시먼딩', '지우펀'], '가오슝': ['가오슝'], '타이중': ['타이중'] } },
  { country: '중국', kw: ['중국'], cities: {
    '상하이': ['상하이', '상해'], '베이징': ['베이징', '북경'], '칭다오': ['칭다오'], '장가계': ['장가계'] } },
  { country: '홍콩', kw: ['홍콩'], cities: {} },
  { country: '마카오', kw: ['마카오'], cities: {} },
  { country: '베트남', kw: ['베트남'], cities: {
    '다낭': ['다낭', '호이안'], '하노이': ['하노이'], '호치민': ['호치민'], '나트랑': ['나트랑'], '푸꾸옥': ['푸꾸옥'] } },
  { country: '태국', kw: ['태국'], cities: { '방콕': ['방콕'], '치앙마이': ['치앙마이'], '푸켓': ['푸켓'], '파타야': ['파타야'] } },
  { country: '싱가포르', kw: ['싱가포르', '싱가폴'], cities: {} },
  { country: '말레이시아', kw: ['말레이시아'], cities: { '쿠알라룸푸르': ['쿠알라룸푸르'], '코타키나발루': ['코타키나발루'] } },
  { country: '인도네시아', kw: ['인도네시아'], cities: { '발리': ['발리'] } },
  { country: '필리핀', kw: ['필리핀'], cities: { '세부': [/세부(?!\s?(정보|사항|내용|적))/], '보라카이': ['보라카이'], '마닐라': ['마닐라'] } },
  { country: '미국', kw: ['미국'], cities: {
    '뉴욕': ['뉴욕'], '로스앤젤레스': ['로스앤젤레스', '엘에이'], '하와이': ['하와이'],
    '라스베이거스': ['라스베가스', '라스베이거스'], '샌프란시스코': ['샌프란시스코'] } },
  { country: '호주', kw: ['호주'], cities: { '시드니': ['시드니'], '멜버른': ['멜버른'] } },
  { country: '한국', kw: ['한국', '국내여행'], cities: {
    '서울': ['서울', '한남동', '성수동', '홍대', '강남역'], '대전': ['대전'], '부산': ['부산'], '제주': ['제주'],
    '용인': ['캐리비안베이', '캐베', '에버랜드'], '인천': [/인천(?!공항|국제공항)/], '경주': ['경주'], '강릉': ['강릉'] } },
];

const TOPIC_RULES = [
  ['공항·출국', ['공항', '출국', '입국', '면세', '기내', '비행기', '항공', '스마트패스', '탑승', '게이트']],
  ['맛집·먹거리', ['맛집', '먹킷', '먹거리', '젤라또', '훠궈', '마라탕', '카페', '디저트', '토스트', '와인', '모찌', '맛있']],
  ['명소', ['가볼만한곳', '명소', '야경', '전망', '공원', '광장', '대성당', '관람차', '데이트코스', '좋았던 곳']],
  ['축제·행사', ['축제', '특별전', '팝업', '전시', '문화유산의 날', '오픈런']],
  ['숙소', ['호텔', '숙소', '에어비앤비', '료칸']],
  ['교통·이동', ['지하철', '기차', '열차', '버스', '렌트', '교통패스', 'ktx']],
  ['여행템', ['필수템', '캐리어', '어댑터', '어탭터', 'esim', '유심', '보조배터리', '오즈모', '로밍', '챙기세요']],
  ['꿀팁·앱', ['꿀팁', '어플', '앱 설치', '방법', '등록', '예약', '매너']],
  ['공감·유머', ['아재개그', '친구 태그', '친구들 태그', '유형인가요', '저만 이런', '망한릴스']],
];
const TOPICS = TOPIC_RULES.map((r) => r[0]).concat(['기타']);
const FLAGS = ['광고', '종료', '중복'];

function hits(text, kws) {
  let n = 0, first = Infinity;
  for (const k of kws) {
    const i = k instanceof RegExp ? text.search(k) : text.indexOf(k);
    if (i >= 0) { n++; if (i < first) first = i; }
  }
  return { n, first };
}

function makeTitle(caption) {
  const lines = String(caption || '').split('\n').map((s) => s.trim()).filter(Boolean);
  for (let line of lines) {
    line = line.replace(/#[^\s#]+/g, '')
      .replace(/^[\(\{\[][^\)\}\]]{0,14}[\)\}\]]\s*/, '') // (저장/공유) 같은 머리말
      .replace(/^[가-힣•\/]{1,6}\)\s*/, '')                // 공유) 같은 머리말
      .trim();
    if (line.length >= 2) return line.length > 44 ? line.slice(0, 43) + '…' : line;
  }
  return '(제목 없음)';
}

function draftTags(caption) {
  const text = String(caption || '').toLowerCase();
  let best = null;
  for (const g of GAZ) {
    const c = hits(text, g.kw);
    let score = c.n * 2, first = c.first, city = '', cityScore = 0;
    for (const name of Object.keys(g.cities)) {
      const h = hits(text, g.cities[name]);
      if (h.n) {
        score += h.n; first = Math.min(first, h.first);
        if (h.n > cityScore) { cityScore = h.n; city = name; }
      }
    }
    if (score && (!best || score > best.score || (score === best.score && first < best.first))) {
      best = { country: g.country, city, score, first };
    }
  }
  let country = best ? best.country : '', city = best ? best.city : '';
  if (!country) country = text.indexOf('유럽') >= 0 ? '유럽' : '공통';

  const scored = TOPIC_RULES.map(([name, kws]) => ({ name, n: hits(text, kws).n })).filter((x) => x.n);
  scored.sort((a, b) => b.n - a.n);
  const topics = scored.slice(0, 2).map((x) => x.name);
  if (!topics.length) topics.push('기타');

  const flags = [];
  if (/광고|협찬/.test(text)) flags.push('광고');
  if (/[\(\[]\s*종료\s*[\)\]]/.test(text)) flags.push('종료');

  return { title: makeTitle(caption), country, city, topics, flags, hidden: false, confirmed: false };
}

// ───────────────────────── 저장소 ─────────────────────────
async function getVideos(env) { return (await env.CATALOG.get('videos', 'json')) || { syncedAt: null, items: [] }; }
async function getTags(env) { return (await env.CATALOG.get('tags', 'json')) || {}; }

async function igGet(u) {
  const r = await fetch(u);
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('인스타 API 응답을 읽지 못했습니다 (HTTP ' + r.status + ')'); }
  if (j && j.error) throw new Error('인스타 API 오류: ' + j.error.message);
  return j;
}

async function sync(env) {
  if (!env.IG_TOKEN) throw new Error('IG_TOKEN 시크릿이 등록되지 않았습니다.');
  let next = IG + '/me/media?fields=' + FIELDS + '&limit=50&access_token=' + encodeURIComponent(env.IG_TOKEN);
  const items = [];
  for (let page = 0; next && page < 40; page++) {
    const j = await igGet(next);
    for (const m of j.data || []) {
      if (VIDEOS_ONLY && m.media_type !== 'VIDEO') continue;
      items.push({
        id: m.id, date: m.timestamp, caption: m.caption || '', link: m.permalink,
        thumb: m.thumbnail_url || (m.media_type !== 'VIDEO' ? m.media_url : '') || '', type: m.media_type,
      });
    }
    next = j.paging && j.paging.next;
  }
  if (!items.length) throw new Error('가져온 영상이 0개입니다. 기존 목록은 그대로 둡니다.');

  const tags = await getTags(env);
  let added = 0;
  for (const v of items) if (!tags[v.id]) { tags[v.id] = draftTags(v.caption); added++; }
  await env.CATALOG.put('videos', JSON.stringify({ syncedAt: new Date().toISOString(), items }));
  if (added) await env.CATALOG.put('tags', JSON.stringify(tags));
  return { total: items.length, added };
}

function merged(videos, tags) {
  return videos.items.map((v) => Object.assign({ id: v.id, date: v.date, link: v.link, caption: v.caption, kind: v.type === 'VIDEO' ? '영상' : '게시물' },
    tags[v.id] || draftTags(v.caption)));
}

function clean(s, max) { return String(s == null ? '' : s).trim().slice(0, max); }
function cleanList(a) {
  return Array.isArray(a) ? [...new Set(a.map((x) => clean(x, 20)).filter(Boolean))].slice(0, 8) : [];
}

async function save(env, body) {
  const list = Array.isArray(body && body.items) ? body.items : [];
  if (!list.length) throw new Error('저장할 항목이 없습니다.');
  const tags = await getTags(env);
  for (const it of list) {
    const id = clean(it.id, 40);
    if (!id) continue;
    tags[id] = {
      title: clean(it.title, 80) || '(제목 없음)',
      country: clean(it.country, 20) || '공통',
      city: clean(it.city, 20),
      topics: cleanList(it.topics), flags: cleanList(it.flags),
      hidden: !!it.hidden, confirmed: !!it.confirmed,
    };
  }
  await env.CATALOG.put('tags', JSON.stringify(tags));
  return { saved: list.length };
}

async function thumb(id, req, env, ctx) {
  const key = new Request(new URL('/thumb/' + id, req.url).toString());
  let cache = null;
  try { cache = caches.default; const hit = await cache.match(key); if (hit) return hit; } catch (e) { cache = null; }
  const videos = await getVideos(env);
  const item = videos.items.find((x) => x.id === id);
  if (!item) return new Response('not found', { status: 404 });
  let r = item.thumb ? await fetch(item.thumb) : null;
  if (!r || !r.ok) {
    // 인스타 썸네일 주소는 며칠 뒤 만료된다 → 새 주소를 받아 온다
    const j = await igGet(IG + '/' + id + '?fields=thumbnail_url,media_url,media_type&access_token=' + encodeURIComponent(env.IG_TOKEN || ''));
    const fresh = j.thumbnail_url || (j.media_type !== 'VIDEO' ? j.media_url : '');
    if (!fresh) return new Response('no thumbnail', { status: 404 });
    r = await fetch(fresh);
    if (!r.ok) return new Response('thumbnail error', { status: 502 });
    const stale = !videos.syncedAt || Date.now() - Date.parse(videos.syncedAt) > 6 * 3600 * 1000;
    if (stale) ctx.waitUntil(sync(env).catch(() => {}));
  }
  const res = new Response(r.body, { headers: {
    'content-type': r.headers.get('content-type') || 'image/jpeg',
    'cache-control': 'public, max-age=604800',
  } });
  if (cache) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

// ───────────────────────── 라우팅 ─────────────────────────
function json(data, status, extra) {
  return new Response(JSON.stringify(data), { status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, extra || {}) });
}
function html(body) {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
function vocab(tags) {
  const countries = new Set(GAZ.map((g) => g.country).concat(['공통', '유럽']));
  const cities = new Set();
  GAZ.forEach((g) => Object.keys(g.cities).forEach((c) => cities.add(c)));
  const topics = new Set(TOPICS);
  Object.values(tags).forEach((t) => {
    if (t.country) countries.add(t.country);
    if (t.city) cities.add(t.city);
    (t.topics || []).forEach((x) => topics.add(x));
  });
  return { countries: [...countries], cities: [...cities], topics: [...topics], flags: FLAGS };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/admin') return html(ADMIN_HTML);
      if (p === '/embed.js') return new Response(EMBED_JS, { headers: {
        'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=300' } });
      if (!env.CATALOG) return json({ error: 'KV 바인딩 CATALOG가 연결되지 않았습니다.' }, 500);

      if (p === '/api/catalog') {
        const [videos, tags] = await Promise.all([getVideos(env), getTags(env)]);
        const items = merged(videos, tags).filter((v) => v.confirmed && !v.hidden)
          .map((v) => ({ id: v.id, date: v.date, link: v.link, title: v.title, country: v.country,
            city: v.city, topics: v.topics, flags: v.flags, caption: v.caption, kind: v.kind }));
        return json({ items }, 200, { 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' });
      }
      if (p.startsWith('/thumb/')) return await thumb(p.slice(7), req, env, ctx);

      if (p.startsWith('/api/admin/')) {
        if (!env.ADMIN_KEY) return json({ error: 'ADMIN_KEY 시크릿이 등록되지 않았습니다.' }, 503);
        if (req.headers.get('x-admin-key') !== env.ADMIN_KEY) return json({ error: '관리자 키가 맞지 않습니다.' }, 401);
        if (p === '/api/admin/all') {
          const [videos, tags] = await Promise.all([getVideos(env), getTags(env)]);
          return json({ syncedAt: videos.syncedAt, items: merged(videos, tags), vocab: vocab(tags) });
        }
        if (p === '/api/admin/sync' && req.method === 'POST') return json(await sync(env));
        if (p === '/api/admin/save' && req.method === 'POST') return json(await save(env, await req.json()));
      }
      if (env.ASSETS) return env.ASSETS.fetch(req);
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sync(env).catch(() => {}));
  },
};

// ───────────────────────── 화면 ─────────────────────────
const BASE_CSS = String.raw`
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#10131a;background:#fff;line-height:1.45}
a{color:inherit;text-decoration:none}
.wrap{max-width:1040px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:22px;margin:0 0 4px}
h1 span{background:linear-gradient(transparent 62%,#d4ff3a 62%)}
.sub{color:#667085;font-size:13px;margin:0 0 16px}
input[type=text],input[type=search],input[type=password]{font:inherit;padding:10px 12px;border:1.5px solid #d5d9e2;border-radius:10px;outline:none;width:100%}
input:focus{border-color:#1f4bff}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.chip{font:inherit;font-size:13px;padding:6px 11px;border-radius:999px;border:1.5px solid #d5d9e2;background:#fff;color:#10131a;cursor:pointer}
.chip small{color:#98a1b3;margin-left:4px}
.chip.on{background:#1f4bff;border-color:#1f4bff;color:#fff}
.chip.on small{color:#cfd9ff}
.label{font-size:12px;color:#667085;margin-top:14px}
.tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:6px;background:#eef2ff;color:#1f4bff;margin:2px 3px 0 0}
.tag.flag{background:#f2f4f7;color:#667085}
.empty{padding:50px 0;text-align:center;color:#667085}
button.btn{font:inherit;font-size:13px;padding:8px 14px;border-radius:10px;border:0;background:#1f4bff;color:#fff;cursor:pointer}
button.btn.ghost{background:#eef2ff;color:#1f4bff}
button.btn:disabled{opacity:.5;cursor:default}
`;

const SHARED_JS = String.raw`
function el(tag, attrs, kids) {
  var n = document.createElement(tag), k;
  attrs = attrs || {};
  for (k in attrs) {
    if (k === 'text') n.textContent = attrs[k];
    else if (k === 'cls') n.className = attrs[k];
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
  return n;
}
function countBy(list, fn) {
  var m = {};
  list.forEach(function (v) { [].concat(fn(v)).forEach(function (k) { if (k) m[k] = (m[k] || 0) + 1; }); });
  return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
}
`;

// 공개 검색 화면. 독립 페이지(/)와 홈페이지 삽입(/embed.js)이 같은 코드를 쓴다.
// 홈페이지에 넣을 때:  <div id="lucas-catalog"></div><script src="https://<이 Worker 주소>/embed.js"></script>
const EMBED_CSS = String.raw`
.lc{font-family:inherit;color:inherit;line-height:1.45}
.lc *{box-sizing:border-box}
.lc-q{font:inherit;padding:11px 14px;border:1.5px solid #d5d9e2;border-radius:12px;outline:none;width:100%;background:#fff;color:#10131a}
.lc-q:focus{border-color:#1f4bff}
.lc-label{font-size:12px;color:#667085;margin-top:14px}
.lc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.lc-chip{font:inherit;font-size:13px;padding:6px 11px;border-radius:999px;border:1.5px solid #d5d9e2;background:#fff;color:#10131a;cursor:pointer}
.lc-chip small{color:#98a1b3;margin-left:4px}
.lc-chip.on{background:#1f4bff;border-color:#1f4bff;color:#fff}
.lc-chip.on small{color:#cfd9ff}
.lc-count{font-size:13px;color:#667085;margin-top:14px}
.lc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px 12px;margin-top:14px}
.lc-card{color:inherit;text-decoration:none;display:block}
.lc-ph{aspect-ratio:4/5;border-radius:12px;overflow:hidden;background:#eef0f4}
.lc-ph img{width:100%;height:100%;object-fit:cover;display:block}
.lc-card.ended .lc-ph{opacity:.55}
.lc-t{font-size:14px;font-weight:600;margin-top:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lc-r{font-size:12px;color:#667085;margin-top:2px}
.lc-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:6px;background:#eef2ff;color:#1f4bff;margin:2px 3px 0 0}
.lc-tag.flag{background:#f2f4f7;color:#667085}
.lc-empty{padding:40px 0;text-align:center;color:#667085}
.lc-more{display:block;margin:22px auto 0;font:inherit;font-size:14px;padding:10px 22px;border-radius:999px;border:1.5px solid #1f4bff;background:#fff;color:#1f4bff;cursor:pointer}
`;

const EMBED_JS = String.raw`(function () {
/*SHARED_JS*/
var script = document.currentScript;
var ORIGIN = script && script.src ? new URL(script.src).origin : '';
var root = document.getElementById('lucas-catalog');
if (!root) return;
var SYNC = root.getAttribute('data-sync') === '1';
var PAGE = parseInt(root.getAttribute('data-page-size'), 10) || 12;
var DATA = [], S = { q: '', c: '', city: '', t: '', k: '' }, shown = PAGE;
document.head.appendChild(el('style', { text: /*EMBED_CSS*/ }));
root.className = (root.className + ' lc').trim();
var input = el('input', { cls: 'lc-q', type: 'search', placeholder: root.getAttribute('data-placeholder') || '예: 로마, 공항 꿀팁, 젤라또' });
var filters = el('div'), count = el('div', { cls: 'lc-count' }), grid = el('div', { cls: 'lc-grid' });
var empty = el('div', { cls: 'lc-empty' }), more = el('button', { cls: 'lc-more', type: 'button', text: '더 보기' });
[input, filters, count, grid, more, empty].forEach(function (n) { root.appendChild(n); });
try {
  var p0 = new URLSearchParams(location.search);
  S.q = p0.get('q') || ''; S.c = p0.get('c') || ''; S.city = p0.get('city') || ''; S.t = p0.get('t') || '';
  input.value = S.q;
} catch (e) {}
function writeParams() {
  if (!SYNC) return;
  try {
    var p = new URLSearchParams();
    if (S.q) p.set('q', S.q); if (S.c) p.set('c', S.c); if (S.city) p.set('city', S.city); if (S.t) p.set('t', S.t);
    var s = p.toString();
    history.replaceState(null, '', s ? '?' + s : location.pathname);
  } catch (e) {}
}
function match(v, skip) {
  if (skip !== 'c' && S.c && v.country !== S.c) return false;
  if (skip !== 'c' && skip !== 'city' && S.city && v.city !== S.city) return false;
  if (skip !== 't' && S.t && v.topics.indexOf(S.t) < 0) return false;
  if (skip !== 'k' && S.k && v.kind !== S.k) return false;
  if (S.q) {
    var hay = [v.title, v.country, v.city, v.topics.join(' '), v.caption].join(' ').toLowerCase();
    var words = S.q.toLowerCase().split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
  }
  return true;
}
function chipRow(label, pairs, cur, pick) {
  if (!pairs.length) return null;
  var row = el('div', { cls: 'lc-chips' });
  row.appendChild(el('button', { cls: 'lc-chip' + (cur ? '' : ' on'), type: 'button', text: '전체', onclick: function () { pick(''); } }));
  pairs.forEach(function (p) {
    row.appendChild(el('button', { cls: 'lc-chip' + (cur === p[0] ? ' on' : ''), type: 'button', onclick: function () { pick(cur === p[0] ? '' : p[0]); } },
      [document.createTextNode(p[0]), el('small', { text: String(p[1]) })]));
  });
  return el('div', {}, [el('div', { cls: 'lc-label', text: label }), row]);
}
function render() {
  writeParams();
  filters.textContent = '';
  var a = chipRow('나라', countBy(DATA.filter(function (v) { return match(v, 'c'); }), function (v) { return v.country; }), S.c,
    function (x) { S.c = x; S.city = ''; shown = PAGE; render(); });
  if (a) filters.appendChild(a);
  if (S.c) {
    var b = chipRow('도시', countBy(DATA.filter(function (v) { return match(v, 'city'); }), function (v) { return v.city; }), S.city,
      function (x) { S.city = x; shown = PAGE; render(); });
    if (b) filters.appendChild(b);
  }
  var c = chipRow('주제', countBy(DATA.filter(function (v) { return match(v, 't'); }), function (v) { return v.topics; }), S.t,
    function (x) { S.t = x; shown = PAGE; render(); });
  if (c) filters.appendChild(c);
  var kinds = countBy(DATA.filter(function (v) { return match(v, 'k'); }), function (v) { return v.kind; });
  if (kinds.length > 1 || S.k) {
    var d = chipRow('형식', kinds, S.k, function (x) { S.k = x; shown = PAGE; render(); });
    if (d) filters.appendChild(d);
  }

  var list = DATA.filter(function (v) { return match(v); });
  grid.textContent = '';
  list.slice(0, shown).forEach(function (v) {
    var ended = v.flags.indexOf('종료') >= 0;
    var tags = el('div', {}, v.topics.map(function (t) { return el('span', { cls: 'lc-tag', text: t }); })
      .concat(v.flags.map(function (t) { return el('span', { cls: 'lc-tag flag', text: t }); })));
    grid.appendChild(el('a', { cls: 'lc-card' + (ended ? ' ended' : ''), href: v.link, target: '_blank', rel: 'noopener' }, [
      el('div', { cls: 'lc-ph' }, [el('img', { src: ORIGIN + '/thumb/' + v.id, alt: '', loading: 'lazy' })]),
      el('div', { cls: 'lc-t', text: v.title }),
      el('div', { cls: 'lc-r', text: [v.country, v.city].filter(Boolean).join(' · ') }),
      tags
    ]));
  });
  count.textContent = DATA.length ? list.length + '개' : '';
  more.hidden = list.length <= shown;
  more.textContent = '더 보기 (' + (list.length - shown) + '개 남음)';
  empty.hidden = list.length > 0;
  empty.textContent = DATA.length ? '조건에 맞는 게시물이 없어요.' : '아직 공개된 게시물이 없습니다.';
}
input.addEventListener('input', function (e) { S.q = e.target.value.trim(); shown = PAGE; render(); });
more.addEventListener('click', function () { shown += PAGE; render(); });
fetch(ORIGIN + '/api/catalog').then(function (r) { return r.json(); }).then(function (j) {
  DATA = (j.items || []).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  render();
}).catch(function () { empty.hidden = false; more.hidden = true; empty.textContent = '목록을 불러오지 못했습니다.'; });
})();`.replace('/*SHARED_JS*/', () => SHARED_JS).replace('/*EMBED_CSS*/', () => JSON.stringify(EMBED_CSS));

const ADMIN_HTML = String.raw`<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>카탈로그 관리 — 태그 확정</title>
<style>/*BASE_CSS*/
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}
.bar input{max-width:260px}
.msg{font-size:13px;color:#667085}
.row{display:grid;grid-template-columns:96px 1fr;gap:14px;padding:16px 0;border-top:1px solid #eceef2}
.row img{width:96px;aspect-ratio:4/5;object-fit:cover;border-radius:10px;background:#eef0f4}
.row.done{background:#fafcf0}
.cap{font-size:13px;color:#475467;white-space:pre-wrap;max-height:4.4em;overflow:hidden;cursor:pointer}
.cap.open{max-height:none}
.meta{font-size:12px;color:#98a1b3;margin-bottom:4px}
.fields{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin:8px 0}
.fields input{padding:7px 9px;font-size:13px}
.row .chips{margin:6px 0}
.row .chip{font-size:12px;padding:4px 9px}
.chip.flagon{background:#10131a;border-color:#10131a;color:#fff}
.add{width:110px !important;padding:4px 9px !important;font-size:12px !important;border-radius:999px !important}
.acts{display:flex;gap:10px;align-items:center;font-size:13px;margin-top:6px}
@media(max-width:560px){.fields{grid-template-columns:1fr 1fr}.fields input:first-child{grid-column:1/3}}
</style></head><body><div class="wrap">
<h1><span>카탈로그 관리</span></h1>
<p class="sub">초안 태그를 고친 뒤 "확정"을 누르면 공개 페이지에 올라갑니다. 확정 전 영상은 공개되지 않습니다.</p>
<div id="login">
  <div class="bar"><input id="key" type="password" placeholder="관리자 키 (ADMIN_KEY)"><button class="btn" id="enter">들어가기</button></div>
</div>
<div id="app" hidden>
  <div class="bar">
    <button class="btn" id="sync">인스타에서 새로 가져오기</button>
    <button class="btn ghost" id="confirmAll">보이는 항목 모두 확정</button>
    <a class="btn ghost" href="/#videos" target="_blank" style="padding:8px 14px;border-radius:10px;font-size:13px;background:#eef2ff;color:#1f4bff">공개 페이지 보기</a>
    <span class="msg" id="msg"></span>
  </div>
  <div class="bar">
    <div class="chips" id="views" style="margin:0"></div>
    <input id="q" type="search" placeholder="캡션·태그 검색">
  </div>
  <div id="list"></div>
  <datalist id="dlCountry"></datalist><datalist id="dlCity"></datalist>
</div>
</div>
<script>/*SHARED_JS*/
var KEY = '', DATA = [], VOCAB = { countries: [], cities: [], topics: [], flags: [] }, VIEW = 'todo', Q = '';
try { KEY = localStorage.getItem('catalogAdminKey') || ''; } catch (e) {}
function msg(t) { document.getElementById('msg').textContent = t || ''; }
function api(path, body) {
  return fetch('/api/admin/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-admin-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
}
function load() {
  return api('all').then(function (j) {
    DATA = j.items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    VOCAB = j.vocab;
    document.getElementById('login').hidden = true; document.getElementById('app').hidden = false;
    try { localStorage.setItem('catalogAdminKey', KEY); } catch (e) {}
    fillList('dlCountry', VOCAB.countries); fillList('dlCity', VOCAB.cities);
    msg(j.syncedAt ? '마지막 동기화: ' + new Date(j.syncedAt).toLocaleString('ko-KR') : '아직 가져온 영상이 없습니다. "인스타에서 새로 가져오기"를 눌러 주세요.');
    render();
  });
}
function fillList(id, arr) {
  var d = document.getElementById(id); d.textContent = '';
  arr.forEach(function (x) { d.appendChild(el('option', { value: x })); });
}
function visible() {
  var words = Q.toLowerCase().split(' ').filter(Boolean);
  return DATA.filter(function (v) {
    if (VIEW === 'todo' && v.confirmed) return false;
    if (VIEW === 'done' && !v.confirmed) return false;
    var hay = [v.title, v.country, v.city, v.topics.join(' '), v.flags.join(' '), v.caption].join(' ').toLowerCase();
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    return true;
  });
}
function payload(v) {
  return { id: v.id, title: v.title, country: v.country, city: v.city, topics: v.topics, flags: v.flags, hidden: v.hidden, confirmed: v.confirmed };
}
function saveOne(v, confirmed) {
  v.confirmed = confirmed;
  msg('저장 중…');
  return api('save', { items: [payload(v)] }).then(function () { msg('저장했습니다: ' + v.title); render(); })
    .catch(function (e) { msg('저장 실패: ' + e.message); });
}
function toggle(arr, x) { var i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); else arr.push(x); }
function rowEl(v) {
  var topicBox = el('div', { cls: 'chips' });
  function drawTopics() {
    topicBox.textContent = '';
    var all = VOCAB.topics.slice();
    v.topics.forEach(function (t) { if (all.indexOf(t) < 0) all.push(t); });
    all.forEach(function (t) {
      topicBox.appendChild(el('button', { cls: 'chip' + (v.topics.indexOf(t) >= 0 ? ' on' : ''), text: t,
        onclick: function () { toggle(v.topics, t); drawTopics(); } }));
    });
    VOCAB.flags.forEach(function (t) {
      topicBox.appendChild(el('button', { cls: 'chip' + (v.flags.indexOf(t) >= 0 ? ' flagon' : ''), text: t,
        onclick: function () { toggle(v.flags, t); drawTopics(); } }));
    });
    topicBox.appendChild(el('input', { cls: 'add', type: 'text', placeholder: '+ 주제 추가', onkeydown: function (e) {
      if (e.key !== 'Enter') return;
      var t = e.target.value.trim(); if (!t) return;
      if (VOCAB.topics.indexOf(t) < 0) VOCAB.topics.push(t);
      if (v.topics.indexOf(t) < 0) v.topics.push(t);
      drawTopics();
    } }));
  }
  drawTopics();
  function field(key, ph, list) {
    return el('input', { type: 'text', value: v[key] || '', placeholder: ph, list: list || null,
      oninput: function (e) { v[key] = e.target.value; } });
  }
  var cap = el('div', { cls: 'cap', text: v.caption || '(캡션 없음)', title: '눌러서 전체 보기',
    onclick: function () { cap.classList.toggle('open'); } });
  var hide = el('input', { type: 'checkbox', onchange: function (e) { v.hidden = e.target.checked; } });
  hide.checked = !!v.hidden;
  var acts = el('div', { cls: 'acts' }, [
    el('button', { cls: 'btn', text: v.confirmed ? '수정 저장' : '확정', onclick: function () { saveOne(v, true); } }),
    v.confirmed ? el('button', { cls: 'btn ghost', text: '확정 취소', onclick: function () { saveOne(v, false); } }) : null,
    el('label', {}, [hide, document.createTextNode(' 공개 페이지에서 숨기기')])
  ]);
  return el('div', { cls: 'row' + (v.confirmed ? ' done' : '') }, [
    el('a', { href: v.link, target: '_blank', rel: 'noopener' }, [el('img', { src: '/thumb/' + v.id, alt: '', loading: 'lazy' })]),
    el('div', {}, [
      el('div', { cls: 'meta', text: String(v.date).slice(0, 10) + ' · ' + (v.kind || '영상') + (v.confirmed ? ' · 확정됨' : ' · 초안') }),
      cap,
      el('div', { cls: 'fields' }, [field('title', '제목'), field('country', '나라', 'dlCountry'), field('city', '도시', 'dlCity')]),
      topicBox, acts
    ])
  ]);
}
function render() {
  var todo = DATA.filter(function (v) { return !v.confirmed; }).length;
  var views = document.getElementById('views'); views.textContent = '';
  [['todo', '미확정 ' + todo], ['done', '확정 ' + (DATA.length - todo)], ['all', '전체 ' + DATA.length]].forEach(function (p) {
    views.appendChild(el('button', { cls: 'chip' + (VIEW === p[0] ? ' on' : ''), text: p[1], onclick: function () { VIEW = p[0]; render(); } }));
  });
  var list = document.getElementById('list'); list.textContent = '';
  var rows = visible();
  rows.forEach(function (v) { list.appendChild(rowEl(v)); });
  if (!rows.length) list.appendChild(el('div', { cls: 'empty', text: DATA.length ? '여기에 해당하는 영상이 없습니다.' : '영상이 없습니다.' }));
}
document.getElementById('enter').addEventListener('click', function () {
  KEY = document.getElementById('key').value.trim();
  load().catch(function (e) { alert(e.message); });
});
document.getElementById('q').addEventListener('input', function (e) { Q = e.target.value.trim(); render(); });
document.getElementById('sync').addEventListener('click', function (e) {
  e.target.disabled = true; msg('인스타에서 가져오는 중…');
  api('sync', {}).then(function (j) { return load().then(function () { msg('영상 ' + j.total + '개 확인, 새 초안 ' + j.added + '개'); }); })
    .catch(function (err) { msg('가져오기 실패: ' + err.message); })
    .then(function () { e.target.disabled = false; });
});
document.getElementById('confirmAll').addEventListener('click', function () {
  var rows = visible().filter(function (v) { return !v.confirmed; });
  if (!rows.length) { msg('확정할 항목이 없습니다.'); return; }
  if (!confirm('지금 보이는 미확정 ' + rows.length + '개를 현재 태그 그대로 확정할까요?')) return;
  rows.forEach(function (v) { v.confirmed = true; });
  api('save', { items: rows.map(payload) }).then(function () { msg(rows.length + '개 확정했습니다.'); render(); })
    .catch(function (e) { rows.forEach(function (v) { v.confirmed = false; }); msg('저장 실패: ' + e.message); render(); });
});
if (KEY) load().catch(function () { KEY = ''; });
</script></body></html>`.replace('/*BASE_CSS*/', () => BASE_CSS).replace('/*SHARED_JS*/', () => SHARED_JS);

export { draftTags, makeTitle };
