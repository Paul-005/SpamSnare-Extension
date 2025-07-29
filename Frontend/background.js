chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkFlagged') {
    sendResponse({ flagged: false, message: 'Site is not flagged.' });
    return true;
  }

  if (request.action === 'generateEmail') {
    if (request.action === 'generateEmail') {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
          const url = currentTab.url;

          fetch('http://localhost:3000/generate-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ website: url })
          })
            .then(response => response.json())
            .then(data => {
              sendResponse({ email: data.payload.email, message: data.message });
            })
            .catch(error => {
              console.log('Error fetching email:', error);
              sendResponse({ error: 'Failed to generate email' });
            });
        } else {
          sendResponse({ error: 'No active tab or URL not found.' });
        }
      });

      return true; // Required for async use of sendResponse
    }// ✅ keep the message channel open for async fetch
  }

  if (request.action === 'scan-tnc') {
    const url = sender.tab.url;
    fetch('http://localhost:3000/scan-tnc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ website: url })
    })
      .then(response => response.json())
      .then(data => {
        sendResponse({ result: data.result });
      })
      .catch(error => {
        console.error('Error scanning T&C:', error);
        sendResponse({ error: 'Failed to scan T&C' });
      });
    return true;
  }
});
