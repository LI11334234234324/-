import { ParagraphSegment } from '../types';

/**
 * Formats time in seconds to mm:ss or hh:mm:ss format
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds into precise mm:ss.ms
 */
export function formatPreciseTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Parses timestamp string like "01:23.45" or "01:23" or "00:01:23,450" into seconds
 */
export function parseTimestamp(timeStr: string): number {
  const cleanStr = timeStr.trim().replace(',', '.');
  const parts = cleanStr.split(':');
  
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    return hrs * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    return mins * 60 + secs;
  } else if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  return 0;
}

/**
 * Parses raw text input into ParagraphSegments.
 * Detects LRC ([00:12.34] text), SRT, or plain paragraphs.
 */
export function parseTextToSegments(rawText: string, totalDuration: number = 0): ParagraphSegment[] {
  if (!rawText.trim()) return [];

  const lines = rawText.split('\n');
  const lrcRegex = /^\[(\d{2}:)?\d{2}:\d{2}(\.\d+)?\]/;// Matches [mm:ss.xx] or [hh:mm:ss.xx]
  const bracketTimeRegex = /\[(\d{1,2}:)?\d{2}:\d{2}(\.\d+)?\]/g;
  
  const segments: ParagraphSegment[] = [];

  // Check if text has LRC format
  const hasLrc = lines.some(line => lrcRegex.test(line.trim()));

  if (hasLrc) {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const timeMatches = trimmed.match(/\[(\d{1,2}:)?\d{2}:\d{2}(\.\d+)?\]/g);
      if (timeMatches) {
        const textContent = trimmed.replace(/\[(\d{1,2}:)?\d{2}:\d{2}(\.\d+)?\]/g, '').trim();
        timeMatches.forEach(timeMatch => {
          const rawTime = timeMatch.substring(1, timeMatch.length - 1);
          const timeSec = parseTimestamp(rawTime);
          if (textContent || timeMatches.length === 1) {
            segments.push({
              id: `seg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
              startTime: timeSec,
              text: textContent || '♪',
            });
          }
        });
      }
    });

    // Sort by startTime
    segments.sort((a, b) => a.startTime - b.startTime);

    // Calculate endTimes
    for (let i = 0; i < segments.length; i++) {
      if (i < segments.length - 1) {
        segments[i].endTime = segments[i + 1].startTime;
      } else {
        segments[i].endTime = totalDuration > segments[i].startTime ? totalDuration : segments[i].startTime + 5;
      }
    }

    return segments;
  }

  // Check SRT format
  if (rawText.includes('-->')) {
    const srtBlocks = rawText.split(/\n\s*\n/);
    srtBlocks.forEach((block, index) => {
      const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const timeLineIndex = blockLines.findIndex(l => l.includes('-->'));
      if (timeLineIndex !== -1) {
        const timeLine = blockLines[timeLineIndex];
        const [startStr, endStr] = timeLine.split('-->');
        const startTime = parseTimestamp(startStr.trim());
        const endTime = parseTimestamp(endStr.trim());
        const textLines = blockLines.slice(timeLineIndex + 1);
        
        segments.push({
          id: `srt-${index}-${Math.random().toString(36).substring(2, 6)}`,
          startTime,
          endTime,
          text: textLines.join(' '),
        });
      }
    });

    if (segments.length > 0) return segments;
  }

  // Plain Text paragraph parsing (split by blank lines or paragraphs)
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  // Distribute paragraphs evenly across duration if available, else 10s each
  const estimatedDuration = totalDuration > 0 ? totalDuration : paragraphs.length * 10;
  const timePerParagraph = estimatedDuration / paragraphs.length;

  return paragraphs.map((paraText, i) => {
    // Check if line starts with bracketed time like [01:20]
    const match = paraText.match(/^\[(\d{1,2}:)?\d{2}:\d{2}(\.\d+)?\]/);
    let startTime = i * timePerParagraph;
    let cleanText = paraText;

    if (match) {
      const rawTime = match[0].substring(1, match[0].length - 1);
      startTime = parseTimestamp(rawTime);
      cleanText = paraText.replace(match[0], '').trim();
    }

    // Check for speaker prefix like "Alice: Hello" or "【朗读】："
    let speaker: string | undefined;
    const speakerMatch = cleanText.match(/^([【\[\w\u4e00-\u9fa5\]】]+)[:：]\s*(.*)/s);
    if (speakerMatch) {
      speaker = speakerMatch[1].replace(/[【\]\[\]]/g, '');
      cleanText = speakerMatch[2];
    }

    return {
      id: `p-${i}-${Math.random().toString(36).substring(2, 6)}`,
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round((startTime + timePerParagraph) * 100) / 100,
      text: cleanText,
      speaker,
    };
  });
}
