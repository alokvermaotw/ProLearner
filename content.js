(function() {
  // Prevent duplicate declaration if content.js is injected multiple times
  if (window.PROLEARNER_INITIALIZED) {
    return;
  }
  window.PROLEARNER_INITIALIZED = true;

  let sidebarContainer = null;
  let sidebarIframe = null;
  let isOpen = false;
  let currentWidthPercent = 25; // Default width 25%

  const styleId = 'prolearner-split-style';

  // Apply visual layout splitting on the webpage HTML element
  function applySplitLayout(widthPercent) {
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      html {
        width: ${100 - widthPercent}% !important;
        margin-right: ${widthPercent}% !important;
        transition: width 0.3s ease, margin-right 0.3s ease !important;
        box-sizing: border-box !important;
      }
      body {
        position: relative !important;
        width: 100% !important;
      }
    `;
  }

  // Restore webpage HTML to standard full-screen layout
  function removeSplitLayout() {
    const styleEl = document.getElementById(styleId);
    if (styleEl) {
      styleEl.remove();
    }
  }

  // Create and inject the sidebar container and iframe
  function createSidebar() {
    sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'prolearner-sidebar-container';
    sidebarContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      height: 100vh !important;
      width: 0 !important;
      z-index: 2147483647 !important;
      background: #0b0f19 !important;
      border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: -5px 0 25px rgba(0,0,0,0.3) !important;
      transition: width 0.3s ease !important;
      overflow: hidden !important;
    `;

    sidebarIframe = document.createElement('iframe');
    sidebarIframe.src = chrome.runtime.getURL('panel.html');
    sidebarIframe.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      border: none !important;
      background: transparent !important;
    `;

    sidebarContainer.appendChild(sidebarIframe);
    document.body.appendChild(sidebarContainer);
  }

  // Toggle open/closed state of the sidebar
  function toggleSidebar() {
    if (!sidebarContainer) {
      createSidebar();
    }

    if (isOpen) {
      // Close
      sidebarContainer.style.width = '0';
      removeSplitLayout();
      isOpen = false;
    } else {
      // Open
      sidebarContainer.style.width = `${currentWidthPercent}%`;
      applySplitLayout(currentWidthPercent);
      isOpen = true;
    }
  }

  // Set the width of the sidebar (25% or 50%)
  function setSidebarWidth(widthPercent) {
    if (!sidebarContainer || !isOpen) return;
    currentWidthPercent = widthPercent;
    sidebarContainer.style.width = `${widthPercent}%`;
    applySplitLayout(widthPercent);
  }

  // Extract webpage main text content cleanly for summary generation and Q&A
  function extractPageContent() {
    const title = document.title || 'Untitled Page';
    const url = window.location.href;
    
    // Attempt to locate the core content containers
    const contentSelectors = [
      'article', 
      'main', 
      '[role="main"]', 
      '.main-content', 
      '#content', 
      '.post-content', 
      '.wiki-content'
    ];
    
    let mainContainer = null;
    for (const selector of contentSelectors) {
      mainContainer = document.querySelector(selector);
      if (mainContainer) break;
    }
    
    // Fallback to body
    if (!mainContainer) {
      mainContainer = document.body;
    }

    const elements = mainContainer.querySelectorAll('h1, h2, h3, h4, p, li');
    let extractedLines = [];
    let characterCount = 0;

    for (const el of elements) {
      // Filter out hidden or non-narrative elements
      if (el.offsetParent === null) continue; // Hidden
      if (el.closest('header') || el.closest('footer') || el.closest('nav') || el.closest('aside')) continue;
      
      const text = el.innerText.trim();
      if (text.length < 5) continue; // Skip single words or short UI elements

      extractedLines.push(text);
      characterCount += text.length;

      // Restrict characters sent to save token usage
      if (characterCount > 8000) {
        break;
      }
    }

    return {
      title: title,
      url: url,
      content: extractedLines.join('\n\n') || document.body.innerText.substring(0, 4000).trim()
    };
  }

  // Listener for extension runtime messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle_sidebar') {
      toggleSidebar();
    }
  });

  // Listener for iframe communication postMessages
  window.addEventListener('message', (event) => {
    // Verify that the origin is our chrome extension page
    if (event.origin !== `chrome-extension://${chrome.runtime.id}`) {
      return;
    }

    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'prolearner-close':
        if (isOpen) {
          toggleSidebar();
        }
        break;
      case 'prolearner-resize':
        if (msg.width) {
          setSidebarWidth(msg.width);
        }
        break;
      case 'prolearner-request-content':
        if (sidebarIframe && sidebarIframe.contentWindow) {
          sidebarIframe.contentWindow.postMessage({
            type: 'prolearner-page-content',
            data: extractPageContent()
          }, `chrome-extension://${chrome.runtime.id}`);
        }
        break;
    }
  });

})();
