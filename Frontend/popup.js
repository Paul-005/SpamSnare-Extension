// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const checkFlaggedBtn = document.getElementById('check-flagged');
  const flaggedResult = document.getElementById('flagged-result');
  const generateEmailBtn = document.getElementById('generate-email');
  const emailResult = document.getElementById('email-result');
  const scanTncBtn = document.getElementById('scan-tnc');
  const tncResult = document.getElementById('tnc-result');
  const openInboxBtn = document.getElementById('open-inbox');

  // Gets current active tab
  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        callback(tabs[0]);
      } else {
        callback(null);
      }
    });
  }

  // Checks if Site is Flagged
  checkFlaggedBtn.addEventListener('click', () => {
    flaggedResult.textContent = 'Checking...';
    getCurrentTab((tab) => {
      if (!tab || !tab.url) {
        flaggedResult.textContent = 'Could not get site URL.';
        return;
      }
      chrome.runtime.sendMessage({ action: 'checkFlagged', url: tab.url }, (response) => {
        if (chrome.runtime.lastError) {
          flaggedResult.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else {
          flaggedResult.textContent = response && response.message ? response.message : 'No response.';
        }
      });
    });
  });

  // Generating and inserting email
  generateEmailBtn.addEventListener('click', () => {
    emailResult.textContent = 'Generating...';
    getCurrentTab((tab) => {
      if (!tab || !tab.id || !tab.url) {
        emailResult.textContent = 'Could not get site info.';
        return;
      }
      // Step 1: Get email from backend
      chrome.runtime.sendMessage({ action: 'generateEmail', url: tab.url }, (response) => {
        if (chrome.runtime.lastError || !response || !response.email) {
          emailResult.textContent = 'Error generating email.';
          return;
        }
        const email = response.email;
        // Step 2: Try to fill email field in the page
        chrome.tabs.sendMessage(tab.id, { action: 'fillEmailField', email }, (fillResp) => {
          if (chrome.runtime.lastError) {
            emailResult.textContent = 'Could not access page.';
            return;
          }
          if (fillResp && fillResp.success) {
            emailResult.textContent = 'Email inserted!';
          } else if (fillResp && fillResp.reason) {
            emailResult.textContent = 'Failed: ' + fillResp.reason;
          } else {
            emailResult.textContent = 'Failed to insert email.';
          }
          // Step 3: Save email usage (for backend tracking)
          chrome.runtime.sendMessage({ action: 'saveEmailUsage', email, url: tab.url }, (saveResp) => {
            // Optionally handle saveResp
          });
        });
      });
    });
  });

  // 3. Scan Terms & Conditions
  scanTncBtn.addEventListener('click', () => {
    tncResult.textContent = 'Scanning...';
    getCurrentTab((tab) => {
      if (!tab || !tab.id) {
        tncResult.textContent = 'Could not get tab.';
        return;
      }
      // Step 1: Extract T&C text from page
      chrome.tabs.sendMessage(tab.id, { action: 'extractTnC' }, (extractResp) => {
        if (chrome.runtime.lastError || !extractResp) {
          tncResult.textContent = 'Could not extract T&C.';
          return;
        }
        const tncText = extractResp.tnc;
        if (!tncText) {
          tncResult.textContent = 'No T&C found on page.';
          return;
        }
        // Step 2: Send T&C text to backend for scanning
        chrome.runtime.sendMessage({ action: 'scanTnC', tnc: tncText }, (scanResp) => {
          if (chrome.runtime.lastError || !scanResp) {
            tncResult.textContent = 'Scan failed.';
          } else {
            tncResult.textContent = scanResp.result || 'Scan complete.';
          }
        });
      });
    });
  });

  // Open Inbox
  openInboxBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.inbox.com' });
  });
}); 