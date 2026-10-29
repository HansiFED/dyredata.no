// Dyredata website tools: the pregnancy calculator, the chocolate calculator and the leash countdown.
// The rules are the app's own (src/domain/breeding.ts, src/content/toxic.ts, src/content/leash.ts), except the cat
// pregnancy window, which follows Royal Canin (61 to 72 days).
(function () {
  "use strict";
  var MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  var DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
  var DAY = 86400000;

  // Dates are handled as UTC midnight so summer time never moves a day
  function parse(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  }
  function todayMs() {
    var n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function add(ms, days) { return ms + days * DAY; }
  function diff(a, b) { return Math.round((b - a) / DAY); }
  function fmt(ms, opts) {
    var d = new Date(ms);
    var s = d.getUTCDate() + ". " + MONTHS[d.getUTCMonth()];
    if (opts && opts.year) s += " " + d.getUTCFullYear();
    if (opts && opts.weekday) s = DAYS[d.getUTCDay()] + " " + s;
    return s;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function show(box, nodes) {
    box.classList.remove("in");
    box.innerHTML = "";
    nodes.forEach(function (n) { if (n) box.appendChild(n); });
    void box.offsetWidth; // restart the entrance
    box.classList.add("in");
  }
  function num(v) {
    var n = parseFloat(String(v || "").replace(/\s/g, "").replace(",", "."));
    return isFinite(n) && n > 0 ? n : NaN;
  }

  /* ───────── Pregnancy ───────── */
  var preg = document.getElementById("preg-form");
  if (preg) {
    var out = document.getElementById("preg-result");
    var first = document.getElementById("preg-first");
    var last = document.getElementById("preg-last");
    var ov = document.getElementById("preg-ov");
    var dogOnly = preg.querySelector("[data-dog-only]");
    var PLAN = {
      dog: [
        [25, "Ultralyd mulig", "Drektigheten kan bekreftes med ultralyd fra rundt dag 25 til 30."],
        [35, "Øk fôret gradvis", "Fra uke 5 trenger tispa mer energi. Snakk med veterinæren om valpefôr."],
        [55, "Røntgen for å telle valper", "Fra rundt dag 55 kan valpene telles på røntgen."],
        [56, "Gjør klar valpekassen", "La tispa venne seg til valpekassen den siste uka."],
        [58, "Mål temperaturen morgen og kveld", "Et fall til under 37,2 °C betyr ofte fødsel innen 12 til 24 timer."]
      ],
      cat: [
        [21, "Ultralyd mulig", "Drektigheten kan ofte bekreftes med ultralyd fra rundt dag 21."],
        [58, "Gjør klar fødekassen", "Sett fram en rolig fødekasse den siste uka."]
      ]
    };

    var calc = function () {
      var species = preg.querySelector("input[name=species]:checked").value;
      dogOnly.hidden = species !== "dog";
      var f = parse(first.value);
      if (isNaN(f)) {
        show(out, [el("p", "result-empty", "Velg datoen for parringen, så kommer terminen her.")]);
        return;
      }
      var l = parse(last.value);
      if (isNaN(l) || l < f) l = f;
      var o = species === "dog" ? parse(ov.value) : NaN;
      var start, due, earliest, latest, overdue, basis;
      if (species === "dog" && !isNaN(o)) {
        start = o; due = add(o, 63); earliest = add(o, 61); latest = add(o, 65); overdue = latest; basis = "eggløsningen";
      } else if (species === "dog") {
        start = f; due = add(f, 63); earliest = add(f, 58); latest = add(l, 68); overdue = add(f, 70); basis = "første parring";
      } else {
        start = f; due = add(f, 65); earliest = add(f, 61); latest = add(l, 72); overdue = add(f, 72); basis = "parringen";
      }
      var today = todayMs();
      var young = species === "dog" ? "Valpene" : "Kattungene";
      var nodes = [el("p", "label", "Termin, regnet fra " + basis), el("p", "big", cap(fmt(due, { weekday: true, year: true })))];
      nodes.push(el("p", "sub", young + " kan komme fra " + fmt(earliest) + " til " + fmt(latest, { year: true }) + "."));

      // Where the pregnancy is now, with the days the birth can come marked
      var dayNow = diff(start, today);
      if (dayNow >= 0 && today <= add(latest, 14)) {
        var span = diff(start, latest) || 1;
        var bar = el("div", "preg-bar");
        bar.appendChild(el("p", "label", "I dag er dag " + dayNow + " av drektigheten"));
        var track = el("div", "track");
        track.style.marginTop = "10px";
        var win = el("div", "window");
        win.style.left = (diff(start, earliest) / span) * 100 + "%";
        win.style.right = "0";
        var fill = el("div", "fill");
        track.appendChild(fill);
        track.appendChild(win);
        bar.appendChild(track);
        var ends = el("div", "ends");
        ends.appendChild(el("span", "", fmt(start)));
        ends.appendChild(el("span", "", fmt(latest)));
        bar.appendChild(ends);
        nodes.push(bar);
        requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = Math.min(100, (dayNow / span) * 100) + "%"; }); });
      }

      var late = today > overdue;
      var call = late
        ? "Det har gått mer enn " + diff(start, overdue) + " dager siden " + basis + ". Ring veterinæren hvis fødselen ikke har startet."
        : "Ring veterinæren hvis fødselen ikke har startet innen " + fmt(overdue, { year: true }) + ".";
      nodes.push(el("p", "note-line" + (late ? " warn" : ""), call));

      var list = el("ol", "plan");
      var nextMarked = false;
      PLAN[species].forEach(function (p) {
        var at = add(start, p[0]);
        var li = el("li");
        if (at < today) li.className = "done";
        else if (!nextMarked) { li.className = "next"; nextMarked = true; }
        var when = el("span", "when", fmt(at));
        when.appendChild(el("small", "", "dag " + p[0]));
        var what = el("span");
        what.appendChild(el("b", "", p[1]));
        what.appendChild(el("p", "", p[2]));
        li.appendChild(when);
        li.appendChild(what);
        list.appendChild(li);
      });
      nodes.push(list);
      show(out, nodes);
    };
    preg.addEventListener("input", calc);
    preg.addEventListener("change", calc);
    calc();
  }

  /* ───────── Chocolate ───────── */
  var choc = document.getElementById("choc-form");
  if (choc) {
    var res = document.getElementById("choc-result");
    var grams = document.getElementById("choc-grams");
    var kg = document.getElementById("choc-kg");
    var LIMIT = 20;
    var SCALE = 60; // the gauge runs from 0 to 60 mg per kg
    var fmtNum = function (n) { return (n < 10 ? (Math.round(n * 10) / 10) : Math.round(n)).toString().replace(".", ","); };
    var run = function () {
      var kind = choc.querySelector("input[name=kind]:checked");
      var mg = +kind.getAttribute("data-mg");
      var name = kind.parentNode.querySelector("span").firstChild.textContent.trim();
      var g = num(grams.value), w = num(kg.value);
      if (isNaN(g) || isNaN(w)) {
        show(res, [el("p", "result-empty", "Skriv inn hvor mye hunden spiste og hva den veier.")]);
        return;
      }
      if (!mg) {
        show(res, [el("p", "label", name), el("p", "big", "Ingen teobromin"), el("p", "note-line", "Hvit sjokolade inneholder ikke teobromin, men mye fett kan gi magetrøbbel. Ring veterinæren hvis hunden blir dårlig.")]);
        return;
      }
      var dose = (g * mg) / 100 / w;
      var over = dose >= LIMIT;
      var nodes = [el("p", "label", "Hunden har fått i seg omtrent"), el("p", "big", fmtNum(dose) + " mg per kg")];
      var gauge = el("div", "gauge");
      var scale = el("div", "scale");
      scale.appendChild(el("span", "limit"));
      var dot = el("span", "dot");
      scale.appendChild(dot);
      gauge.appendChild(scale);
      var marks = el("div", "marks");
      marks.appendChild(el("span", "", "0"));
      marks.appendChild(el("span", "mid", "Grensen, 20"));
      marks.appendChild(el("span", "", "60 mg per kg"));
      gauge.appendChild(marks);
      nodes.push(gauge);
      requestAnimationFrame(function () { requestAnimationFrame(function () { dot.style.left = Math.min(100, (dose / SCALE) * 100) + "%"; }); });
      nodes.push(el("p", "note-line" + (over ? " warn" : ""), over
        ? "Over grensen på 20 mg per kg. Kontakt veterinær nå."
        : "Under grensen på 20 mg per kg. Følg med på hunden, og kontakt veterinær hvis den blir dårlig."));
      var limitGrams = (LIMIT * w * 100) / mg;
      nodes.push(el("p", "sub", "For en hund på " + fmtNum(w) + " kg går grensen ved omtrent " + fmtNum(limitGrams) + " gram " + name.toLowerCase() + "."));
      show(res, nodes);
    };
    choc.addEventListener("input", run);
    choc.addEventListener("change", run);
    run();
  }

  /* ───────── Leash countdown ───────── */
  var ring = document.getElementById("leash-ring");
  if (ring) {
    var t = todayMs();
    var y = new Date(t).getUTCFullYear();
    var yf = function (ms) { var yy = new Date(ms).getUTCFullYear(); var s = Date.UTC(yy, 0, 1); return (ms - s) / (Date.UTC(yy + 1, 0, 1) - s); };
    var start = Date.UTC(y, 3, 1), end = Date.UTC(y, 7, 20);
    var active = t >= start && t <= end;
    var numEl = document.getElementById("leash-num");
    var unit = document.getElementById("leash-unit");
    var title = document.getElementById("leash-title");
    var sub = document.getElementById("leash-sub");
    if (active) {
      var left = diff(t, end) + 1;
      numEl.textContent = left;
      unit.textContent = left === 1 ? "dag igjen" : "dager igjen";
      title.textContent = "Båndtvang i hele landet nå";
      sub.textContent = "Til og med 20. august. Kommunen kan ha regler som varer lenger.";
    } else {
      if (t > end) { y += 1; start = Date.UTC(y, 3, 1); }
      var until = diff(t, start);
      numEl.textContent = until;
      unit.textContent = until === 1 ? "dag til båndtvangen" : "dager til båndtvangen";
      title.textContent = "Ingen generell båndtvang nå";
      sub.textContent = "Neste periode er 1. april til 20. august " + y + ". Lokale regler kan likevel gjelde.";
    }
    // The marker for today, on this year's ring
    var a = yf(t) * 2 * Math.PI - Math.PI / 2;
    var dotEl = document.getElementById("leash-today");
    dotEl.setAttribute("cx", (120 + 92 * Math.cos(a)).toFixed(1));
    dotEl.setAttribute("cy", (120 + 92 * Math.sin(a)).toFixed(1));
    requestAnimationFrame(function () { requestAnimationFrame(function () { ring.classList.add("drawn"); }); });
  }
})();
