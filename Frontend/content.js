// content.js

// Enhanced email field detection and filling with comprehensive coverage
async function fillEmailField(email, options = {}) {
  const {
    maxRetries = 10,
    retryDelay = 500,
    includeFrames = true,
    waitForVisible = true,
    timeout = 30000
  } = options;

  // Comprehensive selectors for email fields
  const emailSelectors = [
    // Standard email inputs
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[placeholder*="email" i]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',

    // Common variations and patterns
    'input[name*="mail" i]',
    'input[id*="mail" i]',
    'input[placeholder*="mail" i]',
    'input[name*="user" i]:not([type="password"])',
    'input[id*="user" i]:not([type="password"])',
    'input[name*="login" i]:not([type="password"])',
    'input[id*="login" i]:not([type="password"])',

    // Text inputs that might be email fields
    'input[type="text"]',
    'input:not([type])',

    // Specific common patterns
    'input[data-testid*="email" i]',
    'input[data-cy*="email" i]',
    'input[class*="email" i]',
    'input[aria-label*="email" i]',

    // Form fields in common containers
    '.email input, .mail input, .login input',
    '[class*="email"] input, [class*="mail"] input',
    '[data-testid*="email"] input, [data-cy*="email"] input',

    // Additional broad selectors
    '[name="identifier"]',
    'input[name="ID" i]',
    'input[class*="username" i]',
    '#email', '#username', '#userid', '#login_id',

    // Amazon-specific selectors
    'input[name="ap_email"]',
    'input[name="ap_email_login"]',
    '#ap_email',

    // Other common site-specific patterns
    'input[name*="loginfmt" i]',
    'input[name*="session\\[email\\]" i]',
    'input[name*="emailAddress" i]',
    'input[name*="login_email" i]',
    'input[name*="customer_email" i]',
    'input[name*="signin" i]:not([type="password"])',
    'input[formcontrolname*="email" i]',
    'input[formcontrolname*="user" i]'
  ];

  // Check if element is truly visible and interactable
  function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    // offsetParent is null for fixed/absolute/sticky positioned ancestors (common on Amazon, Google, etc.)
    // So we only use rect + computed style checks
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !element.disabled &&
      !element.readOnly
    );
  }

  // Enhanced email field detection
  function isLikelyEmailField(input) {
    if (!input || input.type === 'password' || input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'checkbox' || input.type === 'radio') return false;

    const attributes = [
      input.name || '',
      input.id || '',
      input.placeholder || '',
      input.className || '',
      input.getAttribute('data-testid') || '',
      input.getAttribute('data-cy') || '',
      input.getAttribute('aria-label') || '',
      input.getAttribute('aria-labelledby') || '',
      input.autocomplete || '',
      input.getAttribute('formcontrolname') || ''
    ].join(' ').toLowerCase();

    // Also check associated <label> text and parent container
    let labelText = '';
    try {
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) labelText = label.textContent.toLowerCase();
      }
      // Check closest parent for context clues
      const parent = input.closest('.form-group, .field, .input-group, .form-field, .form-row, .a-form-group, fieldset, [class*="form"]');
      if (parent) {
        const parentLabel = parent.querySelector('label, .label, legend');
        if (parentLabel) labelText += ' ' + parentLabel.textContent.toLowerCase();
      }
    } catch (e) { }

    const combinedText = (attributes + ' ' + labelText).toLowerCase();

    // Strong email indicators
    const strongIndicators = [
      'email', 'e-mail', 'mail', '@', 'user', 'login', 'account', 'signin', 'signup',
      'username', 'userid', 'identifier', 'identity', 'ap_email', 'loginfmt',
      'emailaddress', 'customer_email', 'login_email'
    ];

    // Exclude password-related fields
    const excludeIndicators = [
      'password', 'pass', 'pwd', 'confirm', 'repeat', 'phone', 'mobile',
      'search', 'query', 'coupon', 'promo', 'zip', 'postal', 'address_line',
      'first_name', 'last_name', 'city', 'state', 'country', 'card'
    ];

    const hasStrongIndicator = strongIndicators.some(indicator =>
      combinedText.includes(indicator)
    );

    const hasExcludeIndicator = excludeIndicators.some(indicator =>
      combinedText.includes(indicator)
    );

    // Also return true if input type is email (always a strong signal)
    if (input.type === 'email') return true;

    return hasStrongIndicator && !hasExcludeIndicator;
  }

  // Score email fields by likelihood
  function scoreEmailField(input) {
    let score = 0;
    const attributes = [
      input.name || '',
      input.id || '',
      input.placeholder || '',
      input.className || ''
    ].join(' ').toLowerCase();

    // Type scoring
    if (input.type === 'email') score += 100;
    if (input.autocomplete === 'email') score += 50;
    if (input.autocomplete === 'username') score += 30;

    // Attribute scoring
    if (attributes.includes('email')) score += 40;
    if (attributes.includes('mail')) score += 30;
    if (attributes.includes('user')) score += 20;
    if (attributes.includes('login')) score += 15;
    if (attributes.includes('identifier')) score += 20;
    if (attributes.includes('ap_email')) score += 45;
    if (attributes.includes('loginfmt')) score += 45;

    // Visibility scoring
    if (isElementVisible(input)) score += 20;

    // Position scoring (first fields often more important)
    const allInputs = Array.from(document.querySelectorAll('input'));
    const position = allInputs.indexOf(input);
    if (position < 3) score += 10 - position * 2;

    return score;
  }

  // Find email fields in all documents (including iframes and shadow DOMs)
  function findEmailFields(doc = document) {
    const fields = [];

    function searchInNode(node, sourceContext) {
      if (!node || !node.querySelectorAll) return;

      // Try all selectors
      emailSelectors.forEach(selector => {
        try {
          const elements = node.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.tagName === 'INPUT' && isLikelyEmailField(el)) {
              // Avoid duplicates
              if (!fields.some(f => f.element === el)) {
                fields.push({
                  element: el,
                  score: scoreEmailField(el),
                  source: sourceContext
                });
              }
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      });

      // Search shadow DOMs
      try {
        const allElements = node.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.shadowRoot) {
            searchInNode(el.shadowRoot, 'shadow');
          }
        });
      } catch (e) {
        // Ignore errors walking DOM
      }
    }

    // Search main document
    searchInNode(doc, 'main');

    // Also check iframes if enabled
    if (includeFrames && doc === document) {
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            const iframeFields = findEmailFields(iframeDoc);
            fields.push(...iframeFields.map(f => ({ ...f, source: 'iframe' })));
          }
        } catch (e) {
          // Cross-origin iframe, skip
        }
      });
    }

    return fields;
  }

  // Wait for elements to appear
  function waitForEmailField(maxWait = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      function check() {
        const fields = findEmailFields();
        const visibleFields = fields.filter(f => isElementVisible(f.element));

        if (visibleFields.length > 0) {
          resolve(visibleFields);
          return;
        }

        if (Date.now() - startTime >= maxWait) {
          resolve(fields); // Return any fields found, even if not visible
          return;
        }

        setTimeout(check, 100);
      }

      check();
    });
  }

  // Fill the email field with proper event triggering
  async function fillField(input, email) {
    try {
      // Store original value for comparison
      const originalValue = input.value;

      // Focus the field first
      input.focus();
      try {
        input.select(); // Select existing text to overwrite it
      } catch (e) { }

      // Try using execCommand for trusted events (works on many sites that block synthetic events like NYTimes)
      let execSuccess = false;
      try {
        execSuccess = document.execCommand('insertText', false, email);
      } catch (e) { }

      // If execCommand failed or is not supported, fallback to native React value setter
      if (!execSuccess || input.value !== email) {
        const setNativeValue = (element, value) => {
          const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

          if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
          } else if (valueSetter) {
            valueSetter.call(element, value);
          } else {
            element.value = value;
          }
        };

        // Clear existing bypass tracking
        setNativeValue(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Set new value
        setNativeValue(input, email);
      }

      // Trigger comprehensive events
      const events = [
        new Event('focus', { bubbles: true }),
        new MouseEvent('click', { bubbles: true }),
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('blur', { bubbles: true }),
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
        new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter' })
      ];

      events.forEach(event => {
        try {
          input.dispatchEvent(event);
        } catch (e) {
          // Continue if event fails
        }
      });

      // For React/Vue apps, trigger input event again after a delay
      setTimeout(() => {
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {
          // Ignore
        }
      }, 50);

      // Wait a moment for the value to be processed by frameworks
      await new Promise(resolve => setTimeout(resolve, 250));

      // Simple check: if the field has any content and it changed from original
      const currentValue = input.value;
      const hasContent = currentValue && currentValue.trim().length > 0;
      const valueChanged = currentValue !== originalValue;

      // Success if field has content (regardless of exact match)
      return hasContent || valueChanged;

    } catch (error) {
      return false;
    }
  }

  // Main execution logic
  async function attemptFill() {
    try {
      // Wait for fields to appear
      const allFields = await waitForEmailField(waitForVisible ? 5000 : 1000);

      if (allFields.length === 0) {
        return { success: false, reason: 'No email fields found anywhere on the page.' };
      }

      // Sort by score (highest first)
      allFields.sort((a, b) => b.score - a.score);

      // Try visible fields first, then hidden ones
      const visibleFields = allFields.filter(f => isElementVisible(f.element));
      const hiddenFields = allFields.filter(f => !isElementVisible(f.element));

      const fieldsToTry = [...visibleFields, ...hiddenFields];

      for (const fieldInfo of fieldsToTry) {
        const { element, score, source } = fieldInfo;

        // Skip if element is no longer in DOM
        if (!document.contains(element) && source !== 'iframe') continue;

        const success = await fillField(element, email);

        if (success) {
          return {
            success: true,
            element: element,
            score: score,
            source: source,
            actualValue: element.value, // Show what was actually inserted
            selector: element.tagName.toLowerCase() +
              (element.id ? `#${element.id}` : '') +
              (element.className ? `.${element.className.split(' ').join('.')}` : '')
          };
        }
      }

      return {
        success: false,
        reason: `Found ${allFields.length} potential email fields but none could be filled successfully.`,
        fields: allFields.map(f => ({
          tag: f.element.tagName,
          type: f.element.type,
          name: f.element.name,
          id: f.element.id,
          visible: isElementVisible(f.element),
          score: f.score,
          currentValue: f.element.value
        }))
      };

    } catch (error) {
      return { success: false, reason: `Error: ${error.message}` };
    }
  }

  // Retry logic for dynamic content
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await attemptFill();

    if (result.success) {
      return result;
    }

    // Wait before retrying
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // Final attempt
  return await attemptFill();
}

