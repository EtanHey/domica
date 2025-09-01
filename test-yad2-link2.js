function extractYad2Link(text) {
  // More flexible patterns to catch Yad2 links
  const yad2Patterns = [
    /https?:\/\/(?:www\.)?yad2\.co\.il[^\s]*/gi,
    /yad2\.co\.il[^\s]*/gi,
  ];
  
  for (const pattern of yad2Patterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Filter out just "yad2.co.il" without path
      for (const match of matches) {
        let url = match;
        // Make sure it's not just the domain
        if (url !== 'yad2.co.il' && url !== 'www.yad2.co.il') {
          if (!url.startsWith('http')) {
            url = 'https://' + url;
          }
          return url;
        }
      }
    }
  }
  
  // If we didn't find a full URL, check if there's a yad2.co.il mention
  // and try to construct the URL from the context
  if (text.includes('yad2.co.il')) {
    // Look for property-related patterns in Yad2 URLs
    const propertyPattern = /yad2\.co\.il\/[\w\/\-]+/gi;
    const match = text.match(propertyPattern);
    if (match && match[0] !== 'yad2.co.il') {
      let url = match[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return url;
    }
  }
  
  return null;
}

const text = `למכירה -ללא תיווך !!!
בבאר יעקב
דירת גן תלויה 5 חדרים ייחודית בשכונת פארק המושבה המבוקשת !
✅️ דירת גן מרווחת ומושקעת ברחוב יצחק רבין
✅️ גינה 60 מטר ענקית! 
✅️ מטבח משודרג של ״אניס מטבחים״ עם אי ומלא מקומות אחסון
✅️ מחסן גדול צמוד לדירה
✅️ 2 חניות פרטיות מקורות
✅️ חדרים מרווחים כולל ממ"ד
✅️ מזגנים עיליים בכל חדר
✅️ דוד שמש חשמלי +חימום בגז
✅️ נכס במיקום מעולה – קרוב לגני ילדים, פארק ירוק ומרכז מסחרי
🔑 פינוי גמיש 
📞 לפרטים 053-7566093
מצאתי מודעה ביד2 שחשבתי שתעניין אותך: 
דירת גן, שדרות יצחק רבין 6, פארק המושבה, באר יעקב | אלפי מודעות חדשות בכל יום!
yad2.co.il
דירת גן, שדרות יצחק רבין 6, פארק המושבה, באר יעקב | אלפי מודעות חדשות בכל יום!`;

const result = extractYad2Link(text);
console.log('Found Yad2 link:', result);
console.log('Text includes yad2.co.il:', text.includes('yad2.co.il'));
