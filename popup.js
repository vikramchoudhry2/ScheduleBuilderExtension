document.getElementById('startScraping').addEventListener('click', () => {
  // Send a message to trigger the scraping process
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start_scraping' });
  });
});
