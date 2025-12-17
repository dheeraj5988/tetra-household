/**
 * Email Parser Utility
 * Extracts Netflix verification links from email content
 */

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(str) {
  if (!str) return str;
  
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  
  let decoded = str;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }
  
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });
  
  decoded = decoded.replace(/&#x([a-f\d]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

/**
 * Extract Netflix verification URL from email content
 */
export function extractNetflixLink(email) {
  if (!email) return null;

  let links = [];

  if (email.html) {
    const htmlLinkRegex = /href=["']([^"']+)["']/gi;
    const matches = email.html.matchAll(htmlLinkRegex);
    links = Array.from(matches, (m) => decodeHtmlEntities(m[1]));
  }

  if (links.length === 0 && email.text) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const foundLinks = email.text.match(urlRegex) || [];
    links = foundLinks.map(link => decodeHtmlEntities(link));
  }

  if (email.links && email.links.length > 0) {
    const emailLinks = email.links.map((link) => decodeHtmlEntities(link.href));
    links = [...links, ...emailLinks];
  }

  links = [...new Set(links)];

  const verificationPatterns = [
    /https?:\/\/[^\/]*netflix\.com\/account\/travel[^\s]*/i,
    /https?:\/\/[^\/]*netflix\.com\/household[^\s]*/i,
    /https?:\/\/[^\/]*netflix\.com\/verify[^\s]*/i,
    /https?:\/\/[^\/]*netflix\.com\/.*(?:verify|household|device|travel)[^\s]*/i,
  ];

  for (const link of links) {
    for (const pattern of verificationPatterns) {
      if (pattern.test(link)) {
        let cleanUrl = link.trim();
        cleanUrl = cleanUrl.replace(/[.,;:!?)\]}>]+$/, '');
        return cleanUrl;
      }
    }
  }

  for (const link of links) {
    if (
      /netflix\.com/i.test(link) &&
      (/\?/.test(link) || /\/verify/.test(link) || /\/household/.test(link) || /\/travel/.test(link))
    ) {
      let cleanUrl = link.trim();
      cleanUrl = cleanUrl.replace(/[.,;:!?)\]}>]+$/, '');
      return cleanUrl;
    }
  }

  for (const link of links) {
    if (/netflix\.com/i.test(link)) {
      let cleanUrl = link.trim();
      cleanUrl = cleanUrl.replace(/[.,;:!?)\]}>]+$/, '');
      return cleanUrl;
    }
  }

  return null;
}

/**
 * Check if email is a Netflix verification email
 */
export function isNetflixVerificationEmail(email) {
  if (!email) return false;

  const from = email.from?.value?.[0]?.address || '';
  const subject = email.subject || '';
  const text = email.text || '';
  const html = email.html || '';

  const isFromNetflix =
    from.includes('netflix.com') ||
    from.includes('account.netflix.com') ||
    from.includes('noreply@netflix.com');

  const subjectKeywords = ['household', 'verify', 'device', 'travel', 'verification'];
  const hasSubjectKeyword = subjectKeywords.some((keyword) =>
    subject.toLowerCase().includes(keyword)
  );

  const contentKeywords = ['household', 'verify', 'device', 'click here', 'verify your'];
  const content = (text + ' ' + html).toLowerCase();
  const hasContentKeyword = contentKeywords.some((keyword) => content.includes(keyword));

  return isFromNetflix && (hasSubjectKeyword || hasContentKeyword);
}

