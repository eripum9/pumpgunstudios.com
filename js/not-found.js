// GitHub Pages serves the root 404 for every missing route, including /de/.
// Localize that response in place so its URL and HTTP 404 status are preserved.
(() => {
  if (!/^\/de(?:\/|$)/.test(window.location.pathname)) return;
  document.documentElement.lang = 'de';
  document.title = 'Seite nicht gefunden — PumpgunStudios';
  document.querySelector('meta[name="description"]').content = 'Diese PumpgunStudios-Seite wurde nicht gefunden. Zurück zur Projektübersicht.';
  document.querySelector('.skip-link').textContent = 'Zum Inhalt springen';
  const brand = document.querySelector('.brand');
  brand.href = '/de/';
  brand.setAttribute('aria-label', 'PumpgunStudios-Startseite');
  const navigation = document.querySelector('.topbar-nav');
  navigation.setAttribute('aria-label', 'Hauptnavigation');
  const links = navigation.querySelectorAll('a');
  links[0].href = '/de/';
  links[0].textContent = 'Projekte';
  links[1].href = '/de/aboutme/';
  links[1].textContent = 'Über mich';
  links[2].href = '/404.html';
  links[2].textContent = 'EN';
  links[2].lang = 'en';
  links[2].hreflang = 'en';
  links[2].setAttribute('aria-label', 'Diese Seite auf Englisch lesen');
  document.querySelector('.error-page .label').textContent = 'pfad_nicht_gefunden';
  document.querySelector('h1').textContent = 'Seite nicht gefunden.';
  document.querySelector('.error-message').textContent = 'Die gesuchte Seite gibt es nicht oder sie wurde an einen Ort verschoben, den wir nicht erreichen. Vielleicht war sie nie hier.';
  const actions = document.querySelectorAll('.error-page .btn');
  actions[0].href = '/de/';
  actions[0].textContent = 'Zurück zu den Projekten';
  actions[1].href = '/de/aboutme/';
  actions[1].textContent = 'Über mich';
})();
