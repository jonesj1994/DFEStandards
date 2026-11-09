// Refuse to be shown inside another website's frame (clickjacking protection).
// GitHub Pages cannot send the X-Frame-Options or frame-ancestors headers, and
// browsers ignore frame-ancestors in a <meta> policy, so this script does it:
// loaded first in <head>, it hides the page if it is framed and tries to open
// it as the top-level page instead.
(function () {
  "use strict";
  var framed;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) return;
  document.documentElement.style.display = "none";
  try { window.top.location.replace(window.self.location.href); } catch (e) { /* blocked by the framing page */ }
})();
