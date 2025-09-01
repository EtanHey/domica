// State
let extractedPosts = [];
let isScanning = false;

// DOM Elements
const scanBtn = document.getElementById('scanBtn');
const expandBtn = document.getElementById('expandBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const status = document.getElementById('status');
const statusText = status.querySelector('.status-text');
const resultsSection = document.getElementById('results');
const resultsList = document.getElementById('resultsList');
const totalPostsEl = document.getElementById('totalPosts');
const rentalPostsEl = document.getElementById('rentalPosts');
const autoExpandCheckbox = document.getElementById('autoExpand');
const includeImagesCheckbox = document.getElementById('includeImages');
const helpLink = document.getElementById('helpLink');

// Event Listeners
scanBtn.addEventListener('click', scanPage);
expandBtn.addEventListener('click', expandPosts);
saveBtn.addEventListener('click', saveToDomica);
exportBtn.addEventListener('click', exportJSON);
helpLink.addEventListener('click', openHelp);

// Check if on Facebook and test content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  if (!url.includes('facebook.com/groups/')) {
    setStatus('error', 'פתח דף קבוצה בפייסבוק');
    scanBtn.disabled = true;
    expandBtn.disabled = true;
  } else {
    // Test if content script is loaded
    chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Content script not loaded:', chrome.runtime.lastError);
        setStatus('error', 'רענן את הדף ונסה שוב');
        scanBtn.disabled = true;
        expandBtn.disabled = true;
      }
    });
  }
});

// Scan page function
async function scanPage() {
  if (isScanning) return;

  isScanning = true;
  setStatus('scanning', 'סורק דף...');
  scanBtn.disabled = true;

  try {
    // Auto expand if enabled
    if (autoExpandCheckbox.checked) {
      setStatus('scanning', 'מרחיב פוסטים...');
      await expandPosts();
    }

    setStatus('scanning', 'מחלץ נתונים...');

    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Set longer timeout for scanning
    let timeoutId = setTimeout(() => {
      setStatus('error', 'הסריקה לוקחת יותר מדי זמן - נסה שוב');
      isScanning = false;
      scanBtn.disabled = false;
    }, 60000); // 60 second timeout

    chrome.tabs.sendMessage(tab.id, { action: 'extractPosts' }, (response) => {
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        setStatus('error', 'שגיאה בתקשורת עם הדף - רענן את הדף ונסה שוב');
        isScanning = false;
        scanBtn.disabled = false;
        return;
      }

      if (response && response.posts) {
        extractedPosts = response.posts;
        displayResults();
        setStatus('success', `נמצאו ${response.posts.length} דירות`);

        // Update stats
        totalPostsEl.textContent =
          response.posts.length + (parseInt(totalPostsEl.textContent) || 0);
        rentalPostsEl.textContent = response.posts.length;

        // Enable save button
        saveBtn.disabled = response.posts.length === 0;
        exportBtn.disabled = response.posts.length === 0;
      } else {
        setStatus('error', 'לא נמצאו פוסטים להשכרה');
      }

      isScanning = false;
      scanBtn.disabled = false;
    });
  } catch (error) {
    console.error('Scan error:', error);
    setStatus('error', 'שגיאה בסריקה');
    isScanning = false;
    scanBtn.disabled = false;
  }
}

// Expand posts function
async function expandPosts() {
  setStatus('scanning', 'מרחיב פוסטים...');
  expandBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject expand script
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        let expanded = 0;
        document.querySelectorAll('div[role="button"]').forEach((button) => {
          const text = button.textContent || '';
          if (text.match(/See more|עוד|הצג עוד|ראה עוד/)) {
            button.click();
            expanded++;
          }
        });
        return expanded;
      },
    },
    (results) => {
      if (chrome.runtime.lastError) {
        console.error('Expand error:', chrome.runtime.lastError);
        setStatus('error', 'שגיאה בהרחבת פוסטים');
        expandBtn.disabled = false;
        return;
      }

      if (results && results[0]) {
        const expandedCount = results[0].result;
        setStatus('success', `הורחבו ${expandedCount} פוסטים`);
      } else {
        setStatus('error', 'לא נמצאו פוסטים להרחבה');
      }
      expandBtn.disabled = false;
    }
  );
}

// Display results
function displayResults() {
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  extractedPosts.forEach((post, index) => {
    const item = createResultItem(post, index);
    resultsList.appendChild(item);
  });
}

// Create result item
function createResultItem(post, index) {
  const div = document.createElement('div');
  div.className = 'result-item';

  // Extract key info
  const price = post.rawPrices?.[0] || 'לא צוין';
  const phone = post.phones?.[0] || '';
  const preview = post.text.substring(0, 100) + '...';

  div.innerHTML = `
    <div class="result-item-header">
      <div class="result-item-title">דירה #${index + 1}</div>
      <div class="result-item-price">${price}</div>
    </div>
    <div class="result-item-details">
      ${phone ? `<span>📱 ${phone}</span>` : ''}
      <span>👤 ${post.author || 'לא ידוע'}</span>
    </div>
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
      ${preview}
    </div>
  `;

  return div;
}

