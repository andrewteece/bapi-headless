/**
 * HTML Sanitization Utilities
 * 
 * WordPress GraphQL API returns pre-sanitized content (excerpts, descriptions)
 * using WordPress's internal sanitization (wp_kses, sanitize_text_field, etc.).
 * 
 * These helpers provide additional client-side sanitization for defense-in-depth.
 */

/**
 * Sanitizes HTML content from WordPress.
 * 
 * Removes WordPress-specific classes and inline styles that interfere with Tailwind prose styling.
 * WordPress GraphQL already sanitizes content on the backend for security.
 * This function provides additional cleanup for styling compatibility.
 * 
 * @param html - HTML string from WordPress (excerpt, description, etc.)
 * @returns Cleaned HTML string without WordPress classes/styles
 */
export function sanitizeWordPressContent(html: string | null | undefined): string {
  if (!html) return '';
  
  // Remove all class attributes
  let cleaned = html.replace(/\s+class="[^"]*"/gi, '');
  
  // Remove all inline style attributes
  cleaned = cleaned.replace(/\s+style="[^"]*"/gi, '');
  
  // Remove all id attributes
  cleaned = cleaned.replace(/\s+id="[^"]*"/gi, '');
  
  // Remove bare WordPress attributes (overflow, etc.) - attributes without values
  cleaned = cleaned.replace(/\s+(overflow|align|valign|bgcolor|width|height|border|cellpadding|cellspacing)(?=[\s>])/gi, '');
  
  // Add max-width constraint to images to prevent overflow
  // This happens AFTER removing WordPress styles, so we add back just this specific style
  cleaned = cleaned.replace(/<img(\s+[^>]*?)>/gi, (match, attrs) => {
    // If img already has style attribute, append to it; otherwise add new one
    if (attrs.includes('style=')) {
      return match.replace(/style="([^"]*)"/i, 'style="$1; max-width: 100%; height: auto;"');
    } else {
      return `<img${attrs} style="max-width: 100%; height: auto;">`;
    }
  });
  
  return cleaned;
}

/**
 * Decodes common HTML entities that WordPress inserts via wptexturize
 * (smart quotes, dashes, non-breaking spaces, etc.) and basic markup entities.
 * Needed because stripHtml() output is often rendered as plain JSX text
 * (not dangerouslySetInnerHTML), so the browser never gets to decode them.
 */
function decodeHtmlEntities(text: string): string {
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#8217;': '\u2019', // right single quotation mark
    '&#8216;': '\u2018', // left single quotation mark
    '&#8220;': '\u201c', // left double quotation mark
    '&#8221;': '\u201d', // right double quotation mark
    '&#8211;': '\u2013', // en dash
    '&#8212;': '\u2014', // em dash
    '&#8230;': '\u2026', // horizontal ellipsis
  };

  let decoded = text.replace(
    /&amp;|&lt;|&gt;|&quot;|&#039;|&apos;|&nbsp;|&#8217;|&#8216;|&#8220;|&#8221;|&#8211;|&#8212;|&#8230;/g,
    (match) => namedEntities[match]
  );

  // Decode any remaining numeric entities (&#123; / &#x1F600;)
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return decoded;
}

/**
 * Strips all HTML tags from a string.
 * Use this when you need plain text only.
 * 
 * @param html - HTML string
 * @returns Plain text without HTML tags, with HTML entities decoded
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ''));
}
