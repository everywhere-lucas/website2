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

// 메일 보내기: PC에서는 메일 앱이 설정 안 된 경우가 많아 Gmail 쓰기 창을 열고, 휴대폰은 기본 메일 앱(mailto)을 써요
(function () {
  var btn = document.getElementById('mailBtn'), copy = document.getElementById('mailCopy');
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (btn && !mobile) {
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      var to = btn.getAttribute('data-email');
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to), '_blank', 'noopener');
    });
  }
  if (copy) {
    copy.addEventListener('click', function () {
      var to = copy.getAttribute('data-email'), label = copy.textContent;
      function done() { copy.textContent = copy.getAttribute('data-done'); setTimeout(function () { copy.textContent = label; }, 1800); }
      function fallback() {
        var t = document.createElement('textarea'); t.value = to; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(to).then(done, fallback); else fallback();
    });
  }
})();
