// Function to get stored token
async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['spamsnare_token'], (result) => {
      resolve(result.spamsnare_token);
    });
  });
}

// Function to get stored user
async function getStoredUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['spamsnare_user'], (result) => {
      resolve(result.spamsnare_user);
    });
  });
}

// Function to check authentication and redirect if needed
async function checkAuth() {
  const token = await getStoredToken();
  const user = await getStoredUser();
  
  if (!token || !user) {
    // Redirect to popup or show login message
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
        <h2>Authentication Required</h2>
        <p>Please login through the SpamSnare extension popup first.</p>
        <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
      </div>
    `;
    return null;
  }
  
  // Update user name in navbar
  const userNameElement = document.querySelector('.user-name');
  if (userNameElement) {
    userNameElement.textContent = `Welcome, ${user.name}`;
  }
  
  return token;
}

// Function to fetch data and populate the table
async function populateTable() {
  const tbody = document.getElementById("tableBody");
  const loadingState = document.getElementById("loadingState");
  const emptyState = document.getElementById("emptyState");

  // Check authentication first
  const token = await checkAuth();
  if (!token) return;

  // Show loading state and hide others
  tbody.innerHTML = ""; // Clear existing data
  loadingState.classList.remove("hidden");
  emptyState.classList.add("hidden");

  try {
    const response = await fetch("http://localhost:3000/get-emails", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token is invalid, clear storage and show auth error
        await chrome.storage.local.remove(['spamsnare_token', 'spamsnare_user']);
        document.body.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
            <h2>Session Expired</h2>
            <p>Please login again through the SpamSnare extension popup.</p>
            <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
          </div>
        `;
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const items = result.data;
    console.log(items);

    // Hide loading state
    loadingState.classList.add("hidden");

    if (items && items.length > 0) {
      tbody.innerHTML = items
        .map(
          (item, index) => `
                <tr>
                    <td><a href="inbox.html?email=${encodeURIComponent(
                      (item.email || "").replace(/@maildrop\.cc.*/, "")
                    )}&website=${encodeURIComponent(
                  item.website
                )}" class="website-cell">${item.website}</a></td>
                    <td><a href="inbox.html?email=${encodeURIComponent(
                      (item.email || "").replace(/@maildrop\.cc.*/, "")
                    )}&website=${encodeURIComponent(
                  item.website
                )}" class="email-cell">${item.email}</a></td>
                </tr>
              `
        )
        .join("");
    } else {
      // Show empty state if no items are found
      emptyState.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    // Hide loading state and show an error message
    loadingState.classList.add("hidden");
    tbody.innerHTML = `
            <tr>
                <td colspan="2" class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <p>Failed to load data.</p>
                    <p class="text-sm mt-2">Please ensure the server is running and you're logged in.</p>
                    <p class="text-sm mt-1">Error: ${error.message}</p>
                </td>
            </tr>
          `;
  }
}

// Function for logout action
async function logout() {
  // Clear stored authentication data
  await chrome.storage.local.remove(['spamsnare_token', 'spamsnare_user']);
  
  // Show logout message and close window
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
      <h2>Logged Out</h2>
      <p>You have been successfully logged out.</p>
      <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
    </div>
  `;
}

// Initialize the table when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", populateTable);
