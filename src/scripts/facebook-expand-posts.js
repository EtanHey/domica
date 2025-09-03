// Facebook Post Expander Script
// Run this in the browser console before taking screenshots/PDFs

(function expandAllFacebookPosts() {
  console.log('🔍 Starting Facebook post expansion...');

  let expandedCount = 0;
  let lastHeight = document.body.scrollHeight;

  // Function to click "See More" buttons
  function clickSeeMoreButtons() {
    // Different selectors Facebook uses for "See More"
    const seeMoreSelectors = [
      'div[role="button"]:has-text("See more")',
      'div[role="button"]:has-text("See More")',
      'div[role="button"]:has-text("עוד")',
      'div[role="button"]:has-text("הצג עוד")',
      'div[role="button"]:has-text("ראה עוד")',
      '[data-ad-preview="message"] div[role="button"]',
      'span:has-text("See more"):parent',
      'span:has-text("עוד"):parent',
      // More specific selectors
      'div[data-ad-comet-preview="message"] div[role="button"]',
      'div[style*="line-clamp"] + div[role="button"]',
      'div[style*="-webkit-line-clamp"] + div[role="button"]',
    ];

    // Try querySelector for simple selectors
    const simpleSelectors = [
      'div[role="button"] span:contains("See more")',
      'div[role="button"] span:contains("עוד")',
      'div[role="button"][tabindex="0"]',
    ];

    // XPath for Hebrew text
    const xpathQueries = [
      "//div[@role='button'][contains(., 'See more')]",
      "//div[@role='button'][contains(., 'עוד')]",
      "//div[@role='button'][contains(., 'הצג עוד')]",
      "//div[@role='button'][contains(., 'ראה עוד')]",
    ];

    let buttons = [];

    // Try XPath queries
    xpathQueries.forEach((xpath) => {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < result.snapshotLength; i++) {
        const button = result.snapshotItem(i);
        if (button && !buttons.includes(button)) {
          buttons.push(button);
        }
      }
    });

    // Also try contains text approach
    document.querySelectorAll('div[role="button"]').forEach((button) => {
      const text = button.textContent || '';
      if (
        (text.includes('See more') ||
          text.includes('עוד') ||
          text.includes('הצג עוד') ||
          text.includes('ראה עוד')) &&
        !buttons.includes(button)
      ) {
        buttons.push(button);
      }
    });

    // Click all found buttons
    buttons.forEach((button) => {
      try {
        button.click();
        expandedCount++;
        console.log(`✅ Expanded post ${expandedCount}`);
      } catch (e) {
        console.log('Failed to click button:', e);
      }
    });

    return buttons.length;
  }

  // Function to scroll page slowly to trigger lazy loading
  async function scrollToBottom() {
    const totalHeight = document.body.scrollHeight;
    const windowHeight = window.innerHeight;
    let currentPosition = window.pageYOffset;

    while (currentPosition < totalHeight - windowHeight) {
      currentPosition += windowHeight * 0.8;
      window.scrollTo(0, currentPosition);

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Click any new "See more" buttons that appeared
      clickSeeMoreButtons();
    }

    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Main execution
  async function expandAll() {
    console.log('📜 Scrolling through page to load all content...');
    await scrollToBottom();

    console.log('🔘 Clicking all "See more" buttons...');
    let foundButtons = 0;
    let attempts = 0;

    // Keep trying until no new buttons are found
    do {
      foundButtons = clickSeeMoreButtons();
      attempts++;

      if (foundButtons > 0) {
        // Wait for content to expand
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (foundButtons > 0 && attempts < 10);

    console.log(`✨ Expansion complete! Expanded ${expandedCount} posts.`);
    console.log('📸 Page is ready for screenshot/PDF export');

    // Final scroll to top
    window.scrollTo(0, 0);
  }

  // Execute
  expandAll().catch(console.error);
})();

// Simpler version for manual use:
function quickExpand() {
  document.querySelectorAll('div[role="button"]').forEach((b) => {
    if (b.textContent?.includes('עוד') || b.textContent?.includes('See more')) {
      b.click();
    }
  });
}
