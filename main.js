// 인기 영상 나라별 탭 전환 + 지도 버튼 + 스크롤 등장 효과
(function () {
  var tabs = document.querySelectorAll('.tab');
  var cards = document.querySelectorAll('.vid');
  var empty = document.getElementById('vidEmpty');

  function show(r) {
    var n = 0;
    tabs.forEach(function (t) { t.classList.toggle('on', t.dataset.r === r); });
    cards.forEach(function (c) {
      var on = c.dataset.region === r; c.hidden = !on;
      if (on) { n++; c.classList.add('in'); }
    });
    if (empty) empty.hidden = n > 0;
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.r); }); });
  if (tabs.length) show(tabs[0].dataset.r);
  cards.forEach(function (c) { c.classList.remove('in'); });

  document.querySelectorAll('.vid .map').forEach(function (m) {
    m.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      window.open(m.dataset.href, '_blank', 'noopener');
    });
  });

  // 스크롤하면 카드가 차례로 떠오르기
  var els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target, sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 6) * 70 + 'ms';
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();
