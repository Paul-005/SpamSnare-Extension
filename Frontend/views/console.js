// Function to fetch data and populate the table
async function populateTable() {
  const tbody = document.getElementById("tableBody");
  const loadingState = document.getElementById("loadingState");
  const emptyState = document.getElementById("emptyState");

  // Show loading state and hide others
  tbody.innerHTML = ""; // Clear existing data
  loadingState.classList.remove("hidden");
  emptyState.classList.add("hidden");

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    alert("No ID provided");
    return;
  }

  console.log(id);

  try {
    const response = await fetch("http://localhost:3000/get-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    // Assuming the data array is directly under the 'data' key in the response
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
                    <p class="text-sm mt-2">Please ensure the server is running at http://localhost:3000/get-email</p>
                    <p class="text-sm mt-1">Error: ${error.message}</p>
                </td>
            </tr>
          `;
  }
}

// Function for logout action
function logout() {
  // As per instructions, avoid alert() and confirm() for user interaction.
  // In a real application, you'd implement a custom modal for confirmation
  // or directly send a logout request to the server.
  console.log(
    "Logout initiated. (No confirmation dialog displayed as per instructions)"
  );
  // Example: Redirect to login page after successful logout
  // window.location.href = '/login';
}

// Initialize the table when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", populateTable);
