// Native details remains open and usable without JavaScript.
(() => {
  const wide = window.matchMedia('(min-width: 861px)');
  const sync = () => document.querySelectorAll('.wiki-navigation').forEach(item => {
    item.open = wide.matches;
  });
  sync();
  wide.addEventListener('change', sync);
})();
