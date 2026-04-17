/**
 * docsify-mermaid-lightbox.js
 * A self-contained Docsify plugin for Mermaid diagram rendering.
 * Single-script import — handles CSS injection, Mermaid loading, rendering,
 * and provides a lightbox with zoom / pan / pseudo-fullscreen navigation.
 *
 * Usage:
 *   <script src="docsify-mermaid-lightbox.js"></script>
 *
 * Config (optional, on window before docsify loads):
 *   window.$docsifyMermaid = {
 *     theme: 'neutral',       // mermaid theme
 *     darkMode: false,
 *     mermaidUrl: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs',
 *     lightbox: true,
 *   };
 */
;(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Configuration                                                      */
  /* ------------------------------------------------------------------ */
  var cfg = Object.assign(
    {
      theme: 'auto',         // 'auto' detects from OS/docsify, or: 'neutral','dark','default','forest'
      mermaidUrl: 'https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.esm.min.mjs',
      lightbox: true,
    },
    window.$docsifyMermaid || {}
  );

  /* ------------------------------------------------------------------ */
  /*  Dark-mode detection                                                */
  /* ------------------------------------------------------------------ */
  function isDarkMode() {
    // 1. Check Docsify 5's --color-bg (dark theme sets it to ~#1f2428)
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    if (bg) {
      // Parse the luminance — if it's dark, we're in dark mode
      var temp = document.createElement('div');
      temp.style.color = bg;
      document.body.appendChild(temp);
      var computed = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      var m = computed.match(/\d+/g);
      if (m && m.length >= 3) {
        var luminance = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
        return luminance < 128;
      }
    }
    // 2. Fallback: OS preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getMermaidTheme() {
    if (cfg.theme !== 'auto') return cfg.theme;
    return isDarkMode() ? 'dark' : 'neutral';
  }

  /* ------------------------------------------------------------------ */
  /*  CSS injection                                                      */
  /* ------------------------------------------------------------------ */
  var css = `
/* ---- docsify-mermaid-lightbox styles ---- */

/* Diagram wrapper — uses Docsify 5 CSS variables */
.docsify-mermaid {
  position: relative;
  margin: 1.5em 0;
  text-align: center;
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: var(--border-radius, 6px);
  padding: 1em;
  background: var(--color-bg, #fff);
  color: var(--color-text, #333);
  transition: box-shadow .2s;
}
.docsify-mermaid:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,.1);
}
.docsify-mermaid svg {
  max-width: 100%;
  height: auto;
}

/* Lightbox SVG — remove Mermaid's inline max-width so we control size via transform */
.mermaid-lightbox-svg svg {
  max-width: none !important;
}

/* Action buttons (copy, expand) */
.docsify-mermaid-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .2s;
  z-index: 2;
}
.docsify-mermaid:hover .docsify-mermaid-actions {
  opacity: .7;
}
.docsify-mermaid-actions:hover {
  opacity: 1 !important;
}

.docsify-mermaid-copy,
.docsify-mermaid-expand {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(0,0,0,.06);
  color: var(--color-text, #555);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transition: background .2s;
}
.docsify-mermaid-copy:hover,
.docsify-mermaid-expand:hover {
  background: rgba(0,0,0,.15);
}

/* ---- Lightbox overlay ---- */
.mermaid-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(0,0,0,.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity .3s ease, visibility .3s ease;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.mermaid-lightbox-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Lightbox container */
.mermaid-lightbox-container {
  position: relative;
  width: 94vw;
  height: 92vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
}

/* The SVG viewport inside lightbox */
.mermaid-lightbox-svg {
  transform-origin: center;
  will-change: transform;
  cursor: default;
  user-select: text;
  -webkit-user-select: text;
  transition: transform .15s cubic-bezier(0.4, 0, 0.2, 1);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  touch-action: none;
  background: var(--color-bg, #fff);
  color: var(--color-text, #333);
  border-radius: 8px;
  padding: 1.5em;
  box-shadow: 0 4px 30px rgba(0,0,0,.3);
}
.mermaid-lightbox-svg.grabbing {
  cursor: grabbing;
  user-select: none;
  -webkit-user-select: none;
}
.mermaid-lightbox-svg.no-transition {
  transition: none !important;
}

/* Lightbox toolbar */
.mermaid-lightbox-toolbar {
  position: absolute;
  top: 12px;
  right: 16px;
  display: flex;
  gap: 6px;
  z-index: 100001;
  transition: opacity .3s ease;
}
.mermaid-lightbox-toolbar button {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  transition: all .2s ease;
}
.mermaid-lightbox-toolbar button:hover {
  background: rgba(255,255,255,.25);
  transform: scale(1.05);
}

/* Navigation arrows */
.mermaid-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100001;
  transition: opacity .3s ease;
}
.mermaid-lightbox-nav button {
  width: 44px;
  height: 64px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,.12);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  transition: all .2s ease;
}
.mermaid-lightbox-nav button:hover {
  background: rgba(255,255,255,.28);
  transform: scale(1.05);
}
.mermaid-lightbox-nav.prev { left: 12px; }
.mermaid-lightbox-nav.next { right: 12px; }

/* Counter */
.mermaid-lightbox-counter {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,.7);
  font-size: 13px;
  font-family: system-ui, sans-serif;
  z-index: 100001;
  transition: opacity .3s ease;
  background: rgba(0,0,0,.5);
  padding: 4px 12px;
  border-radius: 4px;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* Fade-out for controls auto-hide */
.mermaid-lightbox-overlay .fade-out {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 768px) {
  .mermaid-lightbox-toolbar button {
    width: 40px;
    height: 40px;
  }
  .mermaid-lightbox-nav button {
    width: 36px;
    height: 52px;
    font-size: 20px;
  }
  .mermaid-lightbox-counter {
    font-size: 12px;
    bottom: 10px;
  }
}
`;

  var styleEl = document.createElement('style');
  styleEl.id = 'docsify-mermaid-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ------------------------------------------------------------------ */
  /*  Mermaid loader (ESM dynamic import)                                */
  /* ------------------------------------------------------------------ */
  var mermaidReady = null;
  var mermaidInstance = null;
  var currentMermaidTheme = null;

  function loadMermaid() {
    if (mermaidReady) return mermaidReady;
    mermaidReady = import(cfg.mermaidUrl).then(function (mod) {
      mermaidInstance = mod.default || mod;
      return mermaidInstance;
    });
    return mermaidReady;
  }

  /** (Re-)initialize mermaid with the resolved theme */
  function initMermaidTheme(mermaid) {
    var theme = getMermaidTheme();
    if (theme === currentMermaidTheme) return;
    currentMermaidTheme = theme;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      darkMode: isDarkMode(),
      securityLevel: 'loose',
      logLevel: 'error',
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Clipboard helper (fallback for non-HTTPS)                          */
  /* ------------------------------------------------------------------ */
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback: hidden textarea + execCommand
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    return new Promise(function (resolve, reject) {
      document.execCommand('copy') ? resolve() : reject();
      ta.remove();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering helper                                                   */
  /* ------------------------------------------------------------------ */
  var renderCounter = 0;

  async function renderDiagrams(content, el) {
    var mermaid = await loadMermaid();
    initMermaidTheme(mermaid);
    var blocks = el.querySelectorAll('pre[data-lang="mermaid"] code');

    for (var i = 0; i < blocks.length; i++) {
      var code = blocks[i];
      var pre = code.parentElement;
      var graphDef = code.textContent.trim();
      var id = 'mermaid-' + Date.now() + '-' + renderCounter++;

      try {
        var result = await mermaid.render(id, graphDef);
        var wrapper = document.createElement('div');
        wrapper.className = 'docsify-mermaid';
        wrapper.innerHTML = result.svg;
        wrapper.setAttribute('data-mermaid-source', graphDef);

        // Action buttons container
        var actions = document.createElement('div');
        actions.className = 'docsify-mermaid-actions';

        // Copy-to-clipboard button
        var copyBtn = document.createElement('button');
        copyBtn.className = 'docsify-mermaid-copy';
        copyBtn.title = 'Copy Mermaid source';
        copyBtn.innerHTML = '\u2398'; // ⎘ copy symbol
        copyBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var src = this.closest('.docsify-mermaid').getAttribute('data-mermaid-source');
          var block = '```mermaid\n' + src + '\n```';
          var btn = this;
          copyToClipboard(block).then(function () {
            btn.textContent = '\u2713'; // ✓
            setTimeout(function () { btn.innerHTML = '\u2398'; }, 1500);
          });
        });
        actions.appendChild(copyBtn);

        // Expand / lightbox button
        if (cfg.lightbox) {
          var expandBtn = document.createElement('button');
          expandBtn.className = 'docsify-mermaid-expand';
          expandBtn.title = 'Expand diagram';
          expandBtn.innerHTML = '\u26F6'; // ⛶ expand symbol
          expandBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            openLightbox({ currentTarget: this.closest('.docsify-mermaid') });
          });
          actions.appendChild(expandBtn);
        }

        wrapper.appendChild(actions);
        pre.replaceWith(wrapper);
      } catch (err) {
        console.warn('[docsify-mermaid] render error:', err);
        var errDiv = document.createElement('div');
        errDiv.className = 'docsify-mermaid';
        errDiv.style.color = '#c0392b';
        errDiv.style.fontFamily = 'monospace';
        errDiv.style.fontSize = '13px';
        errDiv.style.textAlign = 'left';
        errDiv.textContent = 'Mermaid error: ' + (err.message || err);
        pre.replaceWith(errDiv);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Lightbox — enhanced zoom / pan / mobile                            */
  /* ------------------------------------------------------------------ */
  var lightboxOverlay = null;
  var lightboxDiagrams = [];
  var lightboxIndex = 0;

  // Zoom / pan state
  var lbScale = 1;
  var lbX = 0;
  var lbY = 0;

  // Mouse drag state
  var isDraggingMouse = false;
  var mouseLastX = 0;
  var mouseLastY = 0;

  // Touch state
  var touchStartX = 0;
  var touchStartY = 0;
  var touchEndX = 0;
  var touchEndY = 0;
  var isTouchDragging = false;
  var lastTouchX = 0;
  var lastTouchY = 0;

  // Pinch state
  var initialPinchDistance = 0;
  var initialPinchCenter = { x: 0, y: 0 };
  var lastPinchCenter = { x: 0, y: 0 };
  var isPinching = false;
  var startScale = 1;
  var rafId = null;

  // Wheel zoom state
  var wheelTimeout = null;
  var lastWheelTime = 0;
  var zoomVelocity = 0;

  // Controls auto-hide
  var inactivityTimer = null;

  // Double-tap state
  var lastTapTime = 0;

  var MIN_SCALE = 0.1;
  var MAX_SCALE = 20;
  var ELASTIC_MIN = 0.08;
  var ELASTIC_MAX = 22;
  var fitScale = 1; // computed per-diagram to fit viewport

  function collectDiagrams() {
    lightboxDiagrams = Array.from(
      document.querySelectorAll('.docsify-mermaid[data-mermaid-source]')
    );
  }

  function openLightbox(e) {
    collectDiagrams();
    var target = e.currentTarget;
    lightboxIndex = lightboxDiagrams.indexOf(target);
    if (lightboxIndex < 0) lightboxIndex = 0;
    showLightbox();
  }

  function getSvgEl() {
    return lightboxOverlay && lightboxOverlay.querySelector('.mermaid-lightbox-svg');
  }

  /**
   * Compute the scale that makes the lightbox SVG container (content + padding)
   * fit inside the visible viewport container.
   *
   * Strategy:
   *  1. Strip Mermaid's inline size constraints so the SVG renders naturally.
   *  2. If a viewBox exists, set width/height to match (1 SVG-unit = 1 CSS-px).
   *  3. Measure the actual rendered container div at scale(1).
   *  4. Measure the actual available parent area.
   *  5. fitScale = min(availW / divW, availH / divH), capped at 4×.
   */
  function computeFitScale(svgContainer) {
    var svg = svgContainer.querySelector('svg');
    if (!svg) return 1;

    // ---- 1. Remove Mermaid's inline constraints ----
    svg.style.maxWidth = 'none';
    svg.style.minWidth = '';

    // ---- 2. Size the SVG from its viewBox so content is 1:1 ----
    var vb = svg.getAttribute('viewBox');
    if (vb) {
      var parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        svg.setAttribute('width', parts[2]);
        svg.setAttribute('height', parts[3]);
        svg.style.width  = parts[2] + 'px';
        svg.style.height = parts[3] + 'px';
      }
    } else {
      // No viewBox — keep attributes but remove style constraints
      var aw = parseFloat(svg.getAttribute('width'));
      var ah = parseFloat(svg.getAttribute('height'));
      if (aw > 0 && ah > 0) {
        svg.style.width  = aw + 'px';
        svg.style.height = ah + 'px';
      } else {
        svg.style.width  = 'auto';
        svg.style.height = 'auto';
      }
    }

    // ---- 3. Measure the container div at scale(1) — includes padding ----
    svgContainer.style.transform = 'scale(1)';
    void svgContainer.offsetHeight;               // force reflow
    var divRect = svgContainer.getBoundingClientRect();
    if (divRect.width <= 0 || divRect.height <= 0) return 1;

    // ---- 4. Measure available space from the parent (.mermaid-lightbox-container) ----
    var parent = svgContainer.parentElement;
    var availW = parent.clientWidth;
    var availH = parent.clientHeight;
    if (availW <= 0 || availH <= 0) return 1;

    // ---- 5. Compute scale to fit ----
    var scale = Math.min(availW / divRect.width, availH / divRect.height);

    // Don't over-enlarge tiny diagrams beyond 4×
    return Math.min(Math.max(scale, MIN_SCALE), 4);
  }

  /* ---- Transform helpers ---- */
  function applyTransform(el, animate) {
    var svgEl = el || getSvgEl();
    if (!svgEl) return;
    if (animate) {
      svgEl.classList.remove('no-transition');
    } else {
      svgEl.classList.add('no-transition');
    }
    svgEl.style.transform = 'translate3d(' + lbX + 'px, ' + lbY + 'px, 0) scale(' + lbScale + ')';

    // Update cursor
    if (lbScale > fitScale + 0.01) {
      svgEl.classList.add('zoomed');
    } else {
      svgEl.classList.remove('zoomed');
    }
  }

  function resetZoom(animate) {
    lbScale = fitScale;
    lbX = 0;
    lbY = 0;
    startScale = fitScale;
    zoomVelocity = 0;
    var svgEl = getSvgEl();
    if (svgEl) {
      if (animate !== false) {
        svgEl.classList.remove('no-transition');
        svgEl.style.transition = 'transform .3s cubic-bezier(0.23, 1, 0.32, 1)';
      }
      svgEl.style.transform = 'translate3d(0, 0, 0) scale(' + fitScale + ')';
      svgEl.classList.remove('zoomed', 'grabbing');
      if (animate !== false) {
        setTimeout(function () {
          if (svgEl) svgEl.style.transition = '';
        }, 320);
      }
    }
  }

  /* ---- Constraint helpers ---- */
  function getConstraints(svgEl, scale) {
    var rect = svgEl.getBoundingClientRect();
    var naturalW = rect.width / lbScale;
    var naturalH = rect.height / lbScale;
    var maxX = Math.max(0, (scale * naturalW - window.innerWidth) / 2);
    var maxY = Math.max(0, (scale * naturalH - window.innerHeight) / 2);
    return { maxX: maxX, maxY: maxY };
  }

  function clampTranslation(svgEl, scale) {
    if (scale <= fitScale) {
      lbX = 0;
      lbY = 0;
      return;
    }
    var c = getConstraints(svgEl, scale);
    lbX = Math.min(c.maxX, Math.max(-c.maxX, lbX));
    lbY = Math.min(c.maxY, Math.max(-c.maxY, lbY));
  }

  /* ---- Zoom at a specific point ---- */
  function zoomAtPoint(newScale, pointX, pointY, svgEl, animate) {
    var el = svgEl || getSvgEl();
    if (!el) return;

    var prevScale = lbScale;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    if (newScale === prevScale) return;

    // Adjust translation so the point under cursor/finger stays fixed
    var ratio = newScale / prevScale;
    lbX = pointX - ratio * (pointX - lbX);
    lbY = pointY - ratio * (pointY - lbY);
    lbScale = newScale;

    clampTranslation(el, lbScale);
    applyTransform(el, animate);
  }

  /* ---- Smoothed wheel zoom (like the reference script) ---- */
  function applySmoothedWheelZoom(velocity, svgEl, percentX, percentY) {
    var prevScale = lbScale;
    var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale + velocity));
    if (newScale === prevScale) return;

    var rect = svgEl.getBoundingClientRect();
    var scaleRatio = newScale / prevScale;
    var deltaW = rect.width * (scaleRatio - 1);
    var deltaH = rect.height * (scaleRatio - 1);

    lbX -= (deltaW * percentX) - (deltaW / 2);
    lbY -= (deltaH * percentY) - (deltaH / 2);
    lbScale = newScale;

    // Smooth reset towards center when zooming back to fitScale
    if (newScale <= fitScale) {
      lbX = 0;
      lbY = 0;
    } else {
      clampTranslation(svgEl, lbScale);
    }

    applyTransform(svgEl, false);
  }

  /* ---- Controls auto-hide ---- */
  function showControls() {
    if (!lightboxOverlay) return;
    clearTimeout(inactivityTimer);
    var toolbar = lightboxOverlay.querySelector('.mermaid-lightbox-toolbar');
    var counter = lightboxOverlay.querySelector('.mermaid-lightbox-counter');
    var prevNav = lightboxOverlay.querySelector('.mermaid-lightbox-nav.prev');
    var nextNav = lightboxOverlay.querySelector('.mermaid-lightbox-nav.next');
    [toolbar, counter, prevNav, nextNav].forEach(function (el) {
      if (el) el.classList.remove('fade-out');
    });
    inactivityTimer = setTimeout(function () {
      if (lightboxOverlay && lightboxOverlay.classList.contains('active')) {
        [toolbar, counter, prevNav, nextNav].forEach(function (el) {
          if (el) el.classList.add('fade-out');
        });
      }
    }, 2500);
  }

  /* ---- Show / close / navigate ---- */
  function showLightbox() {
    if (!lightboxOverlay) buildLightboxDOM();

    var wrapper = lightboxDiagrams[lightboxIndex];
    if (!wrapper) return;

    var svgContainer = getSvgEl();
    svgContainer.innerHTML = wrapper.querySelector('svg')
      ? wrapper.querySelector('svg').outerHTML
      : wrapper.innerHTML;

    // Ensure the overlay is laid out so we can measure inside computeFitScale.
    // CSS keeps it invisible (opacity:0, visibility:hidden) until .active is added.
    lightboxOverlay.style.display = 'flex';
    lightboxOverlay.classList.remove('active');
    void lightboxOverlay.offsetHeight; // force reflow

    // Compute fit-to-screen scale from actual measurements
    fitScale = computeFitScale(svgContainer);

    // Initialize zoom state at fit scale
    lbScale = fitScale;
    lbX = 0;
    lbY = 0;
    startScale = fitScale;
    zoomVelocity = 0;
    svgContainer.classList.remove('zoomed', 'grabbing');
    svgContainer.classList.add('no-transition');
    applyTransform(svgContainer, false);

    updateCounter();
    updateNavButtons();

    // Now reveal with transition
    lightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', lbKeyHandler);
    showControls();
  }

  function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.remove('active');
    setTimeout(function () {
      if (lightboxOverlay) lightboxOverlay.style.display = 'none';
    }, 310);
    document.body.style.overflow = '';
    document.removeEventListener('keydown', lbKeyHandler);
    clearTimeout(inactivityTimer);
    resetZoom(false);
  }

  function lbKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbPrev();
    if (e.key === 'ArrowRight') lbNext();
    if (e.key === '+' || e.key === '=') { lbZoomIn(); showControls(); }
    if (e.key === '-') { lbZoomOut(); showControls(); }
    if (e.key === '0') { lbReset(); showControls(); }
  }

  function lbPrev() {
    if (lightboxIndex > 0) {
      lightboxIndex--;
      showLightbox();
    }
  }

  function lbNext() {
    if (lightboxIndex < lightboxDiagrams.length - 1) {
      lightboxIndex++;
      showLightbox();
    }
  }

  function lbZoomIn() {
    var svgEl = getSvgEl();
    if (!svgEl) return;
    // Zoom towards center of viewport
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    zoomAtPoint(lbScale * 1.4, cx, cy, svgEl, true);
  }

  function lbZoomOut() {
    var svgEl = getSvgEl();
    if (!svgEl) return;
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    zoomAtPoint(lbScale / 1.4, cx, cy, svgEl, true);
  }

  function lbReset() {
    resetZoom(true);
  }

  function updateCounter() {
    var counter = lightboxOverlay.querySelector('.mermaid-lightbox-counter');
    counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxDiagrams.length;
  }

  function updateNavButtons() {
    var prevBtn = lightboxOverlay.querySelector('.mermaid-lightbox-nav.prev');
    var nextBtn = lightboxOverlay.querySelector('.mermaid-lightbox-nav.next');
    prevBtn.style.display = lightboxIndex > 0 ? '' : 'none';
    nextBtn.style.display = lightboxIndex < lightboxDiagrams.length - 1 ? '' : 'none';
  }

  /* ---- Touch helpers ---- */
  function getPinchDistance(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  function handleSwipe() {
    var swipeThreshold = 50;
    var hSwipe = Math.abs(touchEndX - touchStartX);
    var vSwipe = Math.abs(touchEndY - touchStartY);
    if (hSwipe > vSwipe && hSwipe > swipeThreshold) {
      if (touchEndX < touchStartX) {
        lbNext();
      } else {
        lbPrev();
      }
    }
  }

  /* ---- Build the lightbox DOM + all event handlers ---- */
  function buildLightboxDOM() {
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'mermaid-lightbox-overlay';
    lightboxOverlay.innerHTML = [
      '<div class="mermaid-lightbox-toolbar">',
      '  <button data-action="copy" title="Copy Mermaid source">&#x2398;</button>',
      '  <button data-action="zoomIn" title="Zoom in (+)">+</button>',
      '  <button data-action="zoomOut" title="Zoom out (-)">&#x2212;</button>',
      '  <button data-action="reset" title="Reset (0)">&#x21BA;</button>',
      '  <button data-action="close" title="Close (Esc)">&#x2715;</button>',
      '</div>',
      '<div class="mermaid-lightbox-nav prev"><button title="Previous (&#x2190;)">&#x276E;</button></div>',
      '<div class="mermaid-lightbox-nav next"><button title="Next (&#x2192;)">&#x276F;</button></div>',
      '<div class="mermaid-lightbox-container">',
      '  <div class="mermaid-lightbox-svg"></div>',
      '</div>',
      '<div class="mermaid-lightbox-counter"></div>',
    ].join('\n');

    // ---- Toolbar actions ----
    lightboxOverlay.querySelector('[data-action="copy"]').onclick = function (e) {
      e.stopPropagation();
      var w = lightboxDiagrams[lightboxIndex];
      if (!w) return;
      var src = w.getAttribute('data-mermaid-source');
      var block = '```mermaid\n' + src + '\n```';
      var btn = this;
      copyToClipboard(block).then(function () {
        btn.textContent = '\u2713';
        setTimeout(function () { btn.innerHTML = '\u2398'; }, 1500);
      });
      showControls();
    };
    lightboxOverlay.querySelector('[data-action="zoomIn"]').onclick = function (e) { e.stopPropagation(); lbZoomIn(); showControls(); };
    lightboxOverlay.querySelector('[data-action="zoomOut"]').onclick = function (e) { e.stopPropagation(); lbZoomOut(); showControls(); };
    lightboxOverlay.querySelector('[data-action="reset"]').onclick = function (e) { e.stopPropagation(); lbReset(); showControls(); };
    lightboxOverlay.querySelector('[data-action="close"]').onclick = function (e) { e.stopPropagation(); closeLightbox(); };
    lightboxOverlay.querySelector('.mermaid-lightbox-nav.prev button').onclick = function (e) { e.stopPropagation(); lbPrev(); };
    lightboxOverlay.querySelector('.mermaid-lightbox-nav.next button').onclick = function (e) { e.stopPropagation(); lbNext(); };

    // ---- Close on backdrop click ----
    lightboxOverlay.addEventListener('click', function (e) {
      if (e.target === lightboxOverlay || e.target.classList.contains('mermaid-lightbox-container')) {
        closeLightbox();
      }
    });

    // Show controls on mouse movement
    lightboxOverlay.addEventListener('mousemove', showControls);

    var svgEl = getSvgEl.bind(null)(); // will be null now; we use getSvgEl() dynamically

    /* ======== MOUSE WHEEL ZOOM (zoom at cursor position) ======== */
    lightboxOverlay.addEventListener('wheel', function (e) {
      if (!lightboxOverlay.classList.contains('active')) return;
      e.preventDefault();

      var el = getSvgEl();
      if (!el) return;

      el.classList.add('no-transition');

      var rect = el.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var percentX = mouseX / rect.width;
      var percentY = mouseY / rect.height;

      // Adaptive zoom speed — more gentle at extremes
      var now = Date.now();
      var timeDelta = now - lastWheelTime;
      lastWheelTime = now;

      var currentZoomFactor = 0.06 * lbScale;
      currentZoomFactor = Math.max(0.005, Math.min(1.0, currentZoomFactor));
      var rawDelta = Math.sign(-e.deltaY) * currentZoomFactor;

      // Smooth velocity
      if (timeDelta < 200) {
        zoomVelocity = zoomVelocity * 0.7 + rawDelta * 0.3;
      } else {
        zoomVelocity = rawDelta;
      }

      applySmoothedWheelZoom(zoomVelocity, el, percentX, percentY);
      showControls();

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(function () {
        el.classList.remove('no-transition');
        if (Math.abs(lbScale - fitScale) < fitScale * 0.05) {
          resetZoom(true);
        }
      }, 200);
    }, { passive: false });

    /* ======== MOUSE DRAG (pan — with threshold to preserve text selection) ======== */
    var dragStartX = 0;
    var dragStartY = 0;
    var dragEngaged = false; // true once threshold exceeded
    var DRAG_THRESHOLD = 5; // px before switching from select to drag

    lightboxOverlay.addEventListener('mousedown', function (e) {
      var el = getSvgEl();
      if (!el || e.button !== 0) return;

      // Don't interfere with clicks on interactive SVG elements (links, etc.)
      var tgt = e.target;
      if (tgt.closest && tgt.closest('a, [onclick], [data-action]')) return;

      isDraggingMouse = true;
      dragEngaged = false;
      mouseLastX = e.clientX;
      mouseLastY = e.clientY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      el.classList.add('no-transition');
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDraggingMouse) return;
      var el = getSvgEl();
      if (!el) return;

      // Only start panning after exceeding the drag threshold
      if (!dragEngaged) {
        var totalDx = Math.abs(e.clientX - dragStartX);
        var totalDy = Math.abs(e.clientY - dragStartY);
        if (totalDx < DRAG_THRESHOLD && totalDy < DRAG_THRESHOLD) return;
        dragEngaged = true;
        // Clear any accidental text selection once drag starts
        window.getSelection && window.getSelection().removeAllRanges();
        el.classList.add('grabbing');
      }

      e.preventDefault(); // prevent text selection while panning
      var dx = e.clientX - mouseLastX;
      var dy = e.clientY - mouseLastY;
      lbX += dx;
      lbY += dy;

      clampTranslation(el, lbScale);
      applyTransform(el, false);

      mouseLastX = e.clientX;
      mouseLastY = e.clientY;
      showControls();
    });

    document.addEventListener('mouseup', function () {
      if (!isDraggingMouse) return;
      isDraggingMouse = false;
      dragEngaged = false;
      var el = getSvgEl();
      if (el) {
        el.classList.remove('no-transition', 'grabbing');
      }
    });

    /* ======== TOUCH: drag, pinch-zoom, swipe, double-tap ======== */
    lightboxOverlay.addEventListener('touchstart', function (e) {
      showControls();
      var el = getSvgEl();
      if (!el) return;

      if (e.touches.length === 1) {
        // Single touch — potential swipe or drag
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;

        if (lbScale > fitScale) {
          isTouchDragging = true;
          el.classList.add('no-transition');
        }
      } else if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        initialPinchDistance = getPinchDistance(e.touches);
        initialPinchCenter = getTouchCenter(e.touches);
        lastPinchCenter = { x: initialPinchCenter.x, y: initialPinchCenter.y };
        isPinching = true;
        isTouchDragging = false;
        startScale = lbScale;

        el.classList.add('no-transition');
      }
    }, { passive: false });

    lightboxOverlay.addEventListener('touchmove', function (e) {
      var el = getSvgEl();
      if (!el) return;

      if (e.touches.length === 2 && isPinching) {
        // ---- Pinch-to-zoom with center tracking ----
        e.preventDefault();

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () {
          var currentDist = getPinchDistance(e.touches);
          var currentCenter = getTouchCenter(e.touches);
          var pinchRatio = currentDist / initialPinchDistance;

          // Elastic rubber-band at limits
          var targetScale = startScale * pinchRatio;
          if (targetScale < fitScale) {
            pinchRatio = fitScale / startScale + (pinchRatio - fitScale / startScale) * 0.3;
          } else if (targetScale > MAX_SCALE) {
            pinchRatio = MAX_SCALE / startScale - (MAX_SCALE / startScale - pinchRatio) * 0.3;
          }

          var newScale = Math.max(fitScale * 0.5, Math.min(ELASTIC_MAX, startScale * pinchRatio));
          var scaleChange = newScale / lbScale;

          // Pan follows pinch center movement
          var centerDx = currentCenter.x - lastPinchCenter.x;
          var centerDy = currentCenter.y - lastPinchCenter.y;
          lbX += centerDx;
          lbY += centerDy;

          // Adjust for scale change around pinch center
          var rect = el.getBoundingClientRect();
          var relX = (currentCenter.x - rect.left) / rect.width;
          var relY = (currentCenter.y - rect.top) / rect.height;
          var dw = rect.width * (scaleChange - 1);
          var dh = rect.height * (scaleChange - 1);
          lbX -= (dw * relX) - (dw / 2);
          lbY -= (dh * relY) - (dh / 2);

          lbScale = newScale;

          // Soft constraints with elasticity
          if (lbScale >= fitScale) {
            var c = getConstraints(el, lbScale);
            if (Math.abs(lbX) > c.maxX) {
              lbX = Math.sign(lbX) * (c.maxX + (Math.abs(lbX) - c.maxX) * 0.3);
            }
            if (Math.abs(lbY) > c.maxY) {
              lbY = Math.sign(lbY) * (c.maxY + (Math.abs(lbY) - c.maxY) * 0.3);
            }
          } else {
            lbX *= 0.8;
            lbY *= 0.8;
          }

          el.style.transform = 'translate3d(' + lbX + 'px, ' + lbY + 'px, 0) scale(' + lbScale + ')';
          if (lbScale > fitScale + 0.01) { el.classList.add('zoomed'); } else { el.classList.remove('zoomed'); }

          lastPinchCenter = { x: currentCenter.x, y: currentCenter.y };
          rafId = null;
        });

      } else if (e.touches.length === 1 && isTouchDragging && lbScale > fitScale) {
        // ---- Single-touch drag when zoomed ----
        e.preventDefault();
        var touch = e.touches[0];
        var dx = touch.clientX - lastTouchX;
        var dy = touch.clientY - lastTouchY;

        lbX += dx;
        lbY += dy;
        clampTranslation(el, lbScale);
        applyTransform(el, false);

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
    }, { passive: false });

    lightboxOverlay.addEventListener('touchend', function (e) {
      var el = getSvgEl();
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

      if (el) {
        el.classList.remove('no-transition');
        el.style.transition = 'transform .3s cubic-bezier(0.23, 1, 0.32, 1)';
      }

      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;

      // Elastic snap-back if outside allowed range
      if (lbScale < fitScale * 0.95) {
        resetZoom(true);
      } else if (lbScale > MAX_SCALE) {
        lbScale = MAX_SCALE;
        if (el) {
          clampTranslation(el, lbScale);
          el.style.transform = 'translate3d(' + lbX + 'px, ' + lbY + 'px, 0) scale(' + lbScale + ')';
        }
      } else if (Math.abs(lbScale - fitScale) < fitScale * 0.05) {
        // Near fitScale — snap back
        resetZoom(true);
      }

      // Swipe navigation only when not zoomed and not pinching
      if (lbScale <= fitScale + 0.01 && !isPinching && !isTouchDragging) {
        handleSwipe();
      }

      isPinching = false;
      isTouchDragging = false;

      // Restore default transition after animation
      if (el) {
        setTimeout(function () { if (el) el.style.transition = ''; }, 320);
      }
    }, { passive: true });

    /* ======== Double-tap to zoom (mobile) ======== */
    lightboxOverlay.addEventListener('touchend', function (e) {
      if (e.touches.length > 0) return; // wait until all fingers lifted

      var now = Date.now();
      var tapDelta = now - lastTapTime;

      if (tapDelta < 300 && tapDelta > 0) {
        var touch = e.changedTouches[0];
        var el = getSvgEl();
        if (!el) return;

        var rect = el.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {

          el.classList.remove('no-transition');
          el.style.transition = 'transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

          if (lbScale <= fitScale + 0.01) {
            // Zoom in 3x from fit scale towards tap point
            var targetScale = fitScale * 3;
            var cx = touch.clientX;
            var cy = touch.clientY;
            var ratio = targetScale / lbScale;
            lbX = cx - ratio * (cx - lbX);
            lbY = cy - ratio * (cy - lbY);
            lbScale = targetScale;
            clampTranslation(el, lbScale);
            el.style.transform = 'translate3d(' + lbX + 'px, ' + lbY + 'px, 0) scale(' + lbScale + ')';
            el.classList.add('zoomed');
          } else {
            resetZoom(true);
          }

          setTimeout(function () { if (el) el.style.transition = ''; }, 320);
        }
      }

      lastTapTime = now;
    });

    document.body.appendChild(lightboxOverlay);
  }

  /* ------------------------------------------------------------------ */
  /*  Docsify plugin hook                                                */
  /* ------------------------------------------------------------------ */
  function mermaidPlugin(hook) {
    hook.afterEach(function (html) {
      return html;
    });

    hook.doneEach(function () {
      renderDiagrams(null, document.querySelector('.markdown-section, article.markdown-section, #main, .content'));
    });

    // Re-render all diagrams when color scheme changes
    hook.mounted(function () {
      if (cfg.theme === 'auto' && window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          currentMermaidTheme = null; // force re-init
          var container = document.querySelector('.markdown-section, article.markdown-section, #main, .content');
          if (container) {
            // Re-render: replace rendered diagrams back with code blocks
            var diagrams = container.querySelectorAll('.docsify-mermaid[data-mermaid-source]');
            diagrams.forEach(function (d) {
              var pre = document.createElement('pre');
              pre.setAttribute('data-lang', 'mermaid');
              var code = document.createElement('code');
              code.textContent = d.getAttribute('data-mermaid-source');
              pre.appendChild(code);
              d.replaceWith(pre);
            });
            renderDiagrams(null, container);
          }
        });
      }
    });
  }

  // Register plugin
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(mermaidPlugin);
})();
