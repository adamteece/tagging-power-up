// --- Multi-element selection support ---
const selectedElements = new Set();

function addElementToSelection(el) {
  if (!selectedElements.has(el)) {
    selectedElements.add(el);
    el.classList.add('tp-multiselect-highlight');
  }
}

function removeElementFromSelection(el) {
  if (selectedElements.has(el)) {
    selectedElements.delete(el);
    el.classList.remove('tp-multiselect-highlight');
  }
}

function clearSelection() {
  for (const el of selectedElements) {
    el.classList.remove('tp-multiselect-highlight');
  }
  selectedElements.clear();
  updateSelectedCount();
}

function updateSelectedCount() {
  if (selectorOverlay) {
    const countSpan = selectorOverlay.querySelector('#tp-selected-count');
    if (countSpan) {
      countSpan.textContent = `Selected: ${selectedElements.size}`;
    }
  }
}
// Tagging Power-Up Element Inspector Content Script
// Handles element selection, Shadow DOM traversal, selector generation, and match counting.

let inspectorActive = false;
let highlightBox = null;
let lastElement = null;
let selectorOverlay = null;
let selectorOverlayDrag = { dragging: false, offsetX: 0, offsetY: 0 };
let currentElement = null;
let currentSelectorOptions = [];
let currentSelectorIndex = 0;
let currentSelectorComponents = [];
let usingCustomSelector = false;
let parentStack = [];
let childIndexStack = [];
let customAttributes = [];
// Always load custom attributes from browser.storage.local (never use localStorage)
async function loadCustomAttributes() {
  if (window.browser && browser.storage && browser.storage.local) {
    const result = await browser.storage.local.get('tp_custom_attributes');
    if (result.tp_custom_attributes && Array.isArray(result.tp_custom_attributes)) {
      customAttributes = result.tp_custom_attributes.filter(Boolean);
    } else {
      customAttributes = [];
    }
  } else {
    customAttributes = [];
  }
  return customAttributes;
}
async function createSelectorOverlay() {
  if (selectorOverlay) return;
  // Always reload customAttributes from storage before showing overlay
  await loadCustomAttributes();
  selectorOverlay = document.createElement('div');
  selectorOverlay.style.position = 'fixed';
  selectorOverlay.style.top = '32px';
  selectorOverlay.style.left = '32px';
  selectorOverlay.style.zIndex = '2147483648';
  selectorOverlay.style.background = '#f8fafd';
  selectorOverlay.style.border = '1.5px solid #e0e4ea';
  selectorOverlay.style.borderRadius = '12px';
  selectorOverlay.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10)';
  selectorOverlay.style.padding = '18px 20px 16px 20px';
  selectorOverlay.style.minWidth = '320px';
  selectorOverlay.style.fontFamily = 'Segoe UI, Arial, sans-serif';
  selectorOverlay.style.fontSize = '15px';
  selectorOverlay.style.cursor = 'move';
  selectorOverlay.style.userSelect = 'none';
  selectorOverlay.style.display = 'flex';
  selectorOverlay.style.flexDirection = 'column';
  selectorOverlay.style.gap = '10px';
  selectorOverlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:18px;color:#1976d2;letter-spacing:0.5px;cursor:move;">
      <span style="display:flex;align-items:center;gap:8px;">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#fff"/><circle cx="11" cy="11" r="9.5" stroke="#1976d2" stroke-width="3"/><circle cx="11" cy="11" r="4" fill="#1976d2"/></svg>
        Tagging Power-Up
      </span>
      <span id="tp-close-overlay" style="cursor:pointer;font-size:20px;color:#aaa;">✕</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px;">
      <button id="tp-select-element" style="background:#1fa3c9;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-weight:600;font-size:15px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.04);">Select New Element</button>
      <button id="tp-clear-selection" style="background:#f44336;color:#fff;border:none;border-radius:6px;padding:8px 12px;font-weight:600;font-size:15px;cursor:pointer;">Clear Selection</button>
      <span id="tp-selected-count" style="font-size:14px;color:#1976d2;font-weight:600;">Selected: 0</span>
    </div>
    <div id="tp-selector-chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2px;"></div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button id="tp-up-element" title="Select Parent" style="background:#f3f4f8;border:none;border-radius:5px;padding:4px 8px;cursor:pointer;font-size:16px;">↑</button>
      <button id="tp-down-element" title="Select Child" style="background:#f3f4f8;border:none;border-radius:5px;padding:4px 8px;cursor:pointer;font-size:16px;">↓</button>
      <span style="font-size:13px;color:#888;">Navigate DOM</span>
    </div>
    <div style="margin-top:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <label style="font-size:14px;color:#444;font-weight:600;">Selector Mode:</label>
        <button id="tp-toggle-mode" style="background:#fff;color:#1976d2;border:1px solid #1976d2;border-radius:4px;padding:4px 12px;font-weight:600;cursor:pointer;font-size:13px;">Custom Builder</button>
      </div>
    </div>
    <div id="tp-components-section" style="display:none;margin-top:8px;border:1px solid #e0e4ea;border-radius:6px;padding:10px;background:#f9f9f9;">
      <div style="font-size:13px;color:#444;font-weight:600;margin-bottom:6px;">Select components to build custom selector:</div>
      <div id="tp-component-list" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto;"></div>
    </div>
    <div style="margin-top:6px;">
      <label style="font-size:13px;color:#444;">Selection:</label>
      <input id="tp-selector-input" style="width:100%;margin-top:2px;padding:4px 6px;border:1px solid #e0e4ea;border-radius:4px;font-size:14px;" readonly />
      <button id="tp-copy-selector" style="margin-top:4px;background:#fff;color:#1fa3c9;border:1px solid #1fa3c9;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;float:right;">Copy</button>
      <button id="tp-validate-selector" style="margin-top:4px;background:#fff;color:#1fa3c9;border:1px solid #1fa3c9;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;float:right;margin-right:8px;">Count Matches</button>
      <span id="tp-match-count" style="margin-left:8px;font-weight:bold;"></span>
    </div>
    <div id="tp-custom-attr-div" style="margin-top:8px;display:flex;align-items:center;">
      <label style="font-size:13px;color:#444;margin-right:6px;">Custom attribute(s):</label>
      <input id="tp-custom-attr-input" style="flex:1;padding:3px 6px;border:1px solid #e0e4ea;border-radius:4px;font-size:13px;" placeholder="e.g. data-qa, data-role" />
      <button id="tp-save-custom-attr" style="margin-left:6px;background:#1976d2;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer;">Save</button>
    </div>
    <style>.tp-multiselect-highlight { outline: 2.5px solid #f44336 !important; background: rgba(244,67,54,0.08) !important; }</style>
  `;
  // Clear selection button
  selectorOverlay.querySelector('#tp-clear-selection').onclick = clearSelection;
  updateSelectedCount();
  
  // Toggle mode button
  selectorOverlay.querySelector('#tp-toggle-mode').onclick = () => {
    usingCustomSelector = !usingCustomSelector;
    const toggleBtn = selectorOverlay.querySelector('#tp-toggle-mode');
    const componentsSection = selectorOverlay.querySelector('#tp-components-section');
    const chipsSection = selectorOverlay.querySelector('#tp-selector-chips');
    
    if (usingCustomSelector) {
      toggleBtn.textContent = 'Preset Selectors';
      toggleBtn.style.background = '#1976d2';
      toggleBtn.style.color = '#fff';
      componentsSection.style.display = 'block';
      chipsSection.style.display = 'none';
      
      // Generate and show components for current element
      if (currentElement) {
        currentSelectorComponents = generateSelectorComponents(currentElement);
        updateComponentsList();
        updateSelectorInput();
      }
    } else {
      toggleBtn.textContent = 'Custom Builder';
      toggleBtn.style.background = '#fff';
      toggleBtn.style.color = '#1976d2';
      componentsSection.style.display = 'none';
      chipsSection.style.display = 'flex';
      
      // Reset to preset selector mode
      updateSelectorInput();
    }
  };
  
  document.body.appendChild(selectorOverlay);

  // Custom attribute input logic always present
  const input = selectorOverlay.querySelector('#tp-custom-attr-input');
  input.value = customAttributes.join(', ');
  selectorOverlay.querySelector('#tp-save-custom-attr').onclick = async () => {
    customAttributes = input.value.split(',').map(s => s.trim()).filter(Boolean);
    // Save or clear from browser.storage.local for global persistence
    if (window.browser && browser.storage && browser.storage.local) {
      if (customAttributes.length) {
        await browser.storage.local.set({tp_custom_attributes: customAttributes});
      } else {
        await browser.storage.local.remove('tp_custom_attributes');
      }
    }
    // Remove any empty values from the UI
    input.value = customAttributes.join(', ');
    // Re-show overlay to update selector options
    if (currentElement) {
      const options = generateSelector(currentElement);
      // Regenerate components as well since custom attributes changed
      currentSelectorComponents = generateSelectorComponents(currentElement);
      showSelectorOverlay(options, currentElement);
    }
  };

  // Drag logic
  const header = selectorOverlay.firstElementChild;
  header.addEventListener('mousedown', (e) => {
    selectorOverlayDrag.dragging = true;
    selectorOverlayDrag.offsetX = e.clientX - selectorOverlay.offsetLeft;
    selectorOverlayDrag.offsetY = e.clientY - selectorOverlay.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (selectorOverlayDrag.dragging) {
      selectorOverlay.style.left = (e.clientX - selectorOverlayDrag.offsetX) + 'px';
      selectorOverlay.style.top = (e.clientY - selectorOverlayDrag.offsetY) + 'px';
    }
  });
  document.addEventListener('mouseup', () => {
    selectorOverlayDrag.dragging = false;
    document.body.style.userSelect = '';
  });

  // Close overlay
  selectorOverlay.querySelector('#tp-close-overlay').onclick = () => {
    selectorOverlay.remove();
    selectorOverlay = null;
    // Remove any leftover highlight when the overlay is closed
    removeHighlightBox();
  };
}

async function showSelectorOverlay(selectorOptions, element) {
  await createSelectorOverlay();
  // Add custom attribute input UI at the bottom if not already present
  let customAttrDiv = selectorOverlay.querySelector('#tp-custom-attr-div');
  if (customAttrDiv) {
    // Always update input value from latest customAttributes
    const input = customAttrDiv.querySelector('#tp-custom-attr-input');
    input.value = customAttributes.join(', ');
  }
  // Only update navigation state if navigating to a new element (not just re-rendering)
  if (element !== currentElement) {
    currentElement = element;
    currentSelectorOptions = selectorOptions || [];
    currentSelectorIndex = 0;
    // Reset to preset mode when selecting new element
    usingCustomSelector = false;
    currentSelectorComponents = generateSelectorComponents(element);
  }
  // Highlight the selected element in the DOM
  if (currentElement) {
    highlightElement(currentElement);
  }

  // Render selector chips
  const chips = selectorOverlay.querySelector('#tp-selector-chips');
  chips.innerHTML = '';
  currentSelectorOptions.forEach((opt, idx) => {
    const chip = document.createElement('span');
    chip.textContent = opt.selector;
    chip.style.background = idx === currentSelectorIndex ? '#e3f2fd' : '#f3f4f8';
    chip.style.color = '#1976d2';
    chip.style.borderRadius = '5px';
    chip.style.padding = '3px 8px';
    chip.style.fontWeight = '600';
    chip.style.fontSize = '13px';
    chip.style.marginRight = '2px';
    chip.style.cursor = 'pointer';
    chip.style.border = idx === currentSelectorIndex ? '1.5px solid #1976d2' : '1.5px solid transparent';
    chip.onclick = () => {
      currentSelectorIndex = idx;
      updateSelectorInput();
      // Only update chip highlights, not the whole overlay (prevents reset)
      Array.from(chips.children).forEach((c, i) => {
        c.style.background = i === currentSelectorIndex ? '#e3f2fd' : '#f3f4f8';
        c.style.border = i === currentSelectorIndex ? '1.5px solid #1976d2' : '1.5px solid transparent';
      });
    };
    chips.appendChild(chip);
  });

  updateSelectorInput();

  // Copy button
  selectorOverlay.querySelector('#tp-copy-selector').onclick = () => {
    const selector = usingCustomSelector ? 
      buildCustomSelector() : 
      currentSelectorOptions[currentSelectorIndex].selector;
    if (selector) {
      navigator.clipboard.writeText(selector);
    }
  };
  // Validate button
  selectorOverlay.querySelector('#tp-validate-selector').onclick = () => {
    const selector = usingCustomSelector ? 
      buildCustomSelector() : 
      currentSelectorOptions[currentSelectorIndex].selector;
    if (selector) {
      const count = countMatchesDeep(selector);
      selectorOverlay.querySelector('#tp-match-count').textContent = `Matches: ${count} element${count === 1 ? '' : 's'}`;
    }
  };

  // Up navigation: go to parent and remember which child you came from
  selectorOverlay.querySelector('#tp-up-element').onclick = () => {
    if (currentElement && currentElement.parentElement) {
      const parent = currentElement.parentElement;
      // Remember which child index we came from
      const children = Array.from(parent.children);
      const idx = children.indexOf(currentElement);
      parentStack.push(currentElement);
      childIndexStack.push(idx);
      const options = generateSelector(parent);
      showSelectorOverlay(options, parent);
    }
  };
  // Down navigation: return to the child you came from, if possible
  selectorOverlay.querySelector('#tp-down-element').onclick = () => {
    if (parentStack.length > 0 && childIndexStack.length > 0) {
      const child = parentStack.pop();
      childIndexStack.pop();
      const options = generateSelector(child);
      showSelectorOverlay(options, child);
    } else if (currentElement && currentElement.children.length > 0) {
      // Fallback: select first child
      const child = currentElement.children[0];
      const options = generateSelector(child);
      showSelectorOverlay(options, child);
    }
  };

  // Select new element
  selectorOverlay.querySelector('#tp-select-element').onclick = () => {
    activateInspector();
    selectorOverlay.style.display = 'none';
  };
  
  // Update UI state based on current mode
  const toggleBtn = selectorOverlay.querySelector('#tp-toggle-mode');
  const componentsSection = selectorOverlay.querySelector('#tp-components-section');
  const chipsSection = selectorOverlay.querySelector('#tp-selector-chips');
  
  if (usingCustomSelector) {
    toggleBtn.textContent = 'Preset Selectors';
    toggleBtn.style.background = '#1976d2';
    toggleBtn.style.color = '#fff';
    componentsSection.style.display = 'block';
    chipsSection.style.display = 'none';
    updateComponentsList();
  } else {
    toggleBtn.textContent = 'Custom Builder';
    toggleBtn.style.background = '#fff';
    toggleBtn.style.color = '#1976d2';
    componentsSection.style.display = 'none';
    chipsSection.style.display = 'flex';
  }
}

function updateComponentsList() {
  const componentList = selectorOverlay.querySelector('#tp-component-list');
  if (!componentList || !currentSelectorComponents) return;
  
  componentList.innerHTML = '';
  currentSelectorComponents.forEach((component, idx) => {
    const item = document.createElement('label');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '6px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '13px';
    item.style.padding = '2px 0';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = component.selected;
    checkbox.style.marginRight = '4px';
    checkbox.onchange = () => {
      currentSelectorComponents[idx].selected = checkbox.checked;
      updateSelectorInput();
    };
    
    const label = document.createElement('span');
    label.textContent = component.label;
    label.style.color = component.selected ? '#1976d2' : '#666';
    
    item.appendChild(checkbox);
    item.appendChild(label);
    componentList.appendChild(item);
    
    // Update label color when checkbox changes
    checkbox.onchange = () => {
      currentSelectorComponents[idx].selected = checkbox.checked;
      label.style.color = checkbox.checked ? '#1976d2' : '#666';
      updateSelectorInput();
    };
  });
}

function buildCustomSelector() {
  if (!currentSelectorComponents) return '';
  
  const selectedComponents = currentSelectorComponents.filter(c => c.selected);
  if (selectedComponents.length === 0) return '';
  
  // Group components by type to build a valid selector
  const tag = selectedComponents.find(c => c.type === 'tag');
  const id = selectedComponents.find(c => c.type === 'id');
  const classes = selectedComponents.filter(c => c.type === 'class');
  const attributes = selectedComponents.filter(c => c.type === 'attribute');
  const nthChild = selectedComponents.find(c => c.type === 'nth-child');
  const contains = selectedComponents.find(c => c.type === 'contains');
  
  let selector = '';
  
  // Start with tag if selected
  if (tag) {
    selector += tag.selector;
  }
  
  // Add ID
  if (id) {
    selector += id.selector;
  }
  
  // Add classes
  classes.forEach(c => {
    selector += c.selector;
  });
  
  // Add attributes
  attributes.forEach(a => {
    selector += a.selector;
  });
  
  // Add nth-child
  if (nthChild) {
    selector += nthChild.selector;
  }
  
  // Add contains (typically used with tag)
  if (contains && tag) {
    selector = tag.selector + contains.selector;
  } else if (contains && !tag) {
    selector += '*' + contains.selector;
  }
  
  return selector;
}

function updateSelectorInput() {
  const input = selectorOverlay.querySelector('#tp-selector-input');
  if (!input) return;
  
  if (usingCustomSelector) {
    // Show custom built selector
    input.value = buildCustomSelector();
  } else {
    // Show preset selector
    if (currentSelectorOptions.length > 0) {
      input.value = currentSelectorOptions[currentSelectorIndex].selector;
    } else {
      input.value = '';
    }
  }
  
  // Clear match count when selector changes
  const matchCount = selectorOverlay.querySelector('#tp-match-count');
  if (matchCount) {
    matchCount.textContent = '';
  }
}

function createHighlightBox() {
  if (highlightBox) return;
  highlightBox = document.createElement('div');
  highlightBox.style.position = 'fixed';
  highlightBox.style.zIndex = '2147483646'; // lower than overlay
  highlightBox.style.pointerEvents = 'none';
  highlightBox.style.border = '2px solid #0078d7';
  highlightBox.style.background = 'rgba(0,120,215,0.1)';
  highlightBox.style.transition = 'all 0.05s';
  document.body.appendChild(highlightBox);
}

function removeHighlightBox() {
  if (highlightBox) {
    highlightBox.remove();
    highlightBox = null;
  }
}

function getDeepElementFromPoint(x, y) {
  let el = document.elementFromPoint(x, y);
  let path = [];
  while (el && el.shadowRoot) {
    path.push(el);
    const nested = el.shadowRoot.elementFromPoint(x, y);
    if (!nested || nested === el) break;
    el = nested;
  }
  return el;
}

function highlightElement(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  createHighlightBox();
  highlightBox.style.left = rect.left + 'px';
  highlightBox.style.top = rect.top + 'px';
  highlightBox.style.width = rect.width + 'px';
  highlightBox.style.height = rect.height + 'px';
}

function generateSelectorComponents(el) {
  // Generate individual selector components that can be combined
  if (!el) return [];
  const components = [];
  
  // Tag name component
  components.push({
    type: 'tag',
    selector: el.tagName.toLowerCase(),
    label: `Tag: ${el.tagName.toLowerCase()}`,
    selected: true
  });
  
  // ID component
  if (el.id) {
    components.push({
      type: 'id',
      selector: `#${CSS.escape(el.id)}`,
      label: `ID: #${el.id}`,
      selected: false
    });
  }
  
  // Individual class components
  if (el.classList.length) {
    Array.from(el.classList).forEach(className => {
      components.push({
        type: 'class',
        selector: `.${CSS.escape(className)}`,
        label: `Class: .${className}`,
        selected: false
      });
    });
  }
  
  // Attribute components
  if (el.getAttribute('data-testid')) {
    components.push({
      type: 'attribute',
      selector: `[data-testid="${el.getAttribute('data-testid')}"]`,
      label: `Attribute: data-testid="${el.getAttribute('data-testid')}"`,
      selected: false
    });
  }
  
  // Custom attribute components
  if (Array.isArray(customAttributes)) {
    customAttributes.forEach(attr => {
      if (attr && el.hasAttribute && el.hasAttribute(attr)) {
        components.push({
          type: 'attribute',
          selector: `[${attr}="${el.getAttribute(attr)}"]`,
          label: `Attribute: ${attr}="${el.getAttribute(attr)}"`,
          selected: false
        });
      }
    });
  }
  
  // Other standard attributes that might be useful
  ['name', 'value', 'title', 'alt', 'role'].forEach(attr => {
    if (el.hasAttribute(attr) && !customAttributes.includes(attr)) {
      const value = el.getAttribute(attr);
      if (value) {
        components.push({
          type: 'attribute',
          selector: `[${attr}="${value}"]`,
          label: `Attribute: ${attr}="${value}"`,
          selected: false
        });
      }
    }
  });
  
  // Nth-child component
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter(e => e.tagName === el.tagName);
    if (siblings.length > 1) {
      const idx = siblings.indexOf(el) + 1;
      components.push({
        type: 'nth-child',
        selector: `:nth-of-type(${idx})`,
        label: `Position: nth-of-type(${idx})`,
        selected: false
      });
    }
  }
  
  // Text content component (for contains selector)
  const text = (el.textContent || '').trim();
  if (text && text.length < 50 && text.length > 2) {
    // Truncate long text for display
    const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
    components.push({
      type: 'contains',
      selector: `:contains("${text}")`,
      label: `Text: contains("${displayText}")`,
      selected: false
    });
  }
  
  return components;
}

