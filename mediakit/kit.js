// 미디어킷 공통 스크립트 — 언어 전환(한·영·일·이), 이메일 복사.
// 각 페이지가 window.KIT_T(문구)와 필요하면 window.KIT_RENDER(lang, t)를 먼저 정의해요.
(function () {
  var LANGS = ["ko", "en", "ja", "it"];
  var EMAIL = "everywherelucas365@gmail.com";
  var T = window.KIT_T;
  var lang = "ko";

  function render() {
    var t = T[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-t]").forEach(function (n) { n.textContent = t[n.dataset.t]; });
    document.querySelectorAll("[data-alt]").forEach(function (n) { n.alt = t[n.dataset.alt]; });
    document.querySelectorAll("[data-home]").forEach(function (n) { n.href = lang === "ko" ? "/" : "/en/"; });
    document.querySelectorAll("[data-go]").forEach(function (n) { n.href = n.dataset.go + "#" + lang; });
    document.querySelectorAll(".langs button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    if (window.KIT_RENDER) window.KIT_RENDER(lang, t);
  }
  function fromHash() { var h = location.hash.replace("#", ""); return LANGS.indexOf(h) >= 0 ? h : null; }
  function initial() {
    var h = fromHash(); if (h) return h;
    var nav = (navigator.language || "ko").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) >= 0 ? nav : "en";
  }
  document.querySelectorAll(".langs button").forEach(function (b) {
    b.addEventListener("click", function () {
      lang = b.dataset.lang; render();
      try { history.replaceState(null, "", "#" + lang); } catch (e) { location.hash = lang; }
    });
  });
  window.addEventListener("hashchange", function () { var h = fromHash(); if (h && h !== lang) { lang = h; render(); } });

  var copy = document.getElementById("copy");
  if (copy) copy.addEventListener("click", function () {
    var done = function () { copy.textContent = T[lang].copied; setTimeout(function () { copy.textContent = T[lang].copy; }, 1800); };
    try { navigator.clipboard.writeText(EMAIL).then(done, select); } catch (e) { select(); }
    function select() {
      var r = document.createRange(); r.selectNodeContents(document.querySelector(".mail"));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });

  lang = initial();
  render();
})();
