// Dyredata website: header line on scroll, and the paw trail across the front page (once, on load).
(function () {
  var head = document.querySelector(".site-head");
  if (head) {
    var onScroll = function () { head.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var trail = document.getElementById("trail");
  if (!trail) return;
  var paw = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="16.2" rx="5.2" ry="4.4"/><ellipse cx="5.4" cy="10.6" rx="2.2" ry="2.8"/><ellipse cx="9.4" cy="6.6" rx="2.2" ry="2.9"/><ellipse cx="14.6" cy="6.6" rx="2.2" ry="2.9"/><ellipse cx="18.6" cy="10.6" rx="2.2" ry="2.8"/></svg>';

  // A dog wandering in from the bottom left, sniffing its way up towards the download buttons
  function place(animate) {
    trail.innerHTML = "";
    var w = trail.clientWidth, h = trail.clientHeight;
    if (!w || !h) return;
    var narrow = w < 860;
    // Desktop: along the bottom, then up through the gap between the text and the phone.
    // Phone: from the bottom left up beside the phone, below the buttons.
    var from = { x: -10, y: h * (narrow ? 0.99 : 0.95) };
    var to = narrow ? { x: w * 0.1, y: h * 0.55 } : { x: w * 0.535, y: h * 0.22 };
    var ctrl = narrow ? { x: w * 0.02, y: h * 0.8 } : { x: w * 0.4, y: h * 1.04 };
    var steps = narrow ? 8 : 15;
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ctrl.x + t * t * to.x;
      var y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * ctrl.y + t * t * to.y;
      var dx = 2 * (1 - t) * (ctrl.x - from.x) + 2 * t * (to.x - ctrl.x);
      var dy = 2 * (1 - t) * (ctrl.y - from.y) + 2 * t * (to.y - ctrl.y);
      var len = Math.hypot(dx, dy) || 1;
      var side = i % 2 ? 1 : -1;
      var holder = document.createElement("span");
      holder.innerHTML = paw;
      var svg = holder.firstChild;
      svg.style.left = (x - side * 11 * dy / len - 15) + "px";
      svg.style.top = (y + side * 11 * dx / len - 15) + "px";
      svg.style.setProperty("--r", (Math.atan2(dy, dx) * 180 / Math.PI + 90) + "deg");
      if (animate) svg.style.animationDelay = (250 + i * 150) + "ms";
      else svg.style.animation = "none", svg.style.opacity = "0.22", svg.style.transform = "rotate(var(--r))";
      trail.appendChild(svg);
    }
  }
  place(true);
  var timer;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { place(false); }, 150);
  });
})();

// The reminders on the hero phone arrive one by one, once, when the hero is in view and the paw trail has had its
// moment. Reduced motion: the finished stack is shown as it is.
(function () {
  var list = document.querySelector("[data-notes]");
  if (!list) return;
  var items = Array.prototype.slice.call(list.children);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function layout(arrived) {
    items.forEach(function (li, i) {
      li.setAttribute("data-pos", i < arrived ? String(Math.min(arrived - 1 - i, 2)) : "out");
    });
    // The ones behind take the newest one's height, so only their edges show below it
    var top = items[arrived - 1];
    if (top) list.style.setProperty("--top", top.offsetHeight + "px");
  }
  if (reduce || !("IntersectionObserver" in window)) {
    layout(items.length);
    list.classList.add("live");
    return;
  }
  layout(0);
  // Let the hidden state settle before the transitions are switched on
  requestAnimationFrame(function () { requestAnimationFrame(function () { list.classList.add("live"); }); });
  var loadedAt = Date.now();
  var started = false;
  function run() {
    if (started) return;
    started = true;
    var n = 0;
    (function next() {
      n += 1;
      layout(n);
      if (n < items.length) setTimeout(next, 1250);
    })();
  }
  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    setTimeout(run, Math.max(600, 2300 - (Date.now() - loadedAt)));
  }, { threshold: 0.6 });
  io.observe(list);
})();

// The leash countdown line (front page and tools page) is written at build time; keep it right on later days.
(function () {
  var lines = document.querySelectorAll("[data-leash-line]");
  if (!lines.length) return;
  var months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  var now = new Date();
  var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  var y = now.getFullYear();
  var start = Date.UTC(y, 3, 1), end = Date.UTC(y, 7, 20);
  var day = 86400000, text;
  if (today >= start && today <= end) {
    var left = Math.round((end - today) / day) + 1;
    text = "Båndtvang i hele landet nå, " + left + (left === 1 ? " dag" : " dager") + " igjen til og med 20. august.";
  } else {
    if (today > end) { y += 1; start = Date.UTC(y, 3, 1); }
    var until = Math.round((start - today) / day);
    text = "Båndtvangen starter om " + until + (until === 1 ? " dag" : " dager") + ", 1. " + months[3] + " " + y + ".";
  }
  for (var i = 0; i < lines.length; i++) lines[i].textContent = text;
})();
