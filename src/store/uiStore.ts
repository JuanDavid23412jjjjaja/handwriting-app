import { create } from 'zustand';

export type SettingsTab = 'paper' | 'ink' | 'realism' | 'images';

interface UiStore {
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  exportOpen: boolean;
  setExportOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  tab: 'paper',
  setTab: (tab) => set({ tab }),
  zoom: 0.82,
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.35, zoom)) }),
  currentPage: 0,
  setCurrentPage: (currentPage) => set({ currentPage }),
  selectedImageId: null,
  setSelectedImageId: (selectedImageId) => set({ selectedImageId }),
  exportOpen: false,
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