// Utility function for easier usage
async function autoFillEmail(email, options = {}) {
  console.log('Attempting to fill email field...');
  const result = await fillEmailField(email, options);

  if (result.success) {
    console.log('✅ Email filled successfully!', result);
  } else {
    console.log('❌ Failed to fill email:', result.reason);
    if (result.fields) {
      console.log('Fields found:', result.fields);
    }
  }

  return result;
}


// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillEmailField') {
    // Handle async function properly
    fillEmailField(request.email)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          reason: `Error: ${error.message}`
        });
      });

    // Return true to indicate async response
    return true;
  }
});

// Automatically check if the site is flagged
async function autoCheckFlagged() {
  const currentUrl = window.location.href;
  chrome.runtime.sendMessage({ action: 'checkSiteFlagged', url: currentUrl }, (response) => {
    if (chrome.runtime.lastError) {
      // Ignore errors when extension context is invalidated or background not ready
      return;
    }
    if (response && response.flagged) {
      showFlaggedPopup(response.message || 'This website has been flagged as potential spam!');
    }
  });
}

// Function to show a nice popup UI
function showFlaggedPopup(message) {
  // Check if popup already exists
  if (document.getElementById('spamsnare-flagged-popup')) return;

  const popup = document.createElement('div');
  popup.id = 'spamsnare-flagged-popup';

  // Apply styles directly
  Object.assign(popup.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#ff4d4f', // Red background for warning
    color: '#ffffff',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(255, 77, 79, 0.3)',
    zIndex: '9999999',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    animation: 'slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  });

  // Include SVG icon
  const icon = document.createElement('div');
  icon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8C11 7.44772 11.4477 7 12 7ZM12 18C12.8284 18 13.5 17.3284 13.5 16.5C13.5 15.6716 12.8284 15 12 15C11.1716 15 10.5 15.6716 10.5 16.5C10.5 17.3284 11.1716 18 12 18Z" fill="currentColor"/>
  </svg>`;
  icon.style.display = 'flex';
  icon.style.alignItems = 'center';

  const textContainer = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = 'Warning: Website Is Flagged';
  title.style.display = 'block';
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';
  title.style.marginBottom = '4px';

  const desc = document.createElement('div');
  desc.textContent = message;
  desc.style.fontSize = '14px';
  desc.style.opacity = '0.9';
  desc.style.lineHeight = '1.4';

  textContainer.appendChild(title);
  textContainer.appendChild(desc);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '0 0 0 8px',
    marginLeft: 'auto',
    lineHeight: '1',
    transition: 'color 0.2s'
  });
  closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseleave = () => closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
  closeBtn.onclick = () => {
    popup.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => popup.remove(), 300);
  };

  popup.appendChild(icon);
  popup.appendChild(textContainer);
  popup.appendChild(closeBtn);

  // Add keyframes for animation if not present
  if (!document.getElementById('spamsnare-styles')) {
    const style = document.createElement('style');
    style.id = 'spamsnare-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(popup);
}

// Run the check when script loads
autoCheckFlagged();
