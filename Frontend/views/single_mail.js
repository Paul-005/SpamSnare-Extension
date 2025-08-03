// Configuration
const API_BASE_URL = "http://localhost:3000";

// Get email and ID from URL parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const EMAIL_ID = getQueryParam("email") || "";
const MESSAGE_ID = getQueryParam("id") || "";

console.log(EMAIL_ID, MESSAGE_ID);

// Global state
let currentEmail = null;

async function fetchEmail() {
    try {
        const response = await fetch(`${API_BASE_URL}/specific-email/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: EMAIL_ID,
                id: MESSAGE_ID,
            }),
        });

        if (!response.ok) {
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
            <h1 class="email-subject">${escapeHtml(
        headers.subject || "No Subject"
    )}</h1>
            
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
              <div class="meta-item">
                <div class="meta-label">Date</div>
                <div class="meta-value">${formatDate(headers.date || "")}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Message ID</div>
                <div class="meta-value email-id">${escapeHtml(message.id)}</div>
              </div>
            </div>

            <div class="action-buttons">
              <button class="action-btn secondary" onclick="copyEmailId()">
                <span>📋</span>
                Copy ID
              </button>
              <button class="action-btn secondary" onclick="downloadRaw()">
                <span>💾</span>
                Download Raw
              </button>
            </div>
          </div>

          <div class="email-content">
            <div class="content-tabs">
              <button class="tab-btn active" onclick="switchTab('html')">HTML Content</button>
              <button class="tab-btn" onclick="switchTab('raw')">Raw Data</button>
            </div>

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



function copyEmailId() {
    if (currentEmail) {
        navigator.clipboard
            .writeText(currentEmail.id)
            .then(() => {
                alert("Email ID copied to clipboard!");
            })
            .catch(() => {
                alert(`Email ID: ${currentEmail.id}`);
            });
    }
}

function downloadRaw() {
    if (currentEmail) {
        const blob = new Blob([currentEmail.data], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `email_${currentEmail.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}


function logout() {
    if (confirm("Are you sure you want to logout?")) {
        alert("Logged out successfully!");
        // window.location.href = '/login';
    }
}

// Initialize the email view when page loads
document.addEventListener("DOMContentLoaded", async function () {
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

// Sample data for testing when API is not available
const SAMPLE_DATA = {
    email: "7d9b17bc-f44d-4940-b934-db4766a9832a@maildrop.cc",
    data: {
        data: {
            message: {
                id: "hZwfodhI0j",
                html: '<html>\r\nCongratulations!<br><br>\r\nIf you are reading this your email address is working.<br><br>\r\nThis is not spam or a solicitation. This email was sent to your email address because you, or someone else, requested a test email to be sent to this address. We work hard to ensure a balance between testing, transparency, and privacy. If you did not request this email test, it\'s likely that someone accidentally mistyped their email address as yours. You can request your email address be blocked here: <a href="https://sendtestemail.com/block">https://sendtestemail.com/block</a><br><br>\r\nThe IP address of the requester of this test email is: 117.213.18.91\r\n</html>',
                data: "Received: from mail.sendtestemail.com (mail.sendtestemail.com [143.244.187.129])\r\n        by maildrop\r\n        with SMTP (Maildrop) id MDVHHRWE\r\n        for 7d9b17bc-f44d-4940-b934-db4766a9832a@maildrop.cc;\r\n        Sun, 03 Aug 2025 09:33:36 +0000 (UTC)\r\nReceived: by mail.sendtestemail.com (Postfix, from userid 48)\r\n\tid 7442A30003F1; Sun,  3 Aug 2025 04:33:34 -0500 (CDT)\r\nTo: 7d9b17bc-f44d-4940-b934-db4766a9832a@maildrop.cc\r\nSubject: SendTestEmail.com - Testing Email ID: 04f4d6fa07d6043cdc3df7e051634472\r\nFrom: SendTestEmail <noreply@sendtestemail.com>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative;boundary=ste688f2cee6bee9\r\nList-Unsubscribe: <https://sendtestemail.com/block>\r\nMessage-Id: <20250803093334.7442A30003F1@mail.sendtestemail.com>\r\nDate: Sun,  3 Aug 2025 04:33:34 -0500 (CDT)",
            },
        },
    },
};

// Uncomment the line below to test with sample data instead of API
// setTimeout(() => renderEmail(SAMPLE_DATA), 1000);
