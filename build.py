"""content.json(항목) + texts.json(문구)을 읽어서 dist/ 폴더에 한글(/) · 영문(/en/) 페이지를 만듭니다.
Netlify가 커밋할 때마다 자동으로 실행해요. 이 파일은 고칠 필요 없어요.
내 컴퓨터에서 미리 보려면:  python build.py  → dist/index.html 열기
"""
import json, html, shutil
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
C = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
C.update(json.loads((ROOT / "texts.json").read_text(encoding="utf-8")))
for _k in ["channels", "videos", "guides", "items"]:
    C[_k] = [x for x in C.get(_k, []) if not x.get("hide")]   # '숨기기' 체크한 항목은 사이트에서 빼기
SITE = C["site_url"].rstrip("/") + "/"
PATHS = {"ko": "", "en": "en/"}
# content.json에 첫 화면 사진(destinations)이 없을 때 쓰는 기본값
C.setdefault("destinations", [
  { "code": "KOR", "city": { "ko": "한국", "en": "Korea" }, "photo": "", "hide": False },
    { "code": "JPN", "city": { "ko": "일본", "en": "Japan" }, "photo": "", "hide": False },
    { "code": "FRA", "city": { "ko": "프랑스", "en": "France" }, "photo": "", "hide": False },
    { "code": "ITA", "city": { "ko": "이탈리아", "en": "Italy" }, "photo": "", "hide": False },
    { "code": "IDN", "city": { "ko": "인도네시아", "en": "Indonesia" }, "photo": "", "hide": False },
    { "code": "THA", "city": { "ko": "태국", "en": "Thailand" }, "photo": "", "hide": False },
    { "code": "ZAF", "city": { "ko": "남아공", "en": "South Africa" }, "photo": "", "hide": False },
    { "code": "AUS", "city": { "ko": "호주", "en": "Australia" }, "photo": "", "hide": False },
    { "code": "DEU", "city": { "ko": "독일", "en": "Germany" }, "photo": "", "hide": False },
    { "code": "CHN", "city": { "ko": "중국", "en": "China" }, "photo": "", "hide": False }

])


def L(v, lang):
    return v.get(lang, "") if isinstance(v, dict) else (v or "")


def e(s):
    return html.escape(str(s), quote=True)


def fmt(n, lang):
    n = int(n)
    if lang == "ko":
        return f"{round(n / 10000)}만" if n >= 10000 else f"{n:,}"
    if n >= 1_000_000:
        return f"{n / 1e6:.1f}".rstrip("0").rstrip(".") + "M"
    return f"{round(n / 1000)}K" if n >= 1000 else str(n)


def link(url):
    return f'href="{e(url)}"' + (' target="_blank" rel="noopener"' if url.startswith("http") else "")


