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
    '[data-testid*="email"] input, [data-cy*="email"] input'
  ];

  // Check if element is truly visible and interactable
  function isElementVisible(element) {
    if (!element || !element.offsetParent) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

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
    if (!input || input.type === 'password') return false;

    const attributes = [
      input.name || '',
      input.id || '',
      input.placeholder || '',
      input.className || '',
      input.getAttribute('data-testid') || '',
      input.getAttribute('data-cy') || '',
      input.getAttribute('aria-label') || '',
      input.autocomplete || ''
    ].join(' ').toLowerCase();

    // Strong email indicators
    const strongIndicators = [
      'email', 'mail', '@', 'user', 'login', 'account', 'signin', 'signup'
    ];

    // Exclude password-related fields
    const excludeIndicators = [
      'password', 'pass', 'pwd', 'confirm', 'repeat', 'phone', 'mobile'
    ];

    const hasStrongIndicator = strongIndicators.some(indicator =>
      attributes.includes(indicator)
    );

    const hasExcludeIndicator = excludeIndicators.some(indicator =>
      attributes.includes(indicator)
    );

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

    // Visibility scoring
    if (isElementVisible(input)) score += 20;

    // Position scoring (first fields often more important)
    const allInputs = Array.from(document.querySelectorAll('input'));
    const position = allInputs.indexOf(input);
    if (position < 3) score += 10 - position * 2;

    return score;
  }

  // Find email fields in all documents (including iframes)
  function findEmailFields(doc = document) {
    const fields = [];

    // Try all selectors
    emailSelectors.forEach(selector => {
      try {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.tagName === 'INPUT' && isLikelyEmailField(el)) {
            fields.push({
              element: el,
              score: scoreEmailField(el),
              source: 'main'
            });
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });

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

      // Clear existing value
      input.value = '';

      // Set the value
      input.value = email;

      // Trigger comprehensive events
      const events = [
        new Event('focus', { bubbles: true }),
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('blur', { bubbles: true }),
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
        new KeyboardEvent('keyup', { bubbles: true, cancelable: true })
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
      await new Promise(resolve => setTimeout(resolve, 150));

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