function generateSelector(el) {
  // Generate multiple selector options: id, class, data-*, nth-child, contains(text)
  if (!el) return [];
  const options = [];
  if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    options.push({type: 'id', selector: `#${el.id}`});
  }
  if (el.getAttribute('data-testid')) {
    options.push({type: 'data-testid', selector: `[data-testid="${el.getAttribute('data-testid')}"]`});
  }
  // Add custom attribute selectors
  if (Array.isArray(customAttributes)) {
    customAttributes.forEach(attr => {
      if (attr && el.hasAttribute && el.hasAttribute(attr)) {
        options.push({type: attr, selector: `[${attr}="${el.getAttribute(attr)}"]`});
      }
    });
  }
  if (el.classList.length) {
    const classSelector = Array.from(el.classList).map(c => `.${CSS.escape(c)}`).join('');
    if (document.querySelectorAll(`${el.tagName.toLowerCase()}${classSelector}`).length === 1) {
      options.push({type: 'class', selector: `${el.tagName.toLowerCase()}${classSelector}`});
    }
  }
  // Fallback: tag + nth-child
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter(e => e.tagName === el.tagName);
    if (siblings.length > 1) {
      const idx = siblings.indexOf(el) + 1;
      options.push({type: 'nth-child', selector: `${el.tagName.toLowerCase()}:nth-of-type(${idx})`});
    }
  }
  // Contains selector (text content)
  const text = (el.textContent || '').trim();
  if (text && text.length < 100) {
    // Use :contains pseudo-class (not standard, but some tools support it)
    options.push({type: 'contains', selector: `${el.tagName.toLowerCase()}:contains("${text}")`});
  }
  // Always add tag name as last resort
  options.push({type: 'tag', selector: el.tagName.toLowerCase()});
  return options;
}