def page(lang):
    t, s = C["text"][lang], C["seo"][lang]
    pre = "../" if lang == "en" else ""
    src = lambda p: p if (not p or p.startswith("http")) else pre + p
    url = SITE + PATHS[lang]
    share = C.get("share_image") or "images/og-default.png"   # 공유 미리보기 사진 (비워두면 기본 이미지)
    share_url = share if share.startswith("http") else SITE + share.lstrip("/")
    og_img = (f'<meta property="og:image" content="{e(share_url)}">\n'
              f'<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
              f'<meta property="og:site_name" content="{e(L({"ko": "루카스 여행", "en": "Lucas Travel"}, lang))}">\n'
              f'<meta name="twitter:image" content="{e(share_url)}">')

    dests = [d for d in C.get("destinations", []) if not d.get("hide")][:4]
    tiles = "".join(f"""
        <figure class="tile t{i + 1}">
          {f'<img src="{e(src(d["photo"]))}" alt="{e(L(d["city"], lang))}">' if d.get('photo') else '<span class="tile-ph"></span>'}
          <figcaption><b>{e(d.get('code', ''))}</b>{e(L(d['city'], lang))}</figcaption>
        </figure>""" for i, d in enumerate(dests))
    cities = " ✈ ".join(e(L(d["city"], "en")).upper() for d in C.get("destinations", []) if not d.get("hide"))
    marquee = f'<span>{cities} ✈ </span>' * 4
    face = f'<img src="{e(src(C["profile_image"]))}" alt="Lucas">' if C.get("profile_image") else '<span>✈</span>'

    channels = "".join(f"""
      <a class="rv ch{' main' if c.get('main') else ''}" {link(c['url'])}>
        <div class="top"><span>{e(L(c['label'], lang))}</span><span class="arrow">↗</span></div>
        <div><b>{e(L(c['name'], lang))}</b><div style="font-size:13px;opacity:.7">{e(L(c['handle'], lang))}</div></div>
      </a>""" for c in C["channels"])

    tabs = "".join(
        f'<button class="tab{" on" if i == 0 else ""}" data-r="{e(r["id"])}">{e(L(r["name"], lang))}'
        + (f'<span class="soon">{t["soon"]}</span>' if r.get("soon") else "") + "</button>"
        for i, r in enumerate(C["regions"]))

    first = C["regions"][0]["id"] if C["regions"] else ""
    videos = "".join(f"""
      <a class="rv vid" data-region="{e(v['region'])}"{'' if v['region'] == first else ' hidden'} {link(v['url'])}>
        {f'<img src="{e(src(v["thumb"]))}" alt="{e(L(v["title"], lang))}" loading="lazy">' if v.get('thumb') else f'<span class="ph">{t["no_img"]}</span>'}
        <span class="views">▶ {fmt(v.get('views') or 0, lang)}</span>
        <div class="info">
          <h3>{e(L(v['title'], lang))}</h3>
          <div class="place">📍 {e(L(v['place'], lang))}</div>
          {f'<span class="map" data-href="{e(v["map"])}">{t["map"]} ↗</span>' if v.get('map') else ''}
        </div>
      </a>""" for v in C["videos"])

    guides = "".join(f"""
      <a class="rv guide" {link(g['url'])}>
        <div class="thumb">{f'<img src="{e(src(g["img"]))}" alt="{e(L(g["title"], lang))}" loading="lazy">' if g.get('img') else t['no_img']}</div>
        <div class="t"><div class="tag">{e(g['tag'])}</div><h3>{e(L(g['title'], lang))}</h3></div>
      </a>""" for g in C["guides"])

    items = "".join(f"""
      <a class="rv item" href="{e(it['url'])}" target="_blank" rel="noopener sponsored">
        <div class="img">{f'<img src="{e(src(it["img"]))}" alt="{e(L(it["name"], lang))}" loading="lazy">' if it.get('img') else t['no_img']}<span class="cat">{e(it['cat'])}</span></div>
        <div class="body"><h3>{e(L(it['name'], lang))}</h3><p>{e(L(it['why'], lang))}</p><div class="buy">{t['buy']}</div></div>
      </a>""" for it in C["items"])

    photo = (f'<img src="{e(src(C["profile_image"]))}" alt="Lucas">' if C.get("profile_image")
             else f'<span>{t["photo"]}</span>')

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add("js")</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(s['title'])}</title>
<meta name="description" content="{e(s['description'])}">
<link rel="canonical" href="{url}">
<link rel="icon" href="{pre}images/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{pre}images/favicon-48.png" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="{pre}images/apple-touch-icon.png">
<link rel="alternate" hreflang="ko" href="{SITE}">
<link rel="alternate" hreflang="en" href="{SITE}en/">
<link rel="alternate" hreflang="x-default" href="{SITE}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(s['title'])}">
<meta property="og:description" content="{e(s['description'])}">
<meta property="og:locale" content="{'ko_KR' if lang == 'ko' else 'en_US'}">
{og_img}
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="{pre}style.css">
</head>
<body>

