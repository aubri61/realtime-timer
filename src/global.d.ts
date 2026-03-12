export {};

declare global {
  interface Window {
    electronAPI?: {
      toggleOverlay: () => Promise<boolean>;
      getOverlayState: () => Promise<boolean>;
    };
  }
}

