(function () {
  var STORAGE_KEY = 'rs_cookie_consent';
  var consent = localStorage.getItem(STORAGE_KEY);

  // Google Analytics wird erst nach Einwilligung geladen (kein Request an Google vorher)
  function loadGA() {
    if (document.getElementById('ga-js')) return;
    var s = document.createElement('script');
    s.id = 'ga-js';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-BYRHZ3N695';
    document.head.appendChild(s);
  }

  // GA Consent Mode update helper
  function grantAnalytics() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    loadGA();
  }

  // Einwilligung widerrufen: Entscheidung loeschen, Seite neu laden (Banner erscheint wieder)
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!el) return;
    e.preventDefault();
    try { localStorage.removeItem(STORAGE_KEY); } catch (x) {}
    location.reload();
  });

  function denyAnalytics() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  // Already decided
  if (consent === 'granted') { grantAnalytics(); return; }
  if (consent === 'denied')  { denyAnalytics();  return; }

  // Show banner
  var TEXTS = {
    de: { href: '/datenschutz.html', text: 'Mit deiner Einwilligung nutzt diese Website Google Analytics (Cookies), um Besuche statistisch auszuwerten. Dabei können Daten an Google, auch in die USA, übermittelt werden. Du kannst die Einwilligung jederzeit über „Cookie-Einstellungen“ widerrufen. Mehr in der', link: 'Datenschutzerklärung', deny: 'Ablehnen', accept: 'Akzeptieren' },
    en: { href: '/en/privacy.html', text: 'With your consent, this website uses Google Analytics (cookies) to measure visits statistically. Data may be transferred to Google, including in the USA. You can withdraw your consent at any time via “Cookie settings”. More in the', link: 'privacy policy', deny: 'Decline', accept: 'Accept' },
    fr: { href: '/fr/privacy.html', text: 'Avec votre consentement, ce site utilise Google Analytics (cookies) pour établir des statistiques de visite. Des données peuvent être transmises à Google, y compris aux États-Unis. Vous pouvez retirer votre consentement à tout moment via « Paramètres des cookies ». Plus d’informations dans la', link: 'politique de confidentialité', deny: 'Refuser', accept: 'Accepter' },
    es: { href: '/es/privacy.html', text: 'Con tu consentimiento, este sitio web utiliza Google Analytics (cookies) para elaborar estadísticas de visitas. Los datos pueden transmitirse a Google, también en EE. UU. Puedes retirar tu consentimiento en cualquier momento en «Configuración de cookies». Más información en la', link: 'política de privacidad', deny: 'Rechazar', accept: 'Aceptar' },
  };
  var t = TEXTS[(document.documentElement.lang || 'de').slice(0, 2)] || TEXTS.de;
  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = [
    '<div id="cookie-inner">',
    '  <p id="cookie-text">',
    '    ' + t.text + ' <a href="' + t.href + '">' + t.link + '</a>.',
    '  </p>',
    '  <div id="cookie-btns">',
    '    <button id="cookie-deny">' + t.deny + '</button>',
    '    <button id="cookie-accept">' + t.accept + '</button>',
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

  // Hoehe des Banners fuer Elemente, die darueber bleiben muessen (z. B. KI-Label im Hero)
  function setBannerHeight() {
    document.documentElement.style.setProperty('--cookie-h', banner.parentNode ? banner.offsetHeight + 'px' : '0px');
  }

  function removeBanner() {
    if (banner.parentNode) banner.parentNode.removeChild(banner);
    setBannerHeight();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(banner);
    setBannerHeight();
    window.addEventListener('resize', setBannerHeight);
    window.addEventListener('load', setBannerHeight);

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
