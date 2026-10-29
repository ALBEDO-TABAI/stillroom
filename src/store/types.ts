export type NoteType = 'text' | 'image' | 'link' | 'folder' | 'audio' | 'video';
export type Dock = { l?: string; t?: string } | null;
export interface NoteMeta {
  transcribing?: boolean; cooling?: boolean;
  dock?: Dock;
  packed?: boolean;
  titleAlign?: 'left' | 'center' | 'right';
  titleWeight?: 'light' | 'regular' | 'medium';
  displayWidth?: number;
  titleFontScale?: number;
  frameH?: number;
  url?: string;
  domain?: string;
  linkTitle?: string;
  linkImage?: string;
  aspectRatio?: number;      // height / width
  lightImage?: boolean;
  rotation?: number;         // quarter turns
  crop?: { x: number; y: number; w: number; h: number } | null;
  originalFilename?: string;
  fileSize?: number;
  poster?: string;
  transcript?: string;
}
export interface Note {
  id: string;
  type: NoteType;
  title: string;
  text: string;              // HTML body
  createdAt: number;
  updatedAt: number;
  canvasX: number;
  canvasY: number;
  parentId: string | null;   // folder membership
  deletedAt: number | null;  // bin
  mediaUrl?: string;         // image / video / poster ("idb:<key>" for local blobs)
  audioUrl?: string;
  duration?: string;         // "m:ss"
  metadata: NoteMeta;
}
export interface Cam { x: number; y: number; z: number }
export interface Prefs {
  dark: boolean;
  gap: number;
  snapRadius: number;
  smartGuides: boolean;
  magneticSnap: boolean;
  adaptiveScale: boolean;
  autoTranscribe: boolean;
  imageRounded: boolean;
  storeLocally: boolean;
  playbackSpeed: number;
}
