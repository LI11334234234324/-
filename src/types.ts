export interface ParagraphSegment {
  id: string;
  startTime: number; // In seconds
  endTime?: number;   // In seconds
  text: string;
  translation?: string;
  speaker?: string;
  pdfPage?: number;   // Associated 1-indexed page number in PDF
}

export interface Track {
  id: string;
  title: string;
  author?: string;
  category: string;
  audioUrl: string;
  isBlobUrl?: boolean;
  isTTS?: boolean;
  coverImage?: string;
  duration?: number;
  description?: string;
  segments: ParagraphSegment[];
  createdAt: number;
  notes?: Record<string, string>; // segmentId -> user note text
  pdfUrl?: string; // Data URL or Blob URL of original PDF file
  pdfFileName?: string;
  pdfPageCount?: number;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'slate';
export type ReaderFont = 'sans' | 'serif' | 'mono';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type ReaderViewMode = 'pdf' | 'text' | 'side-by-side';

export interface ReaderSettings {
  fontSize: FontSize;
  lineHeight: LineHeight;
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  autoScroll: boolean;
  highlightMode: 'paragraph' | 'focus'; // focus dims non-active text
  showTimestamps: boolean;
  showTranslation: boolean;
  layout: 'split' | 'stacked';
  viewMode: ReaderViewMode;
}

export interface Bookmark {
  id: string;
  trackId: string;
  segmentId: string;
  timestamp: number;
  textSnippet: string;
  note?: string;
  createdAt: number;
}
