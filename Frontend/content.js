// content.js

// Try to find the email input field and fill it with the provided email
function fillEmailField(email) {
  // Try common selectors for email fields
  const selectors = [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]'
  ];
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field) {
      // Check if the field is visible (not hidden)
      const style = window.getComputedStyle(field);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && field.offsetParent !== null;
      if (!isVisible) {
        return { success: false, reason: 'Email field is hidden.' };
      }
      field.value = email;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true };
    }
  }
  return { success: false, reason: 'No email field found.' };
}


// Try to extract terms and conditions text from the page
function extractTermsAndConditions() {
  // Look for links or sections with common T&C keywords
  const keywords = ['terms', 'conditions', 'terms of service', 'terms & conditions'];
  let tncText = '';
  // Find links
  const links = Array.from(document.querySelectorAll('a'));
  for (const link of links) {
    const text = link.textContent.toLowerCase();
    if (keywords.some(k => text.includes(k))) {
      // Try to fetch the linked page (if same origin)
      if (link.href && link.origin === location.origin) {
        // Could fetch and return text here (future work)
        tncText += `Link: ${link.href}\n`;
      }
    }
  }
  // Find visible sections
  const elements = Array.from(document.querySelectorAll('body *'));
  for (const el of elements) {
    const text = el.textContent.toLowerCase();
    if (keywords.some(k => text.includes(k)) && el.offsetParent !== null) {
      tncText += el.textContent + '\n';
    }
  }
  return tncText.trim();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillEmailField') {
    const result = fillEmailField(request.email);
    sendResponse(result);
    return true;
  }
  if (request.action === 'extractTnC') {
    const tnc = extractTermsAndConditions();
    sendResponse({ tnc });
    return true;
  }
}); 