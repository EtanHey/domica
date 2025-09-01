javascript: (async () => {
  console.log('🔍 Expanding Facebook posts...');
  let e = 0;
  async function t() {
    const t = document.body.scrollHeight,
      o = window.innerHeight;
    let n = window.pageYOffset;
    for (; n < t - o; )
      ((n += 0.8 * o), window.scrollTo(0, n), await new Promise((e) => setTimeout(e, 1e3)), l());
    (window.scrollTo(0, 0), await new Promise((e) => setTimeout(e, 500)));
  }
  function l() {
    let t = [];
    return (
      [
        "//div[@role='button'][contains(., 'See more')]",
        "//div[@role='button'][contains(., 'עוד')]",
        "//div[@role='button'][contains(., 'הצג עוד')]",
        "//div[@role='button'][contains(., 'ראה עוד')]",
      ].forEach((e) => {
        const l = document.evaluate(
          e,
          document,
          null,
          XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let e = 0; e < l.snapshotLength; e++) {
          const o = l.snapshotItem(e);
          o && !t.includes(o) && t.push(o);
        }
      }),
      document.querySelectorAll('div[role="button"]').forEach((e) => {
        const l = e.textContent || '';
        (l.includes('See more') ||
          l.includes('עוד') ||
          l.includes('הצג עוד') ||
          l.includes('ראה עוד')) &&
          !t.includes(e) &&
          t.push(e);
      }),
      t.forEach((t) => {
        try {
          (t.click(), e++, console.log(`✅ Expanded post ${e}`));
        } catch (e) {
          console.log('Failed:', e);
        }
      }),
      t.length
    );
  }
  await t();
  let o = 0,
    n = 0;
  do {
    ((o = l()), n++, o > 0 && (await new Promise((e) => setTimeout(e, 1e3))));
  } while (o > 0 && n < 10);
  (console.log(`✨ Done! Expanded ${e} posts.`),
    window.scrollTo(0, 0),
    alert(`✅ הורחבו ${e} פוסטים!\n📸 הדף מוכן לצילום מסך או PDF`));
})();