function handleMouseMove(e) {
  if (!inspectorActive) return;
  const el = getDeepElementFromPoint(e.clientX, e.clientY);
  if (el && el !== lastElement) {
    highlightElement(el);
    lastElement = el;
  }
}

function handleClick(e) {
  if (!inspectorActive) return;
  e.preventDefault();
  e.stopPropagation();
  const el = getDeepElementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  // Multi-select logic
  const isMulti = e.ctrlKey || e.metaKey;
  const isRange = e.shiftKey;
  if (isMulti) {
    if (selectedElements.has(el)) {
      removeElementFromSelection(el);
    } else {
      addElementToSelection(el);
    }
    updateSelectedCount();
    // Don't close inspector overlay, allow more selection
    return;
  } else if (isRange && selectedElements.size > 0) {
    // Range select: select all siblings between last selected and this
    const last = Array.from(selectedElements).slice(-1)[0];
    if (last && el.parentElement === last.parentElement) {
      const siblings = Array.from(el.parentElement.children);
      const start = siblings.indexOf(last);
      const end = siblings.indexOf(el);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        for (let i = from; i <= to; i++) {
          addElementToSelection(siblings[i]);
        }
      }
    }
    updateSelectedCount();
    return;
  } else {
    // Single select: clear previous, select this
    clearSelection();
    addElementToSelection(el);
    updateSelectedCount();
  }

  inspectorActive = false;
  removeHighlightBox();
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  const selectorOptions = generateSelector(el);
  console.log('[Tagging Power-Up] Element selected:', selectorOptions);
  showSelectorOverlay(selectorOptions, el);
  if (selectorOverlay) selectorOverlay.style.display = '';
}

function activateInspector() {
  inspectorActive = true;
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
}

function countMatchesDeep(selector, root = document) {
  let matches = Array.from(root.querySelectorAll(selector));
  // Traverse open shadow roots recursively
  const traverse = (node) => {
    if (node.shadowRoot) {
      matches = matches.concat(Array.from(node.shadowRoot.querySelectorAll(selector)));
      node.shadowRoot.querySelectorAll('*').forEach(traverse);
    } else if (node.children) {
      Array.from(node.children).forEach(traverse);
    }
  };
  Array.from(root.querySelectorAll('*')).forEach(traverse);
  return matches.length;
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'activate-inspector') {
    activateInspector();
  }
  if (msg.action === 'validate-selector') {
    const count = countMatchesDeep(msg.selector);
    browser.runtime.sendMessage({action: 'selector-match-count', count});
  }
});
