/* Keep Amazify's release labels aligned with GitHub's latest-release downloads. */
(function () {
  'use strict';

  var labels = document.querySelectorAll('[data-amazify-release]');
  if (!labels.length) return;

  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 5000);

  fetch('https://api.github.com/repos/eripum9/Amazify/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
    credentials: 'omit',
    cache: 'no-store',
    signal: controller.signal
  }).then(function (response) {
    if (!response.ok) throw new Error('Release unavailable');
    return response.json();
  }).then(function (release) {
    if (release.draft || release.prerelease || typeof release.tag_name !== 'string') return;
    var tag = release.tag_name.trim();
    if (!tag) return;
    labels.forEach(function (label) {
      label.textContent = 'Version ' + tag;
      label.href = 'https://github.com/eripum9/Amazify/releases/tag/' + encodeURIComponent(tag);
    });
  }).catch(function () {
    // The static latest-release link remains useful offline or when GitHub rate-limits.
  }).finally(function () {
    clearTimeout(timeout);
  });
}());
