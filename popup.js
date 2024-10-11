document.getElementById('sync-btn').addEventListener('click', () => {
    const selectedCalendar = document.getElementById('calendar-select').value;
    
    // Send a message to the content script to start scraping
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start_scraping', calendar: selectedCalendar });
    });
  });
  