<nav>
  <div class="wrap">
    <a class="logo" href="#">everywhere.<span>lucas</span></a>
    <div class="menu">
      <a href="#channels">{t['nav_channels']}</a>
      <a href="#videos">{t['nav_videos']}</a>
      <a href="#guides">{t['nav_guides']}</a>
      <a href="#items">{t['nav_items']}</a>
      <a href="#contact">{t['nav_contact']}</a>
    </div>
    <div class="lang">
      <a href="{pre or './'}" hreflang="ko"{' class="on"' if lang == 'ko' else ''}>KR</a>
      <a href="{'./' if lang == 'en' else 'en/'}" hreflang="en"{' class="on"' if lang == 'en' else ''}>EN</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <div>
      <div class="eyebrow">TRAVEL CREATOR</div>
      <h1>{t['hero_title']}</h1>
      <p>{t['hero_desc']}</p>
      <div class="hero-cta">
        <a class="btn neon" href="#videos">{t['hero_btn']}</a>
        <a class="btn ghost" href="https://instagram.com/everywhere.lucas" target="_blank" rel="noopener">Instagram ↗</a>
      </div>
    </div>
    <div class="collage" aria-hidden="true">
      <svg class="flight" viewBox="0 0 400 400" preserveAspectRatio="none"><path d="M10 390 C 120 330, 60 150, 230 120 S 360 40, 392 8"/></svg>
      <span class="plane">✈</span>{tiles}
      <div class="stamp">
        <svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="57"/></svg>
        <div class="face">{face}</div>
      </div>
    </div>
  </div>
</header>

<div class="marquee" aria-hidden="true"><div class="track">{marquee}</div></div>

<section id="channels">
  <div class="wrap">
    <div class="head rv">
      <div><div class="eyebrow">CHANNELS</div><h2>{t['ch_title']}</h2></div>
      <p>{t['ch_desc']}</p>
    </div>
    <div class="channels">{channels}
    </div>
  </div>
</section>

<section id="videos">
  <div class="wrap">
    <div class="head rv">
      <div><div class="eyebrow">BEST SHORTS</div><h2>{t['vid_title']}</h2></div>
      <p>{t['vid_desc']}</p>
    </div>
    <div class="tabs">{tabs}</div>
    <div class="vid-grid">{videos}
      <div class="empty" id="vidEmpty" hidden>{t['empty']}</div>
    </div>
  </div>
</section>

<section id="guides">
  <div class="wrap">
    <div class="head rv">
      <div><div class="eyebrow">TRAVEL GUIDES</div><h2>{t['guide_title']}</h2></div>
      <p>{t['guide_desc']}</p>
    </div>
    <div class="guides">{guides}
    </div>
  </div>
</section>

<section id="items">
  <div class="wrap">
    <div class="head rv">
      <div><div class="eyebrow">TRAVEL KIT</div><h2>{t['item_title']}</h2></div>
      <p>{t['item_desc']}</p>
    </div>
    <div class="item-row">{items}
    </div>
    <div class="disclose">{t['disclose']}</div>
  </div>
</section>

<section id="contact" style="padding-bottom:0">
  <div class="wrap">
    <div class="contact rv">
      <div>
        <h2>{t['ct_title']}</h2>
        <p>{t['ct_desc']}</p>
      </div>
      <a class="btn neon" href="mailto:{e(C['email'])}">{t['ct_btn']}</a>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="eyebrow">WHY I TRAVEL</div>
    <div>
      <p>{t['promise']}</p>
      <div class="copy">© 2026 Lucas · everywhere.lucas</div>
    </div>
  </div>
</footer>

<script src="{pre}main.js"></script>
</body>
</html>
"""


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "en").mkdir(parents=True)
    (DIST / "index.html").write_text(page("ko"), encoding="utf-8")
    (DIST / "en" / "index.html").write_text(page("en"), encoding="utf-8")
    for f in ["style.css", "main.js"]:
        shutil.copy(ROOT / f, DIST / f)
    if (ROOT / "images").exists():
        shutil.copytree(ROOT / "images", DIST / "images")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{SITE}</loc></url>\n  <url><loc>{SITE}en/</loc></url>\n</urlset>\n",
        encoding="utf-8")
    print("완료: dist/index.html, dist/en/index.html")


if __name__ == "__main__":
    main()
