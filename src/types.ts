export type Phase = 'Phase 1' | 'Phase 2' | 'Phase 3';

export type Format = 
  | 'Adult Novel' 
  | 'YA Novel' 
  | 'Middle Grade' 
  | 'Short Story' 
  | 'Comic' 
  | 'Comic (TPB)' 
  | 'Audio Drama' 
  | 'Manga' 
  | 'Anthology';

export interface Book {
  id: string;
  title: string;
  phase: Phase;
  format: Format;
  read: boolean;
  coverUrl?: string;
  rating?: number;
}

export interface SyncStatus {
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
  message?: string;
}
