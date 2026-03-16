export {};

declare global {
  interface Window {
    electronAPI?: {
      toggleOverlay: () => Promise<boolean>;
      getOverlayState: () => Promise<boolean>;
      notifyTimerFinished: (mode: 'work' | 'short-break' | 'long-break') => Promise<void>;
      playSystemSound: (name: string) => Promise<void>;
    };
  }
}

