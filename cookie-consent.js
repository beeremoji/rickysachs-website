(function () {
  var STORAGE_KEY = 'rs_cookie_consent';
  var consent = localStorage.getItem(STORAGE_KEY);

  // GA Consent Mode update helper
  function grantAnalytics() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  function denyAnalytics() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  // Already decided
  if (consent === 'granted') { grantAnalytics(); return; }
  if (consent === 'denied')  { denyAnalytics();  return; }

  // Show banner
  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = [
    '<div id="cookie-inner">',
    '  <p id="cookie-text">',
    '    Diese Website verwendet Google Analytics, um Besuche anonymisiert zu messen.',
    '    Weitere Infos in der <a href="/datenschutz.html">Datenschutzerklärung</a>.',
    '  </p>',
    '  <div id="cookie-btns">',
    '    <button id="cookie-deny">Ablehnen</button>',
    '    <button id="cookie-accept">Akzeptieren</button>',
    '  </div>',
    '</div>',
  ].join('');

  var style = document.createElement('style');
  style.textContent = [
    '#cookie-banner{',
    '  position:fixed;bottom:0;left:0;right:0;z-index:9999;',
    '  background:#2a1a0e;border-top:1px solid #5C4433;',
    '  padding:1rem 1.5rem;',
    '}',
    '#cookie-inner{',
    '  max-width:900px;margin:0 auto;',
    '  display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;',
    '}',
    '#cookie-text{',
    '  flex:1;font-size:0.82rem;color:#c8b89a;line-height:1.6;margin:0;',
    '}',
    '#cookie-text a{color:#c8a84b;text-underline-offset:3px;}',
    '#cookie-btns{display:flex;gap:0.6rem;flex-shrink:0;}',
    '#cookie-deny{',
    '  background:transparent;border:1px solid #5C4433;color:#9a8070;',
    '  padding:0.45rem 1.1rem;border-radius:4px;font-size:0.8rem;cursor:pointer;',
    '  font-family:inherit;transition:border-color .2s,color .2s;',
    '}',
    '#cookie-deny:hover{border-color:#9a8070;color:#c8b89a;}',
    '#cookie-accept{',
    '  background:#c8a84b;border:1px solid #c8a84b;color:#1a0e04;',
    '  padding:0.45rem 1.1rem;border-radius:4px;font-size:0.8rem;',
    '  font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s;',
    '}',
    '#cookie-accept:hover{background:#dfc05a;}',
    '@media(max-width:600px){',
    '  #cookie-inner{flex-direction:column;align-items:flex-start;gap:0.8rem;}',
    '}',
  ].join('');

  document.head.appendChild(style);

  function removeBanner() {
    if (banner.parentNode) banner.parentNode.removeChild(banner);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(banner);

    document.getElementById('cookie-accept').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'granted');
      grantAnalytics();
      removeBanner();
    });

    document.getElementById('cookie-deny').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'denied');
      denyAnalytics();
      removeBanner();
    });
  });
})();
