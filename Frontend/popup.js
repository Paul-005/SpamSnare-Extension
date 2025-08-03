// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Authentication elements
  const authContainer = document.getElementById('auth-container');
  const mainContainer = document.getElementById('main-container');
  const createAccountBtn = document.getElementById('create-account-btn');
  const accountForm = document.getElementById('account-form');
  const userNameInput = document.getElementById('user-name');
  const submitAccountBtn = document.getElementById('submit-account');
  const accountResult = document.getElementById('account-result');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayId = document.getElementById('user-display-id');
  const logoutBtn = document.getElementById('logout-btn');

  // Main app elements
  const checkFlaggedBtn = document.getElementById('check-flagged');
  const flaggedResult = document.getElementById('flagged-result');
  const generateEmailBtn = document.getElementById('generate-email');
  const emailResult = document.getElementById('email-result');
  const scanTncBtn = document.getElementById('scan-tnc');
  const tncResult = document.getElementById('tnc-result');
  const openInboxBtn = document.getElementById('open-inbox');

  // Check authentication status on load
  checkAuthStatus();

  // Authentication Functions
  function checkAuthStatus() {
    chrome.storage.local.get(['spamsnare_user'], (result) => {
      if (result.spamsnare_user && result.spamsnare_user.id) {
        // User is logged in
        showMainApp(result.spamsnare_user);
      } else {
        // User needs to create account
        showAuthScreen();
      }
    });
  }

  function showAuthScreen() {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  }

  function showMainApp(user) {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    userDisplayName.textContent = user.name;
    userDisplayId.textContent = user.id;
  }

  function generateRandomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async function createUserAccount(name) {
    const userId = generateRandomId();
    const user = {
      name: name.trim(),
      id: userId,
      createdAt: new Date().toISOString()
    };

    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: userId, name })
    });

    if (!response.ok) {
      accountResult.textContent = 'Error creating account. Please try again.';
      accountResult.style.color = 'red';
      return;
    }

    console.log(response.data);

    chrome.storage.local.set({ spamsnare_user: user }, () => {
      if (chrome.runtime.lastError) {
        accountResult.textContent = 'Error creating account. Please try again.';
        accountResult.style.color = 'red';
      } else {
        accountResult.textContent = 'Account created successfully!';
        accountResult.style.color = 'green';
        setTimeout(() => {
          showMainApp(user);
        }, 1500);
      }
    });
  }

  // Authentication Event Listeners
  createAccountBtn.addEventListener('click', () => {
    accountForm.style.display = 'block';
    userNameInput.focus();
  });

  submitAccountBtn.addEventListener('click', () => {
    const name = userNameInput.value.trim();
    if (!name) {
      accountResult.textContent = 'Please enter your name.';
      accountResult.style.color = 'red';
      return;
    }
    if (name.length < 2) {
      accountResult.textContent = 'Name must be at least 2 characters long.';
      accountResult.style.color = 'red';
      return;
    }
    accountResult.textContent = 'Creating account...';
    accountResult.style.color = 'blue';
    createUserAccount(name);
  });

  userNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitAccountBtn.click();
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['spamsnare_user'], () => {
      showAuthScreen();
      // Reset form
      accountForm.style.display = 'none';
      userNameInput.value = '';
      accountResult.textContent = '';
    });
  });

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
          // Style as alert if flagged
          if (flaggedResult.textContent.trim() === 'Site is flagged.') {
            flaggedResult.classList.add('alert-flagged');
          } else {
            flaggedResult.classList.remove('alert-flagged');
          }
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


  // Open Inbox
  openInboxBtn.addEventListener('click', () => {
    chrome.storage.local.get('spamsnare_user', (result) => {
      if (result.spamsnare_user && result.spamsnare_user.id) {
        chrome.tabs.create({ url: '/views/console.html?id=' + result.spamsnare_user.id });
      }
    });
  });
}); 