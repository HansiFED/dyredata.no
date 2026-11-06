// Finishes the old service's login and e-mail flows on the new site, for as long as the old service runs (until
// 30 June 2027): the Google/Apple sign-in bridge back to the app, the password reset link, asking for a new link,
// and unsubscribing from the old service's e-mails. These pages used to live in the old Lovable web app. Its address
// now forwards to dyredata.no, so they have to be here. The old service's address and public key come from the app's
// src/config.ts (filled in by build.py).
(function () {
  "use strict";
  var root = document.getElementById("legacy");
  if (!root) return;
  var page = root.getAttribute("data-page");
  var api = root.getAttribute("data-url");
  var key = root.getAttribute("data-key");
  var SUPPORT = "dyredata.no@gmail.com";
  var $ = function (name) { return root.querySelector('[data-l="' + name + '"]'); };
  var phone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function say(title, text) {
    if (title) $("title").textContent = title;
    if (text) $("text").textContent = text;
  }
  function params(s) { return new URLSearchParams((s || "").replace(/^[#?]/, "")); }
  var h = params(location.hash);
  var q = params(location.search);
  var failed = h.get("error") || h.get("error_description") || q.get("error") || q.get("error_description");
  // Login tokens do not stay in the address bar
  function hideTokens(keepQuery) {
    try { history.replaceState(null, "", location.pathname + (keepQuery ? location.search : "")); } catch (e) { /* old browser */ }
  }

  /* Google or Apple sign-in in the app's in-app browser: hand the login back to the app */
  if (page === "oauth") {
    if (h.get("access_token") && h.get("refresh_token")) {
      var link = "dyredata://callback#" + h.toString();
      $("open").setAttribute("href", link);
      hideTokens(false);
      location.href = link;
      setTimeout(function () {
        say("Innloggingen er klar", "Trykk på knappen for å gå tilbake til Dyredata og hente dataene dine.");
        $("actions").hidden = false;
      }, 1500);
    } else if (failed) {
      say("Innloggingen ble avbrutt", "Gå tilbake til Dyredata og prøv igjen.");
    } else {
      say("Fant ingen innlogging", "Gå tilbake til Dyredata og prøv igjen.");
    }
    return;
  }

  /* The link from the password e-mail: open the app with the login, or choose a new password */
  if (page === "reset") {
    var access = h.get("access_token");
    var refresh = h.get("refresh_token");
    if (!access) {
      say("Lenken virker ikke lenger", "Den kan være utløpt eller allerede brukt. Be om en ny lenke, så får du en ny e-post.");
      $("again").hidden = false;
      return;
    }
    hideTokens(false);
    var form = $("form");
    if (phone && refresh) {
      $("open").setAttribute("href", "dyredata://tilbakestill-passord#" + h.toString());
      $("actions").hidden = false;
    } else {
      say(null, "Lag et nytt passord for den gamle Dyredata-kontoen. Så logger du inn med det i appen og henter dataene dine.");
      $("form-intro").hidden = true;
    }
    form.hidden = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = form.querySelector("#pw1").value;
      var b = form.querySelector("#pw2").value;
      var err = $("error");
      var btn = $("submit");
      function fail(text) { err.textContent = text; err.hidden = false; }
      err.hidden = true;
      if (a.length < 6) return fail("Passordet må ha minst 6 tegn.");
      if (a !== b) return fail("Passordene er ikke like.");
      btn.disabled = true;
      btn.textContent = "Lagrer...";
      fetch(api + "/auth/v1/user", {
        method: "PUT",
        headers: { apikey: key, Authorization: "Bearer " + access, "Content-Type": "application/json" },
        body: JSON.stringify({ password: a })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, status: r.status, body: body || {} }; });
        })
        .then(function (res) {
          if (res.ok) {
            form.hidden = true;
            say("Passordet er endret", phone
              ? "Trykk på knappen for å hente dataene nå, eller åpne Dyredata senere og logg inn med e-postadressen og det nye passordet."
              : "Åpne Dyredata på telefonen, trykk «Hent dataene mine» og logg inn med e-postadressen og det nye passordet.");
            return;
          }
          var code = res.body.error_code || res.body.code || "";
          var msg = String(res.body.msg || res.body.message || res.body.error_description || "");
          if (code === "same_password" || /different from the old/i.test(msg)) fail("Det nye passordet må være annerledes enn det gamle.");
          else if (code === "weak_password" || /weak/i.test(msg)) fail("Passordet er for svakt. Velg et lengre passord.");
          else if (res.status === 401 || res.status === 403) {
            form.hidden = true;
            $("actions").hidden = true;
            say("Lenken virker ikke lenger", "Den kan være utløpt. Be om en ny lenke, så får du en ny e-post.");
            $("again").hidden = false;
          } else fail("Passordet ble ikke lagret. Prøv igjen om litt.");
        })
        .catch(function () { fail("Fikk ikke kontakt. Sjekk nettet og prøv igjen."); })
        .then(function () { btn.disabled = false; btn.textContent = "Lagre passordet"; });
    });
    return;
  }

  /* Ask for a new reset link. It goes to the same address the app uses, which the old service accepts. */
  if (page === "forgot") {
    var f = $("form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var mail = f.querySelector("#mail").value.trim();
      var err = $("error");
      var btn = $("submit");
      err.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { err.textContent = "Skriv inn en gyldig e-postadresse."; err.hidden = false; return; }
      btn.disabled = true;
      btn.textContent = "Sender...";
      var back = "https://dyre-vennlig-arkiv.lovable.app/tilbakestill-passord?source=native";
      fetch(api + "/auth/v1/recover?redirect_to=" + encodeURIComponent(back), {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail })
      })
        .then(function (r) {
          if (r.ok) {
            f.hidden = true;
            say("Sjekk e-posten", "Finnes det en konto med " + mail + ", kommer det en e-post med en lenke om litt. Se også i søppelposten, og åpne lenken på telefonen der du har Dyredata.");
            return;
          }
          throw new Error(r.status === 429 ? "rate" : "http");
        })
        .catch(function (x) {
          err.textContent = x && x.message === "rate" ? "Du har bedt om mange lenker på kort tid. Vent litt og prøv igjen." : "Lenken ble ikke sendt. Sjekk nettet og prøv igjen.";
          err.hidden = false;
        })
        .then(function () { btn.disabled = false; btn.textContent = "Send lenken"; });
    });
    return;
  }

  /* Unsubscribe link at the bottom of the old service's e-mails */
  if (page === "unsubscribe") {
    var token = q.get("token");
    var fn = api + "/functions/v1/handle-email-unsubscribe";
    var auth = { apikey: key, Authorization: "Bearer " + key };
    if (!token) {
      say("Lenken mangler noe", "Bruk lenken nederst i e-posten på nytt, eller skriv til " + SUPPORT + ", så melder vi deg av.");
      return;
    }
    fetch(fn + "?token=" + encodeURIComponent(token), { headers: auth })
      .then(function (r) { return r.ok ? r.json() : { valid: false }; })
      .then(function (d) {
        if (d && d.valid === false && d.reason === "already_unsubscribed") return say("Du er allerede meldt av", "Du får ingen flere e-poster fra den gamle Dyredata-tjenesten.");
        if (!d || !d.valid) return say("Lenken virker ikke", "Den kan være utløpt. Skriv til " + SUPPORT + ", så melder vi deg av.");
        say("Avmelding fra e-post", "Trykk på knappen for å slutte å få e-poster fra den gamle Dyredata-tjenesten.");
        $("actions").hidden = false;
      })
      .catch(function () { say("Fikk ikke kontakt", "Sjekk nettet og last inn siden på nytt."); });
    $("confirm").addEventListener("click", function () {
      var b = this;
      b.disabled = true;
      fetch(fn, { method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ token: token }) })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (d) {
          if (d && d.success) {
            $("actions").hidden = true;
            say("Du er meldt av", "Du får ingen flere e-poster fra den gamle Dyredata-tjenesten.");
          } else {
            b.disabled = false;
            say(null, "Avmeldingen gikk ikke. Prøv igjen om litt, eller skriv til " + SUPPORT + ".");
          }
        })
        .catch(function () { b.disabled = false; say(null, "Fikk ikke kontakt. Sjekk nettet og prøv igjen."); });
    });
  }
})();
