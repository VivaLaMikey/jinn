/**
 * jinn-extensions.js
 * Injects UI extensions into the Jinn web frontend:
 *  - Feature A: Context Compaction Button (chat pages only)
 *  - Feature B: Usage Indicator (all pages, sidebar)
 */
(function () {
  'use strict';

  // ─── Utilities ────────────────────────────────────────────────────────────

  var USAGE_REFRESH_INTERVAL = 60000; // 60 seconds
  var usageIntervalId = null;
  var usageIndicatorEl = null;
  var compactButtonDesktopEl = null;
  var compactButtonMobileEl = null;
  var currentSessionId = null;
  var sidebarInjected = false;
  var compactInjected = false;

  function isChatPage() {
    return window.location.pathname === '/chat' || window.location.pathname.startsWith('/chat');
  }

  /**
   * Extract session ID from URL search params or pathname.
   * The chat page uses ?session=<id> or similar query params.
   */
  function getSessionIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    // Try common param names
    var id = params.get('session') || params.get('sessionId') || params.get('id') || params.get('s');
    if (id) return id;

    // Try to find it in the DOM — Next.js may have rendered it
    var activeEl = document.querySelector('[data-session-id]');
    if (activeEl) return activeEl.getAttribute('data-session-id');

    return null;
  }

  function formatTimeUntil(dateStr) {
    if (!dateStr) return null;
    try {
      var target = new Date(dateStr);
      var now = new Date();
      var diffMs = target - now;
      if (diffMs <= 0) return 'Reset imminent';
      var diffMins = Math.floor(diffMs / 60000);
      var diffHours = Math.floor(diffMins / 60);
      var remMins = diffMins % 60;
      if (diffHours > 0) {
        return 'Resets in ' + diffHours + 'h ' + remMins + 'm';
      }
      return 'Resets in ' + diffMins + 'm';
    } catch (e) {
      return null;
    }
  }

  // ─── Feature B: Usage Indicator ───────────────────────────────────────────

  function getUsageColor(utilization) {
    if (utilization === null || utilization === undefined) return 'var(--text-secondary)';
    if (utilization > 75) return 'var(--system-red, #ff453a)';
    if (utilization > 50) return 'var(--system-orange, #ff9f0a)';
    return 'var(--system-green, #30d158)';
  }

  function createUsageIndicator() {
    var el = document.createElement('div');
    el.id = 'jinn-usage-indicator';
    el.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:10px',
      'height:40px',
      'padding:0 12px',
      'font-size:13px',
      'color:var(--text-secondary)',
      'white-space:nowrap',
      'cursor:default',
      'box-sizing:border-box',
    ].join(';');

    var dot = document.createElement('span');
    dot.id = 'jinn-usage-dot';
    dot.style.cssText = [
      'flex-shrink:0',
      'width:8px',
      'height:8px',
      'border-radius:50%',
      'background:var(--text-secondary)',
      'display:inline-block',
      'transition:background 0.3s',
    ].join(';');

    var label = document.createElement('span');
    label.id = 'jinn-usage-label';
    label.style.cssText = 'opacity:0;transition:opacity 200ms var(--ease-smooth,ease);';
    label.textContent = 'Usage';

    el.appendChild(dot);
    el.appendChild(label);
    return el;
  }

  function updateUsageIndicator(data) {
    if (!usageIndicatorEl) return;

    var dot = document.getElementById('jinn-usage-dot');
    if (!dot) return;

    // Handle "unavailable" status
    if (!data || data.status === 'unavailable' || data.utilization === null || data.utilization === undefined) {
      dot.style.background = 'var(--text-secondary)';
      usageIndicatorEl.title = 'Usage monitoring unavailable';
      return;
    }

    if (data.error) {
      dot.style.background = 'var(--text-secondary)';
      usageIndicatorEl.title = 'Error fetching usage';
      return;
    }

    var util = data.utilization;
    if (util === null || util === undefined) {
      dot.style.background = 'var(--text-secondary)';
      usageIndicatorEl.title = 'Usage: N/A';
      return;
    }

    var pct = Math.round(util * 100);
    var color = getUsageColor(util * 100);
    dot.style.background = color;

    var titleParts = ['Usage: ' + pct + '%'];
    var resetStr = formatTimeUntil(data.resetsAt);
    if (resetStr) titleParts.push(resetStr);
    if (data.pacingExceeded) titleParts.push('Pacing limit exceeded');
    else if (data.nearLimit) titleParts.push('Near limit');

    usageIndicatorEl.title = titleParts.join(' \u2022 ');
  }

  function fetchAndUpdateUsage() {
    fetch('/api/usage')
      .then(function (res) { return res.json(); })
      .then(function (data) { updateUsageIndicator(data); })
      .catch(function () { updateUsageIndicator({ error: true }); });
  }

  function injectUsageIndicator() {
    if (sidebarInjected) return;

    var aside = document.querySelector('aside');
    if (!aside) return;

    // The theme toggle is the last child div of aside (contains the button)
    var themeToggleDiv = aside.querySelector('div[style*="padding:8px"]');
    if (!themeToggleDiv) {
      // Fallback: last child of aside that is a div
      var asideChildren = aside.children;
      themeToggleDiv = asideChildren[asideChildren.length - 1];
    }

    if (!themeToggleDiv) return;

    usageIndicatorEl = createUsageIndicator();

    // Insert before the theme toggle div
    aside.insertBefore(usageIndicatorEl, themeToggleDiv);

    sidebarInjected = true;

    // Fetch immediately then set interval
    fetchAndUpdateUsage();
    if (usageIntervalId) clearInterval(usageIntervalId);
    usageIntervalId = setInterval(fetchAndUpdateUsage, USAGE_REFRESH_INTERVAL);
  }

  // ─── Feature A: Compact Button ────────────────────────────────────────────

  function createCompactButton(isMobile) {
    var btn = document.createElement('button');
    btn.id = isMobile ? 'jinn-compact-btn-mobile' : 'jinn-compact-btn-desktop';
    btn.setAttribute('aria-label', 'Compact conversation');
    btn.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'gap:5px',
      'height:36px',
      'padding:0 10px',
      'background:var(--fill-secondary,rgba(120,120,128,0.12))',
      'border:none',
      'border-radius:var(--radius-sm,6px)',
      'color:var(--text-secondary)',
      'font-size:12px',
      'font-weight:500',
      'cursor:pointer',
      'transition:background 0.15s,opacity 0.15s',
      'white-space:nowrap',
      'margin-right:6px',
    ].join(';');

    // Scissor-like SVG icon (compress)
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>'
      + '<span id="' + (isMobile ? 'jinn-compact-label-mobile' : 'jinn-compact-label-desktop') + '">Compact</span>';

    btn.addEventListener('mouseenter', function () {
      btn.style.background = 'var(--fill-tertiary,rgba(120,120,128,0.2))';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.background = 'var(--fill-secondary,rgba(120,120,128,0.12))';
    });

    btn.addEventListener('click', function () {
      handleCompact(btn, isMobile);
    });

    return btn;
  }

  function setCompactButtonState(btn, state, text) {
    if (!btn) return;
    var labelId = btn.id === 'jinn-compact-btn-desktop' ? 'jinn-compact-label-desktop' : 'jinn-compact-label-mobile';
    var label = document.getElementById(labelId);
    if (label) label.textContent = text || 'Compact';
    btn.disabled = state === 'loading';
    btn.style.opacity = state === 'loading' ? '0.6' : '1';
  }

  function handleCompact(triggerBtn, isMobile) {
    var sessionId = getSessionIdFromUrl() || currentSessionId;
    if (!sessionId) {
      setCompactButtonState(compactButtonDesktopEl, 'error', 'No session');
      setCompactButtonState(compactButtonMobileEl, 'error', 'No session');
      setTimeout(function () {
        setCompactButtonState(compactButtonDesktopEl, 'idle', 'Compact');
        setCompactButtonState(compactButtonMobileEl, 'idle', 'Compact');
      }, 2000);
      return;
    }

    setCompactButtonState(compactButtonDesktopEl, 'loading', 'Working...');
    setCompactButtonState(compactButtonMobileEl, 'loading', 'Working...');

    fetch('/api/sessions/' + encodeURIComponent(sessionId) + '/compact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success) {
          var resultText = data.originalCount + ' \u2192 ' + data.compactedCount;
          setCompactButtonState(compactButtonDesktopEl, 'success', resultText);
          setCompactButtonState(compactButtonMobileEl, 'success', resultText);
          // Reload to refresh message list after a brief pause
          setTimeout(function () { window.location.reload(); }, 1200);
        } else {
          var errMsg = (data && data.error) ? 'Error' : 'Failed';
          setCompactButtonState(compactButtonDesktopEl, 'error', errMsg);
          setCompactButtonState(compactButtonMobileEl, 'error', errMsg);
          setTimeout(function () {
            setCompactButtonState(compactButtonDesktopEl, 'idle', 'Compact');
            setCompactButtonState(compactButtonMobileEl, 'idle', 'Compact');
          }, 2500);
        }
      })
      .catch(function () {
        setCompactButtonState(compactButtonDesktopEl, 'error', 'Error');
        setCompactButtonState(compactButtonMobileEl, 'error', 'Error');
        setTimeout(function () {
          setCompactButtonState(compactButtonDesktopEl, 'idle', 'Compact');
          setCompactButtonState(compactButtonMobileEl, 'idle', 'Compact');
        }, 2500);
      });
  }

  function updateCompactButtonVisibility() {
    var sessionId = getSessionIdFromUrl();
    currentSessionId = sessionId;
    var visible = isChatPage() && !!sessionId;

    [compactButtonDesktopEl, compactButtonMobileEl].forEach(function (btn) {
      if (btn) {
        btn.style.display = visible ? 'flex' : 'none';
      }
    });
  }

  function injectCompactButton() {
    if (compactInjected) return;
    if (!isChatPage()) return;

    // Desktop: inject into the fixed top-right notification bar (hidden lg:flex)
    var desktopBar = document.querySelector('div.hidden.lg\\:flex[style*="position:fixed"]');
    if (!desktopBar) {
      // Fallback: find by style attributes
      var allFixedDivs = document.querySelectorAll('div[style*="position:fixed"][style*="top:12px"]');
      for (var i = 0; i < allFixedDivs.length; i++) {
        desktopBar = allFixedDivs[i];
        break;
      }
    }

    if (desktopBar) {
      compactButtonDesktopEl = createCompactButton(false);
      // Insert at the beginning (before notification bell)
      desktopBar.insertBefore(compactButtonDesktopEl, desktopBar.firstChild);
    }

    // Mobile: inject into mobile header (lg:hidden div)
    var mobileHeader = document.querySelector('div.lg\\:hidden[style*="height:48px"]');
    if (!mobileHeader) {
      // Fallback: find by height
      var allDivs = document.querySelectorAll('div[style*="height:48px"]');
      for (var j = 0; j < allDivs.length; j++) {
        if (allDivs[j].querySelector('button[aria-label="Open menu"]')) {
          mobileHeader = allDivs[j];
          break;
        }
      }
    }

    if (mobileHeader) {
      compactButtonMobileEl = createCompactButton(true);
      // Find the notification bell area in mobile header (the last div)
      var notifArea = mobileHeader.querySelector('div[style*="position:relative"]');
      if (notifArea) {
        mobileHeader.insertBefore(compactButtonMobileEl, notifArea);
      } else {
        mobileHeader.appendChild(compactButtonMobileEl);
      }
    }

    if (compactButtonDesktopEl || compactButtonMobileEl) {
      compactInjected = true;
      updateCompactButtonVisibility();
    }
  }

  // ─── URL Change Detection ──────────────────────────────────────────────────

  /**
   * Monitor URL changes in the SPA (Next.js client-side routing).
   * We patch history.pushState and popstate to catch navigation.
   */
  function setupUrlMonitor() {
    var lastUrl = window.location.href;

    function onUrlChange() {
      var newUrl = window.location.href;
      if (newUrl === lastUrl) return;
      lastUrl = newUrl;

      // Reset compact injection state when navigating to/from chat
      if (isChatPage() && !compactInjected) {
        // Try to inject if DOM is ready
        injectCompactButton();
      } else if (!isChatPage() && compactInjected) {
        // Hide buttons if navigated away from chat
        [compactButtonDesktopEl, compactButtonMobileEl].forEach(function (btn) {
          if (btn) btn.style.display = 'none';
        });
      } else if (isChatPage()) {
        updateCompactButtonVisibility();
      }
    }

    // Patch pushState
    var originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(history, arguments);
      setTimeout(onUrlChange, 50);
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);
      setTimeout(onUrlChange, 50);
    };

    window.addEventListener('popstate', function () {
      setTimeout(onUrlChange, 50);
    });

    // Poll URL for any changes missed (e.g. hash changes, React Router)
    setInterval(function () {
      if (window.location.href !== lastUrl) {
        onUrlChange();
      }
    }, 500);
  }

  // ─── DOM Ready Observer ────────────────────────────────────────────────────

  function tryInject() {
    var aside = document.querySelector('aside nav');
    if (aside && !sidebarInjected) {
      injectUsageIndicator();
    }
    if (isChatPage() && !compactInjected) {
      // Check that the desktop notification bar is present
      var desktopBar = document.querySelector('div.hidden.lg\\:flex[style*="position:fixed"]')
        || document.querySelector('div[style*="position:fixed"][style*="top:12px"]');
      if (desktopBar) {
        injectCompactButton();
      }
    }
  }

  function startObserver() {
    // Initial attempt
    tryInject();

    // Watch for Next.js hydration completing
    var observer = new MutationObserver(function () {
      tryInject();
      if (sidebarInjected && (!isChatPage() || compactInjected)) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also poll for URL-based session ID changes when on chat page
    setInterval(function () {
      if (isChatPage() && sidebarInjected) {
        updateCompactButtonVisibility();
      }
    }, 1000);
  }

  // ─── Initialise ───────────────────────────────────────────────────────────

  setupUrlMonitor();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

})();
