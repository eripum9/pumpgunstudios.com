(function(){
  const toggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const key = 'site-theme';

  function applyTheme(theme){
    if(theme === 'dark'){
      root.setAttribute('data-theme','dark');
      toggle && toggle.setAttribute('aria-pressed','true');
    } else {
      root.removeAttribute('data-theme');
      toggle && toggle.setAttribute('aria-pressed','false');
    }
  }
  
  const stored = localStorage.getItem(key);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  applyTheme(stored || (prefersDark ? 'dark' : 'light'));
  
  if(toggle){
    toggle.addEventListener('click', ()=>{
      const isDark = root.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(key, next);
    });
  }
})();
