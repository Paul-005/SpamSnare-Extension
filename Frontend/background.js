chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkFlagged') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.url) {
        sendResponse({ error: 'Unable to determine active tab URL.' });
        return;
      }

      // Extract origin from URL (e.g., https://example.com)
      let website;
      try {
        const parsedURL = new URL(currentTab.url);
        website = parsedURL.origin;
        console.log('Website:', website);
      } catch (e) {
        sendResponse({ error: 'Invalid URL from current tab.' });
        return;
      }

      fetch('http://localhost:3000/check-flagged', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ website })
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            sendResponse({ error: data.error });
          } else {
            sendResponse({ flagged: data.flagged, message: data.message });
          }
        })
        .catch(error => {
          console.error('Error checking flagged status:', error);
          sendResponse({ error: 'Failed to check if site is flagged.' });
        });
    });

    return true;
  }


  if (request.action === 'generateEmail') {

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        const url = currentTab.url;
        
        chrome.storage.local.get(['spamsnare_user'], (result) => {
          if (!result.spamsnare_user || !result.spamsnare_user.id) {
            sendResponse({ error: 'User not logged in' });
            return;
          }
          
          const id = result.spamsnare_user.id;
          console.log('User ID:', id);
          
          fetch('http://localhost:3000/generate-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ website: url, id })
          })
            .then(response => response.json())
            .then(data => {
              sendResponse({ email: data.payload.email, message: data.message });
            })
            .catch(error => {
              console.log('Error fetching email:', error);
              sendResponse({ error: 'Failed to generate email' });
            });
        });
      } else {
        sendResponse({ error: 'No active tab or URL not found.' });
      }
    });

    return true;
  }

});
