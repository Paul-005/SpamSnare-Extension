// Configuration
const API_BASE_URL = "http://localhost:3000";

// Get email and ID from URL parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const EMAIL_ID = getQueryParam("email") || "";
const MESSAGE_ID = getQueryParam("id") || "";
let isFlagged = ['true', '1'].includes(getQueryParam('flag'));

console.log(EMAIL_ID, MESSAGE_ID, isFlagged);

// Global state
let currentEmail = null;

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

async function fetchEmail() {
    const token = await checkAuth();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/specific-email/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                email: EMAIL_ID,
                id: MESSAGE_ID,

            }),
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
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching email:", error);
        throw error;
    }
}

function extractEmailHeaders(rawData) {
    const headers = {};
    const lines = rawData.split("\r\n");

    for (const line of lines) {
        if (line.trim() === "") break; // End of headers

        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            headers[key.toLowerCase()] = value;
        }
    }

    return headers;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch {
        return dateString;
    }
}

function renderEmail(emailData) {
    const container = document.getElementById("emailContainer");

    if (
        !emailData ||
        !emailData.data ||
        !emailData.data.data ||
        !emailData.data.data.message
    ) {
        container.innerHTML = `
            <div class="error-state">
              <h3>Email not found</h3>
              <p>The requested email could not be loaded.</p>
            </div>
          `;
        return;
    }

    const message = emailData.data.data.message;
    const headers = extractEmailHeaders(message.data);
    currentEmail = message;

    container.innerHTML = `
          <div class="email-header">
            <div class="subject-line">
                <h1 class="email-subject">${escapeHtml(
        headers.subject || "No Subject"
    )}</h1>
                <span 
                    class="flag-icon ${isFlagged ? "flagged" : "unflagged"}"
                    title="${isFlagged ? "This sender is flagged as suspicious" : "This sender seems legitimate"}"
                ></span>
            </div>
            
            <div class="email-meta">
              <div class="meta-item">
                <div class="meta-label">From</div>
                <div class="meta-value">${escapeHtml(
        headers.from || "Unknown"
    )}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">To</div>
                <div class="meta-value">${escapeHtml(
        headers.to || EMAIL_ID
    )}</div>
              </div>
              ${headers.cc ? `
              <div class="meta-item">
                <div class="meta-label">CC</div>
                <div class="meta-value">${escapeHtml(headers.cc)}</div>
              </div>` : ''}
              </div>
              <div class="meta-item">
                <div class="meta-label">Date</div>
                <div class="meta-value">${formatDate(headers.date || "")}</div>
              </div>
            </div>

            
          </div>

          <div class="email-content">

            <div id="html-tab" class="tab-content active">
              <div class="html-content">
                ${message.html || "<p>No HTML content available</p>"}
              </div>
            </div>

            <div id="raw-tab" class="tab-content">
              <div class="raw-content">${escapeHtml(message.data)}</div>
            </div>
          </div>
        `;
}

function switchTab(tab) {
    // Remove active class from all tabs and content
    document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
    document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

    // Add active class to selected tab
    event.target.classList.add("active");
    document.getElementById(tab + "-tab").classList.add("active");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


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

function addFlagStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .subject-line {
            display: flex;
            align-items: center;
            gap: 1rem;
            justify-content: space-between;
        }
        .flag-icon {
            font-size: 1rem;
            cursor: default;
            color: #ff4757;
            font-weight: bold;
            display: flex;
            align-items: center;
        }
        .flag-icon::before {
            content: '🛡️';
            font-size: 1.5rem;
            margin-right: 0.5rem;
        }
        .flag-icon.unflagged {
            display: none;
        }
        .flag-icon.flagged::before {
            color: #ff4757;
            filter: drop-shadow(0 0 5px #ff4757);
        }
    `;
    // Add a visible text label after the icon when flagged
    const extra = document.createElement('style');
    extra.textContent = `
        .flag-icon.flagged::after {
            content: 'Flagged';
            margin-left: 0.35rem;
            font-size: 0.95rem;
            color: #ffb3b3;
            font-weight: 700;
        }
    `;
    document.head.appendChild(extra);
    document.head.appendChild(style);
}

// Initialize the email view when page loads
document.addEventListener("DOMContentLoaded", async function () {
    addFlagStyles(); // Add styles to the page

    if (!EMAIL_ID || !MESSAGE_ID) {
        document.getElementById("emailContainer").innerHTML = `
            <div class="error-state">
              <h3>Missing Parameters</h3>
              <p>Email ID and Message ID are required to view this email.</p>
            </div>
          `;
        return;
    }

    try {
        const emailData = await fetchEmail();

        // If the API returns a flag, prefer that over the URL param.
        // Support both top-level `flag` and nested `data.flag` from different endpoints.
        if (emailData) {
            const respFlag = (typeof emailData.flag !== 'undefined')
                ? emailData.flag
                : (emailData.data && typeof emailData.data.flag !== 'undefined')
                    ? emailData.data.flag
                    : null;

            if (respFlag !== null) {
                // treat 1 or '1' or true or 'true' as flagged
                isFlagged = (Number(respFlag) === 1) || respFlag === true || respFlag === 'true';
            }
        }

        renderEmail(emailData);
    } catch (error) {
        document.getElementById("emailContainer").innerHTML = `
            <div class="error-state">
              <h3>Error loading email</h3>
              <p>Failed to fetch email from the server.</p>
              <p style="font-size: 0.9rem; margin-top: 1rem;">Error: ${error.message}</p>
              <button onclick="location.reload()" style="margin-top: 1rem; background: #ff4757; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                Try Again
              </button>
            </div>
          `;
    }
});

