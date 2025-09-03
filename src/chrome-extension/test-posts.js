// Copy and paste this entire block into the console
(function () {
  console.log('=== Looking for main posts ===');

  const feed = document.querySelector('[role="feed"]');
  if (!feed) {
    console.log('No feed found');
    return;
  }

  const feedChildren = Array.from(feed.children);
  console.log('Feed has ' + feedChildren.length + ' direct children');

  let postCount = 0;
  feedChildren.forEach(function (child, i) {
    if (child.offsetHeight < 200) return;

    const postTexts = [];
    const allTexts = child.querySelectorAll(
      'div[data-ad-preview="message"], div[data-ad-comet-preview="message"], div[dir="auto"]'
    );

    allTexts.forEach(function (el) {
      const isComment =
        el.closest('[aria-label*="Comment"]') || el.closest('[aria-label*="תגובה"]');
      if (isComment) return;

      const text = el.textContent.trim();
      if (text.length > 50 && text.match(/[\u05d0-\u05ea]/)) {
        postTexts.push(text);
      }
    });

    if (postTexts.length > 0) {
      postCount++;
      console.log('\n--- POST ' + postCount + ' (feed child ' + i + ') ---');
      console.log('Height: ' + child.offsetHeight);
      console.log('Post text: ' + postTexts[0].substring(0, 100) + '...');

      const author = child.querySelector('strong');
      if (author) console.log('Author: ' + author.textContent);
    }
  });

  console.log('\nTotal posts found: ' + postCount);
})();
