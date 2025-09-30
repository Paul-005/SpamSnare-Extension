// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Authentication elements
  const authContainer = document.getElementById('auth-container');
  const mainContainer = document.getElementById('main-container');
  
  // Toggle buttons
  const showLoginBtn = document.getElementById('show-login-btn');
  const showRegisterBtn = document.getElementById('show-register-btn');
  
  // Login form elements
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const submitLoginBtn = document.getElementById('submit-login');
  const loginResult = document.getElementById('login-result');
  
  // Register form elements
  const registerForm = document.getElementById('register-form');
  const registerName = document.getElementById('register-name');
  const registerEmail = document.getElementById('register-email');
  const registerPassword = document.getElementById('register-password');
  const registerConfirmPassword = document.getElementById('register-confirm-password');
  const submitRegisterBtn = document.getElementById('submit-register');
  const registerResult = document.getElementById('register-result');
  
  // Main app elements
  const userDisplayName = document.getElementById('user-display-name');
  const logoutBtn = document.getElementById('logout-btn');
  const checkFlaggedBtn = document.getElementById('check-flagged');
  const flaggedResult = document.getElementById('flagged-result');
  const generateEmailBtn = document.getElementById('generate-email');
  const emailResult = document.getElementById('email-result');
  const openInboxBtn = document.getElementById('open-inbox');

  // Check authentication status on load
  checkAuthStatus();

  // Authentication Functions
  async function checkAuthStatus() {
    try {
      const result = await chrome.storage.local.get(['spamsnare_token', 'spamsnare_user']);
      
      if (result.spamsnare_token && result.spamsnare_user) {
        // Verify token is still valid
        const response = await fetch('http://localhost:3000/me', {
          headers: {
            'Authorization': `Bearer ${result.spamsnare_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          showMainApp(data.user);
        } else {
          // Token is invalid, clear storage and show auth
          await chrome.storage.local.remove(['spamsnare_token', 'spamsnare_user']);
          showAuthScreen();
        }
      } else {
        showAuthScreen();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  }

  function showMainApp(user) {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    userDisplayName.textContent = user.name;
  }

  // Toggle between login and register forms
  showLoginBtn.addEventListener('click', () => {
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    clearResults();
  });

  showRegisterBtn.addEventListener('click', () => {
    showRegisterBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    clearResults();
  });

  function clearResults() {
    loginResult.textContent = '';
    loginResult.className = 'result';
    registerResult.textContent = '';
    registerResult.className = 'result';
  }

  function showResult(element, message, type = 'info') {
    element.textContent = message;
    element.className = `result ${type}`;
  }

  // Login functionality
  submitLoginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showResult(loginResult, 'Please fill in all fields.', 'error');
      return;
    }

    showResult(loginResult, 'Logging in...', 'loading');
    submitLoginBtn.disabled = true;

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        await chrome.storage.local.set({
          spamsnare_token: data.token,
          spamsnare_user: data.user
        });

        showResult(loginResult, 'Login successful!', 'success');
        setTimeout(() => {
          showMainApp(data.user);
        }, 1000);
      } else {
        showResult(loginResult, data.message || 'Login failed.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showResult(loginResult, 'Network error. Please try again.', 'error');
    } finally {
      submitLoginBtn.disabled = false;
    }
  });

  // Register functionality
  submitRegisterBtn.addEventListener('click', async () => {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    if (!name || !email || !password || !confirmPassword) {
      showResult(registerResult, 'Please fill in all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showResult(registerResult, 'Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      showResult(registerResult, 'Password must be at least 6 characters.', 'error');
      return;
    }

    showResult(registerResult, 'Creating account...', 'loading');
    submitRegisterBtn.disabled = true;

    try {
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        await chrome.storage.local.set({
          spamsnare_token: data.token,
          spamsnare_user: data.user
        });

        showResult(registerResult, 'Account created successfully!', 'success');
        setTimeout(() => {
          showMainApp(data.user);
        }, 1000);
      } else {
        showResult(registerResult, data.message || 'Registration failed.', 'error');
      }
    } catch (error) {
      console.error('Register error:', error);
      showResult(registerResult, 'Network error. Please try again.', 'error');
    } finally {
      submitRegisterBtn.disabled = false;
    }
  });

  // Enter key handlers
  [loginEmail, loginPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitLoginBtn.click();
      }
    });
  });

  [registerName, registerEmail, registerPassword, registerConfirmPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitRegisterBtn.click();
      }
    });
  });

  // Logout functionality
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['spamsnare_token', 'spamsnare_user']);
    showAuthScreen();
    // Reset forms
    loginEmail.value = '';
    loginPassword.value = '';
    registerName.value = '';
    registerEmail.value = '';
    registerPassword.value = '';
    registerConfirmPassword.value = '';
    clearResults();
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
            emailResult.textContent = 'Email inserted and auto-hidden!';
            // Email hiding is automatically triggered in content.js
          } else if (fillResp && fillResp.reason) {
            emailResult.textContent = 'Failed: ' + fillResp.reason;
          } else {
            emailResult.textContent = 'Failed to insert email.';
          }
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