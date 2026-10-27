/**
 * Text normalization and chunking service
 */

export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits text into chunks of ~1,500 tokens (approx 6,000 characters) with overlap
 */
export function chunkText(rawText, maxChunkSize = 5000, overlap = 400) {
  const text = normalizeText(rawText);
  if (text.length < 100) {
    throw new Error('Provided text is too short. Please provide at least 100 characters of study notes.');
  }

  // Attempt to split by Markdown or major headings first
  const headingSplit = text.split(/(?=\n#{1,3}\s+[^\n]+)/g);
  let chunks = [];

  if (headingSplit.length > 1 && headingSplit.every((h) => h.length < maxChunkSize * 1.5)) {
    let current = '';
    for (const section of headingSplit) {
      if ((current + section).length > maxChunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = section;
      } else {
        current += '\n\n' + section;
      }
    }
    if (current.trim().length > 0) {
      chunks.push(current.trim());
    }
  }

  // If heading splitting wasn't applicable or produced a single huge chunk
  if (chunks.length === 0) {
    let startIndex = 0;
    while (startIndex < text.length) {
      let endIndex = startIndex + maxChunkSize;
      if (endIndex < text.length) {
        // Find natural paragraph or sentence boundary
        const lastPara = text.lastIndexOf('\n\n', endIndex);
        if (lastPara > startIndex + maxChunkSize * 0.6) {
          endIndex = lastPara;
        } else {
          const lastPeriod = text.lastIndexOf('. ', endIndex);
          if (lastPeriod > startIndex + maxChunkSize * 0.6) {
            endIndex = lastPeriod + 1;
          }
        }
      } else {
        endIndex = text.length;
      }

      const chunk = text.slice(startIndex, endIndex).trim();
      if (chunk.length >= 80) {
        chunks.push(chunk);
      }

      startIndex = endIndex - overlap;
      if (startIndex >= text.length || endIndex === text.length) {
        break;
      }
    }
  }

  // Limit max chunks to 3 for optimal 3-floor dungeon and fast parallel completion (<20s)
  return chunks.slice(0, 3);
}
