import { create } from 'zustand';

export const usePageTitleStore = create((set) => ({
  pageTitle: null,
  setPageTitle: (title) => set({ pageTitle: title }),
}));

