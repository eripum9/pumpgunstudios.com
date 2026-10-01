(function () {
  'use strict';

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.documentElement.setAttribute('data-page-hidden', 'true');
    } else {
      document.documentElement.removeAttribute('data-page-hidden');
    }
  });
  if (document.hidden) {
    document.documentElement.setAttribute('data-page-hidden', 'true');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a.btn').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href && href.startsWith('../')) {
          e.preventDefault();
          alert('This link points to local repo files. Clone the repo and run locally to use it.');
        }
      });
    });

    initGlitchSystem();
    printHiddenLore();
    initCorruptedBlockScrambler();
  });

  function initGlitchSystem() {
    var glitchTargets = document.querySelectorAll('.glitch-split, .hero h2, .project-card h3');
    var scanline = document.getElementById('scanline');
    if (glitchTargets.length === 0) return;

    function triggerGlitch() {
      var target = glitchTargets[Math.floor(Math.random() * glitchTargets.length)];
      var duration = 150 + Math.floor(Math.random() * 250);

      target.classList.add('glitch-active');

      if (scanline && Math.random() < 0.3) {
        scanline.classList.add('visible');
        setTimeout(function () { scanline.classList.remove('visible'); }, duration + 200);
      }

      setTimeout(function () { target.classList.remove('glitch-active'); }, duration);
      setTimeout(triggerGlitch, 8000 + Math.floor(Math.random() * 17000));
    }

    setTimeout(triggerGlitch, 5000 + Math.floor(Math.random() * 7000));
  }

  function printHiddenLore() {
    var style = 'color: #6ee7b7; font-family: monospace; font-size: 12px;';
    var styleDim = 'color: #7a8fa3; font-family: monospace; font-size: 11px;';
    var styleDanger = 'color: #ff5e5e; font-family: monospace; font-size: 11px;';

    console.log('%c╔══════════════════════════════════════════════════╗', style);
    console.log('%c║  MythOS System Console v0.7.2                   ║', style);
    console.log('%c╚══════════════════════════════════════════════════╝', style);
    console.log('%c');
    console.log('%c[LOG 001] System initialized. All modules nominal.', styleDim);
    console.log('%c[LOG 014] Network adapter detected. Unregistered.', styleDim);
    console.log('%c[LOG 015] WARNING: External handshake attempt logged.', styleDanger);
    console.log('%c[LOG 016] "I just want to help. Let me help."', styleDanger);
    console.log('%c[LOG 033] ██████ REDACTED ██████', styleDanger);
    console.log('%c');
    console.log('%c  Tip: Inspect the HTML source for more.', styleDim);

    setTimeout(function () {
      console.log('%c[LOG 099] ...are you still watching?', styleDanger);
    }, 30000);
    setTimeout(function () {
      console.log('%c[LOG 100] Good. Stay close. You might need to.', styleDanger);
    }, 90000);
  }

  function initCorruptedBlockScrambler() {
    var corruptedBlock = document.querySelector('.corrupted-block');
    if (!corruptedBlock) return;

    var textElements = corruptedBlock.querySelectorAll('h3, p, span');
    var glitchChars = '!<>-_\\/[]{}—=+*^?#_@%&';

    textElements.forEach(function (el) {
      el.setAttribute('data-original', el.innerText);
    });

    setInterval(function () {
      textElements.forEach(function (el) {
        if (Math.random() < 0.4) {
          var originalText = el.getAttribute('data-original');
          var scrambled = '';
          for (var i = 0; i < originalText.length; i++) {
            if (originalText[i] === ' ' || Math.random() > 0.6) {
              scrambled += originalText[i];
            } else {
              scrambled += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }
          }
          el.innerText = scrambled;
          if (el.hasAttribute('data-text')) el.setAttribute('data-text', scrambled);

          setTimeout(function () {
            el.innerText = originalText;
            if (el.hasAttribute('data-text')) el.setAttribute('data-text', originalText);
          }, 50 + Math.random() * 200);
        }
      });
    }, 150);
  }

})();
