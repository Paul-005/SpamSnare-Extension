const API_BASE_URL = "http://localhost:3000";

// Get email and website from URL parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
const EMAIL_ID = getQueryParam("email") || "";
const SENDER = getQueryParam("website") || "";

// Global state
let currentEmails = [];

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

async function fetchInbox() {
    const token = await checkAuth();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/check-inbox`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ email: EMAIL_ID, website: SENDER }),
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
        console.error("Error fetching inbox:", error);
        throw error;
    }
}

function renderEmails(emailData) {
    const container = document.getElementById("emailsContainer");
    const inboxEmail = document.getElementById("inboxEmail");
    if (inboxEmail) {
        const urlParams = new URLSearchParams(window.location.search);
        const email =
            urlParams.get("email") || (emailData && emailData.email) || "";
        const website = urlParams.get("website") || "";
        inboxEmail.textContent =
            email && website
                ? `Inbox for: ${email} on ${website}`
                : email
                    ? `Inbox for: ${email}`
                    : website
                        ? `Inbox for website: ${website}`
                        : "";
    }

    if (
        !emailData ||
        !emailData.data ||
        !emailData.data.data ||
        !emailData.data.data.inbox
    ) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>No emails found</h3>
                        <p>Your inbox is empty or there was an issue loading emails.</p>
                    </div>
                `;
        updateStats(0, 0);
        return;
    }

    const emails = emailData.data.data.inbox;
    const flagCount = emailData.flag || 0;

    if (emails.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>No emails found</h3>
                        <p>Your inbox is currently empty.</p>
                    </div>
                `;
        updateStats(0, flagCount);
        return;
    }

    currentEmails = emails;

    // Determine the mailbox/email for the detail link
    let mailbox = "";
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("email")) {
        mailbox = urlParams.get("email");
    } else if (emailData && emailData.email) {
        mailbox = emailData.email;
    }
    // Remove domain if present (use only mailbox part)
    mailbox = (mailbox || "").replace(/@maildrop\.cc$/, "");

    container.innerHTML = emails
        .map(
            (email) => `
                <div class="email-card">
                    <div class="email-header">
                        <div class="email-from">${escapeHtml(
                email.headerfrom
            )}</div>
                        <div class="flag-container">
                            <span class="flag-icon ${flagCount > 0 ? "flagged" : "unflagged"
                }"
                                  onclick="toggleFlag('${email.id}')"
                                  title="${flagCount > 0 ? "Flagged" : "Not flagged"
                }">
                                
                            </span>
                            ${flagCount > 0
                    ? `<span class="flag-count">${flagCount}</span>`
                    : ""
                }
                        </div>
                    </div>
                    <div class="email-subject"><a href="single_mail.html?email=${encodeURIComponent(
                    mailbox
                )}&id=${encodeURIComponent(
                    email.id
                )}&flag=${flagCount > 0}" style="color:inherit;text-decoration:underline;">${escapeHtml(
                    email.subject
                )}</a></div>
                    <div class="email-meta">
                        <span class="email-time">Just now</span>
                    </div>
                </div>
            `
        )
        .join("");

}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function toggleFlag(emailId) {
    // This would typically make an API call to toggle the flag
    console.log("Toggling flag for email:", emailId);

    // For demo purposes, we'll just show an alert
    // In a real application, you'd make an API call here
    alert(`Flag toggled for email: ${emailId}`);

    // You could refresh the inbox after toggling
    // refreshInbox();
}

async function refreshInbox() {
    const container = document.getElementById("emailsContainer");
    const refreshBtn = document.querySelector(".refresh-btn");

    // Show loading state
    container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading emails...</p>
                </div>
            `;

    // Disable refresh button
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";

    try {
        const emailData = await fetchInbox();
        renderEmails(emailData);
    } catch (error) {
        container.innerHTML = `
                    <div class="error-state">
                        <h3>Error loading emails</h3>
                        <p>Failed to fetch emails from the server.</p>
                        <p style="font-size: 0.9rem; margin-top: 1rem;">Error: ${error.message}</p>
                        <button onclick="refreshInbox()" style="margin-top: 1rem; background: #ff4757; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
    } finally {
        // Re-enable refresh button
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = "1";
    }
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

// Initialize the inbox when page loads
document.addEventListener("DOMContentLoaded", function () {
    refreshInbox();

    // Auto-refresh every 30 seconds
    setInterval(refreshInbox, 30000);
});

// Sample data for testing when API is not available
const SAMPLE_DATA = {
    email: "ad31c2d8-3685-4acd-a68b-15da011dbaeb@maildrop.cc",
    data: {
        data: {
            inbox: [
                {
                    id: "hKdQreSg7Q",
                    headerfrom: "SendTestEmail <noreply@sendtestemail.com>",
                    subject:
                        "SendTestEmail.com - Testing Email ID: f61073392e2a7d58e59c56d6c63bc19f",
                },
                {
                    id: "mNpQreSg8R",
                    headerfrom: "Newsletter <info@newsletter.com>",
                    subject: "Weekly Update - Don't miss out on these offers!",
                },
                {
                    id: "xYzQreSg9S",
                    headerfrom: "Support Team <support@service.com>",
                    subject: "Your account verification is pending",
                },
            ],
        },
    },
    flag: 2,
};

// Uncomment the line below to test with sample data instead of API
// setTimeout(() => renderEmails(SAMPLE_DATA), 1000);
