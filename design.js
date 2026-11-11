/* design.js - laedt Drittanbieter erst bei aktiver Handlung (DSGVO / TDDDG):
   - Bandsintown-Widget: nach Klick auf "Termine laden"
   - Cloudflare Turnstile: erst bei erster Interaktion mit einem Formular */
(function () {
  'use strict';

  function addScript(src, attrs) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.body.appendChild(s);
    return s;
  }

  // Bandsintown
  var bitBtn = document.getElementById('bit-load');
  if (bitBtn) {
    bitBtn.addEventListener('click', function () {
      var card = document.getElementById('bit-consent');
      var wrap = document.querySelector('.bit-widget-wrap');
      if (wrap) wrap.hidden = false;
      addScript('https://widgetv3.bandsintown.com/main.min.js', { charset: 'utf-8' });
      if (card) card.parentNode.removeChild(card);
    });
  }

  // Turnstile (nur wenn die Seite ein Widget enthaelt)
  if (document.querySelector('.cf-turnstile')) {
    var tsRequested = false;
    var loadTurnstile = function () {
      if (tsRequested) return;
      tsRequested = true;
      document.removeEventListener('focusin', onInteract, true);
      document.removeEventListener('pointerdown', onInteract, true);
      addScript('https://challenges.cloudflare.com/turnstile/v0/api.js');
    };
    var onInteract = function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('form, .cfg-wrap')) loadTurnstile();
    };
    document.addEventListener('focusin', onInteract, true);
    document.addEventListener('pointerdown', onInteract, true);
  }
})();
