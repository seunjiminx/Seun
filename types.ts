
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LIVE = 'LIVE',
  DARK_ACADEMIA = 'DARK_ACADEMIA',
  ADMIN_FICTION = 'ADMIN_FICTION',
  SETTINGS = 'SETTINGS'
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  isOwner?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'video' | 'search-results';
  mediaUrl?: string;
  groundingLinks?: GroundingLink[];
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface LiveTranscript {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
}

export interface VideoGenerationState {
  status: 'idle' | 'generating' | 'downloading' | 'error';
  progress: number;
  message: string;
  videoUrl?: string;
}