// Save to Domica
async function saveToDomica() {
  setStatus('scanning', 'שומר לדומיקה...');
  saveBtn.disabled = true;

  try {
    // Get Domica URL from settings or use default
    const domicaUrl = 'http://localhost:3001';

    // Dynamic timeout based on number of posts
    // Each batch of 3 posts takes ~25-30 seconds (15s delay + processing)
    // Add 90 seconds buffer for network and initial processing
    const batchCount = Math.ceil(extractedPosts.length / 3);
    const estimatedSeconds = batchCount * 30 + 90;
    const timeoutMs = Math.max(estimatedSeconds * 1000, 120000); // Minimum 2 minutes

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setStatus('error', 'הבקשה לקחה יותר מדי זמן - נסה עם פחות פוסטים');
    }, timeoutMs);

    // Show processing status with estimated time
    const actualEstimatedSeconds = batchCount * 20 + 60; // More realistic estimate for display
    const estimatedMinutes = Math.ceil(actualEstimatedSeconds / 60);
    setStatus(
      'info',
      `מעבד ${extractedPosts.length} דירות... זה יכול לקחת עד ${estimatedMinutes} דקות`
    );

    const response = await fetch(`${domicaUrl}/api/chrome-extension/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        posts: extractedPosts,
        source: 'chrome-extension',
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (response.ok) {
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        // If we can't parse the response but it was OK, assume success
        setStatus('success', 'הדירות נשמרו בהצלחה');
        setTimeout(() => {
          extractedPosts = [];
          resultsSection.classList.add('hidden');
          setStatus('', 'מוכן לסריקה');
        }, 3000);
        return;
      }

      console.log('Save response:', data);

      // Handle different response scenarios
      const totalProcessed = (data.saved || 0) + (data.updated || 0);

      if (totalProcessed === 0 && data.total > 0 && !data.success) {
        // Complete failure - no properties saved or updated
        setStatus('warning', data.message || `לא הצלחנו לעבד את הפוסטים - נסה שוב`);
        console.log('Save response:', data.message);
        saveBtn.disabled = false; // Re-enable the button
      } else if (data.updated > 0 && data.saved === 0) {
        // Only updates, no new properties
        setStatus('info', `עודכנו ${data.updated} דירות קיימות`);

        // Clear results after updates
        setTimeout(() => {
          extractedPosts = [];
          resultsSection.classList.add('hidden');
          setStatus('', 'מוכן לסריקה');
        }, 3000);
      } else if (data.saved > 0 || data.updated > 0) {
        // New saves and/or updates
        let message = '';
        if (data.saved > 0) message += `נשמרו ${data.saved} דירות חדשות`;
        if (data.updated > 0)
          message += `${data.saved > 0 ? ' ו' : ''}עודכנו ${data.updated} קיימות`;

        setStatus('success', message);

        // Clear results after success
        setTimeout(() => {
          extractedPosts = [];
          resultsSection.classList.add('hidden');
          setStatus('', 'מוכן לסריקה');
        }, 3000);
      } else {
        // No new properties found
        setStatus('info', data.message || 'לא נמצאו דירות חדשות לשמירה');

        setTimeout(() => {
          extractedPosts = [];
          resultsSection.classList.add('hidden');
          setStatus('', 'מוכן לסריקה');
        }, 3000);
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Save error response:', errorData);
      throw new Error(errorData.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Save error:', error);
    console.error('Error details:', error.message, error.stack);

    // Try to determine the specific error
    let errorMessage = 'שגיאה בשמירה';
    if (error.name === 'AbortError') {
      // Already set error message in timeout
      return;
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'לא ניתן להתחבר לשרת - ודא ש-npm run dev פועל';
    } else if (error.message.includes('CORS')) {
      errorMessage = 'שגיאת CORS - בדוק הרשאות';
    }

    setStatus('error', errorMessage);
    saveBtn.disabled = false;
  }
}

// Export JSON
function exportJSON() {
  const dataStr = JSON.stringify(extractedPosts, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `facebook-posts-${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();

  setStatus('success', 'הקובץ הורד');
}

// Set status
function setStatus(type, message) {
  status.className = `status ${type}`;
  statusText.textContent = message;
}

// Open help
function openHelp(e) {
  e.preventDefault();
  chrome.tabs.create({
    url: 'https://github.com/yourusername/domica-extension/wiki',
  });
}

// Initialize
setStatus('', 'מוכן לסריקה');
