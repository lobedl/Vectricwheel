/**
 * Spin the Wheel – Random Decision Maker | Vectric
 * Modern Vanilla JavaScript (ES6+)
 * Domain: https://vectric.online
 */

(() => {
  'use strict';

  // --- Constants & Color Palette ---
  const STORAGE_KEY = 'vectric_wheel_options';
  const SITE_URL = 'https://vectric.online/';

  const PALETTE = [
    '#4f46e5', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#84cc16', // Lime
    '#d946ef'  // Fuchsia
  ];

  const PRESETS = {
    yesno: ['Yes', 'No'],
    food: ['Pizza', 'Burger', 'Tacos', 'Sushi', 'Pasta', 'Salad', 'Noodles', 'Curry'],
    truthordare: ['Truth', 'Dare'],
    numbers: ['1', '2', '3', '4', '5', '6'],
    custom: ['Movie Night', 'Board Games', 'Video Games', 'Read a Book', 'Take a Walk', 'Bake Cookies']
  };

  // --- Header Navigation & Mobile Menu ---
  function initHeaderNavigation() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const siteNav = document.getElementById('siteNav');
    const headerSpinCta = document.getElementById('headerSpinCta');

    if (toggleBtn && siteNav) {
      function closeMenu() {
        siteNav.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }

      function toggleMenu() {
        const isOpen = siteNav.classList.contains('is-open');
        if (isOpen) {
          closeMenu();
        } else {
          siteNav.classList.add('is-open');
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      }

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!siteNav.contains(e.target) && !toggleBtn.contains(e.target)) {
          closeMenu();
        }
      });

      // Close menu when pressing Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
          closeMenu();
          toggleBtn.focus();
        }
      });

      // Close menu when selecting a navigation link
      const navLinks = siteNav.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
      });
    }

    // Header Spin CTA behavior on main page
    if (headerSpinCta) {
      headerSpinCta.addEventListener('click', (e) => {
        const wheelEl = document.getElementById('wheelCanvas');
        if (wheelEl) {
          e.preventDefault();
          wheelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const spinBtn = document.getElementById('spinBtn');
          if (spinBtn && !spinBtn.disabled) {
            spinBtn.focus();
          }
        }
      });
    }
  }

  // Always initialize header navigation
  initHeaderNavigation();

  // --- Wheel DOM Elements & State ---
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const optionsInput = document.getElementById('optionsInput');
  const spinBtn = document.getElementById('spinBtn');
  const resetBtn = document.getElementById('resetBtn');
  const shareBtn = document.getElementById('shareBtn');
  const resultBox = document.getElementById('resultBox');
  const resultText = document.getElementById('resultText');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const toastNotice = document.getElementById('toastNotice');

  // If wheel elements are not present on this page, finish initialization safely
  if (!canvas || !ctx || !optionsInput || !spinBtn) {
    return;
  }

  // --- State ---
  let options = [];
  let cachedSlices = [];
  let currentRotation = 0; // in radians
  let isSpinning = false;
  let animationFrameId = null;

  // --- Helpers ---
  function getSegmentColor(index, total) {
    let colorIndex = index % PALETTE.length;
    // Prevent last item from having same color as first item
    if (total > 1 && index === total - 1 && colorIndex === 0) {
      colorIndex = (colorIndex + 1) % PALETTE.length;
    }
    return PALETTE[colorIndex];
  }

  function parseOptions(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  function formatOptions(arr) {
    return arr.join('\n');
  }

  function showToast(message) {
    if (!toastNotice) return;
    toastNotice.textContent = message;
    toastNotice.classList.add('show');
    clearTimeout(toastNotice._timer);
    toastNotice._timer = setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 2800);
  }

  // --- Precompute Truncated Slices for 60/120 FPS Performance ---
  function updateCachedSlices() {
    const count = options.length;
    if (count < 2 || !ctx) {
      cachedSlices = [];
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = (canvas ? canvas.width : 360) / dpr;
    const radius = (logicalWidth / 2) - 6;
    const maxTextWidth = radius * 0.62;

    let fontSize = 15;
    if (count > 24) fontSize = 10;
    else if (count > 16) fontSize = 12;
    else if (count > 10) fontSize = 13.5;

    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    cachedSlices = options.map((opt, i) => {
      let text = opt;
      if (ctx.measureText(text).width > maxTextWidth) {
        while (text.length > 1 && ctx.measureText(text + '…').width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        text += '…';
      }
      return {
        raw: opt,
        display: text,
        color: getSegmentColor(i, count),
        fontSize: fontSize
      };
    });
  }

  // --- Canvas Sizing & DPI Scaling ---
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width || 360, 360);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.scale(dpr, dpr);
    updateCachedSlices();
    drawWheel();
  }

  // --- Wheel Drawing ---
  function drawWheel() {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;
    const centerX = logicalWidth / 2;
    const centerY = logicalHeight / 2;
    const radius = centerX - 6;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const count = options.length;

    // Empty state if fewer than 2 options
    if (count < 2) {
      ctx.save();
      // Draw placeholder circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Placeholder text
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count === 0 ? 'Enter at least 2 options' : 'Add 1 more option', centerX, centerY);
      ctx.restore();
      return;
    }

    const sliceAngle = (2 * Math.PI) / count;

    // Draw Wheel Segments
    for (let i = 0; i < count; i++) {
      const sliceStart = currentRotation + i * sliceAngle;
      const sliceEnd = sliceStart + sliceAngle;
      const sliceData = cachedSlices[i] || {
        display: options[i],
        color: getSegmentColor(i, count),
        fontSize: 14
      };

      // Slice sector
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, sliceStart, sliceEnd);
      ctx.closePath();

      ctx.fillStyle = sliceData.color;
      ctx.fill();

      // Divider line between segments
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Segment Text (Crisp 1px shadow, no GPU-choking software blur)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sliceStart + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      ctx.font = `700 ${sliceData.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      ctx.fillText(sliceData.display, radius - 16, 0);
      ctx.restore();
    }

    // Outer wheel border rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Center Hub (tactile interactive button aesthetic)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Hub outer white ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Hub primary circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = isSpinning ? '#4338ca' : '#4f46e5';
    ctx.fill();

    // Hub inner tactile bevel
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = isSpinning ? '#3730a3' : '#6366f1';
    ctx.fill();

    // Hub center button label
    ctx.shadowColor = 'transparent';
    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isSpinning ? '•••' : 'SPIN', centerX, centerY + 0.5);

    ctx.restore();
  }

  // --- Determine Winning Option & Index ---
  // Pointer is at 12 o'clock position (270 degrees or 1.5 * Math.PI)
  function getSelectedOptionIndex() {
    if (options.length === 0) return -1;
    const count = options.length;
    const sliceAngle = (2 * Math.PI) / count;
    const pointerAngle = 1.5 * Math.PI; // 12 o'clock

    const normalizedAngle = (currentRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    let relativePointer = (pointerAngle - normalizedAngle) % (2 * Math.PI);
    if (relativePointer < 0) {
      relativePointer += 2 * Math.PI;
    }

    return Math.floor(relativePointer / sliceAngle) % count;
  }

  function getSelectedOption() {
    const index = getSelectedOptionIndex();
    if (index === -1) return '';
    return options[index] || '';
  }

  // --- Silky Smooth Quartic Deceleration Curve ---
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // --- Pointer Ticking & Subtle Tactile Audio Feedback ---
  let audioCtx = null;
  let lastAudioTickTime = 0;
  let lastVisualTickTime = 0;
  const pointerEl = document.querySelector('.wheel-pointer');
  let pointerTickTimeout = null;

  function playTickSound() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = performance.now();
      // Throttle audio ticks to at most ~20 ticks/sec to prevent audio congestion
      if (now - lastAudioTickTime < 48) {
        return;
      }
      lastAudioTickTime = now;

      if (audioCtx && audioCtx.state === 'running') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680 + Math.random() * 60, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.025);

        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.025);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.028);
      }
    } catch (e) {
      // Graceful fallback if audio is restricted
    }
  }

  function triggerPointerTick() {
    const now = performance.now();
    // Throttle DOM class manipulations during ultra-fast spins to keep 60 FPS
    if (now - lastVisualTickTime >= 40) {
      lastVisualTickTime = now;
      if (pointerEl) {
        pointerEl.classList.add('tick');
        clearTimeout(pointerTickTimeout);
        pointerTickTimeout = setTimeout(() => {
          pointerEl.classList.remove('tick');
        }, 30);
      }
    }
    playTickSound();
  }

  // --- Scroll Wheel Comfortably Into View Only If Obscured ---
  function scrollWheelIntoViewIfNeeded() {
    const wheelContainer = document.querySelector('.wheel-container') || canvas;
    if (!wheelContainer) return;

    const rect = wheelContainer.getBoundingClientRect();
    const header = document.getElementById('siteHeader');
    const headerHeight = (header ? header.offsetHeight : 60) + 16;

    // Only scroll if wheel is genuinely off-screen
    const isObscuredAbove = rect.top < headerHeight;
    const isScrolledDown = rect.bottom > window.innerHeight;

    if (isObscuredAbove || isScrolledDown) {
      const viewportHeight = window.innerHeight;
      const targetScrollTop = window.pageYOffset + rect.top - headerHeight - 16;

      window.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }

  // --- Spin Animation ---
  function spin(shouldScroll = false) {
    if (isSpinning || options.length < 2) return;

    if (shouldScroll) {
      scrollWheelIntoViewIfNeeded();
    }

    isSpinning = true;
    spinBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    canvas.style.cursor = 'wait';

    // Update Result display during spin
    if (resultBox) resultBox.classList.remove('highlight');
    if (resultText) resultText.textContent = 'Spinning...';

    // Perfectly balanced 4.8s duration: exciting, smooth, suspenseful
    const duration = 4800 + Math.random() * 400;
    const startAngle = currentRotation;

    // 7 to 10 full rotations plus random final position
    const extraSpins = (7 + Math.floor(Math.random() * 3)) * (2 * Math.PI);
    const randomOffset = Math.random() * (2 * Math.PI);
    const totalRotation = extraSpins + randomOffset;

    let lastTickOptionIndex = getSelectedOptionIndex();
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      currentRotation = startAngle + totalRotation * easedProgress;
      drawWheel();

      // Trigger pointer tick as segments pass pointer
      const currentOptionIndex = getSelectedOptionIndex();
      if (currentOptionIndex !== lastTickOptionIndex) {
        lastTickOptionIndex = currentOptionIndex;
        triggerPointerTick();
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        finishSpin();
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
    canvas.style.cursor = 'pointer';

    if (pointerEl) {
      pointerEl.classList.remove('tick');
    }

    drawWheel();

    const winner = getSelectedOption();

    if (resultText) {
      resultText.textContent = winner;
    }
    if (resultBox) {
      resultBox.classList.add('highlight');
    }

    // Announce to screen readers
    const announcement = `Result: ${winner}`;
    resultBox.setAttribute('aria-label', announcement);
  }

  // --- Option Management & LocalStorage ---
  function updateOptionsFromInput(save = true) {
    options = parseOptions(optionsInput.value);

    if (options.length < 2) {
      spinBtn.disabled = true;
      if (resultText && !isSpinning) {
        resultText.textContent = options.length === 0 ? 'Enter options to begin' : 'Add at least 2 options';
      }
    } else {
      if (!isSpinning) {
        spinBtn.disabled = false;
      }
    }

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, optionsInput.value);
      } catch (e) {
        // LocalStorage disabled or quota exceeded
      }
    }

    updateCachedSlices();
    drawWheel();
  }

  function loadInitialOptions() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    if (saved && saved.trim().length > 0) {
      optionsInput.value = saved;
    } else {
      // Default to Food preset
      optionsInput.value = formatOptions(PRESETS.food);
    }
    updateOptionsFromInput(false);
  }

  function applyPreset(presetKey) {
    if (isSpinning) return;
    const items = PRESETS[presetKey];
    if (items) {
      optionsInput.value = formatOptions(items);
      updateOptionsFromInput(true);
      if (resultText) resultText.textContent = 'Ready to spin!';
      if (resultBox) resultBox.classList.remove('highlight');

      // Update active state on preset buttons
      presetButtons.forEach(btn => {
        if (btn.dataset.preset === presetKey) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  function resetOptions() {
    if (isSpinning) return;
    optionsInput.value = '';
    updateOptionsFromInput(true);
    if (resultText) resultText.textContent = 'Enter options to begin';
    if (resultBox) resultBox.classList.remove('highlight');
    presetButtons.forEach(btn => btn.classList.remove('active'));
    optionsInput.focus();
  }

  // --- Web Share API & Fallback ---
  async function shareApp() {
    // When hosted on production domain (vectric.online), share 'https://vectric.online/'
    // When running in preview/dev environment, share the current URL
    // so Chrome matches the active tab and immediately displays its cached 192x192 favicon
    // rather than trying to fetch an unreachable domain and falling back to a generic globe icon.
    const isProdHost = window.location.hostname === 'vectric.online' || window.location.hostname === 'www.vectric.online';
    const targetUrl = isProdHost ? SITE_URL : window.location.href;

    const shareData = {
      title: 'Spin the Wheel – Random Decision Maker | Vectric',
      text: 'Make fast and fun random decisions, pick names, and play games with this free online wheel!',
      url: targetUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(targetUrl);
        }
      }
    } else {
      copyToClipboard(targetUrl);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Link copied to clipboard!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!');
    } catch (e) {
      showToast(text);
    }
    document.body.removeChild(tempInput);
  }

  // --- Event Listeners ---
  optionsInput.addEventListener('input', () => {
    updateOptionsFromInput(true);
    presetButtons.forEach(btn => btn.classList.remove('active'));
  });

  // 1. Primary Spin Button
  spinBtn.addEventListener('click', () => {
    spin(true);
  });

  // 2. Direct Wheel Touch & Tap Interaction (Without Scroll Hijacking)
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;
  let isPointerActive = false;
  let isScrollingPage = false;
  let tapHandled = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (isSpinning) return;
    isPointerActive = true;
    isScrollingPage = false;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerStartTime = performance.now();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isPointerActive) return;
    const deltaX = Math.abs(e.clientX - pointerStartX);
    const deltaY = Math.abs(e.clientY - pointerStartY);
    // If vertical movement exceeds 8px, user is scrolling the page
    if (deltaY > 8 || deltaX > 14) {
      isScrollingPage = true;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!isPointerActive || isSpinning) {
      isPointerActive = false;
      return;
    }
    isPointerActive = false;

    // Never spin if user was dragging or scrolling the page
    if (isScrollingPage) return;

    const deltaX = e.clientX - pointerStartX;
    const deltaY = e.clientY - pointerStartY;
    const dragDistance = Math.hypot(deltaX, deltaY);
    const duration = performance.now() - pointerStartTime;

    // Trigger on clean tap (short press, no drag)
    if (duration < 380 && dragDistance < 10 && options.length >= 2) {
      tapHandled = true;
      setTimeout(() => { tapHandled = false; }, 350);
      spin(false);
    }
  });

  canvas.addEventListener('pointercancel', () => {
    isPointerActive = false;
    isScrollingPage = false;
  });

  // Direct Click fallback (e.g. mouse clicks or accessibility)
  canvas.addEventListener('click', (e) => {
    if (tapHandled || isSpinning || options.length < 2) return;
    spin(false);
  });

  // 3. Keyboard Shortcuts: Space or Enter on Wheel Canvas
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!isSpinning && options.length >= 2) {
        spin(false);
      }
    }
  });

  // 4. Global Keyboard Shortcut: Press Space anywhere (outside text inputs) to Spin
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !e.repeat) {
      const activeEl = document.activeElement;
      const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isTyping = tag === 'textarea' || tag === 'input' || (activeEl && activeEl.isContentEditable);
      if (!isTyping && !isSpinning && options.length >= 2) {
        e.preventDefault();
        spin(false);
      }
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', resetOptions);
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', shareApp);
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      if (presetKey) {
        applyPreset(presetKey);
      }
    });
  });

  // Handle Window Resize (for responsive canvas scaling)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 100);
  });

  // Initialize
  loadInitialOptions();
  resizeCanvas();

})();
