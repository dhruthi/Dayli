import { create } from 'zustand';

export type SpeedMultiplier = 0.5 | 1 | 2 | 4;

interface PresentationState {
  isPresentationMode: boolean;
  isPlaying: boolean;
  speedMultiplier: SpeedMultiplier;
  currentStepIndex: number;
  totalSteps: number;

  togglePresentationMode: () => void;
  setPresentationMode: (enabled: boolean) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  setSpeed: (speed: SpeedMultiplier) => void;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  isPresentationMode: false,
  isPlaying: false,
  speedMultiplier: 1,
  currentStepIndex: 0,
  totalSteps: 10,

  togglePresentationMode: () => {
    const next = !get().isPresentationMode;
    set({ isPresentationMode: next, isPlaying: next });
  },

  setPresentationMode: (enabled) => set({ isPresentationMode: enabled, isPlaying: enabled }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ speedMultiplier: speed }),
}));
