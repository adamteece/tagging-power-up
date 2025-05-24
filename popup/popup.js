// Tab switching logic
const tabs = document.querySelectorAll('#tabs button');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach((tab, idx) => {
  tab.addEventListener('click', () => {
    contents.forEach((c, i) => c.style.display = i === idx ? '' : 'none');
  });
});

// Element Inspector logic
const activateBtn = document.getElementById('activate-inspector');
const selectorSection = document.getElementById('selector-section');
const selectorOptions = document.getElementById('selector-options');
const copyBtn = document.getElementById('copy-selector');
const validateBtn = document.getElementById('validate-selector');
const matchCount = document.getElementById('match-count');

if (activateBtn) {
  activateBtn.addEventListener('click', () => {
    // Send message to content script to activate inspector
    if (window.browser && browser.tabs) {
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'activate-inspector'});
      });
    }
  });
}

if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    if (selectorOptions.value) {
      navigator.clipboard.writeText(selectorOptions.value);
    }
  });
}

if (validateBtn) {
  validateBtn.addEventListener('click', () => {
    if (window.browser && browser.tabs) {
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'validate-selector', selector: selectorOptions.value});
      });
    }
  });
}

// Listen for messages from content script
if (window.browser && browser.runtime) {
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'element-selected') {
      selectorSection.style.display = '';
      // Populate selector options dropdown
      selectorOptions.innerHTML = '';
      (msg.selectorOptions || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.selector;
        option.textContent = `${opt.selector} (${opt.type})`;
        selectorOptions.appendChild(option);
      });
      matchCount.textContent = '';
    }
    if (msg.action === 'selector-match-count') {
      matchCount.textContent = `Matches: ${msg.count} element${msg.count === 1 ? '' : 's'}`;
    }
  });

  // No storage fallback needed; rely on direct message from content script
}
