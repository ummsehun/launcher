import { create } from 'zustand';

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface TourStepMetadata {
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'over';
  align?: 'start' | 'center' | 'end';
}

interface TourState {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  targetRect: TargetRect | null;
  stepMetadata: TourStepMetadata | null;
  driverInstance: any;
  setTourState: (state: Partial<TourState>) => void;
  startTour: (driverInstance: any, totalSteps: number) => void;
  updateStep: (index: number, rect: TargetRect | null, metadata: TourStepMetadata) => void;
  next: () => void;
  prev: () => void;
  close: () => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isOpen: false,
  currentStep: 0,
  totalSteps: 18,
  targetRect: null,
  stepMetadata: null,
  driverInstance: null,

  setTourState: (state) => set((prev) => ({ ...prev, ...state })),

  startTour: (driverInstance, totalSteps) => {
    set({
      isOpen: true,
      currentStep: 0,
      totalSteps,
      driverInstance,
      targetRect: null,
      stepMetadata: null,
    });
  },

  updateStep: (index, rect, metadata) => {
    set({
      currentStep: index,
      targetRect: rect,
      stepMetadata: metadata,
    });
  },

  next: () => {
    const { driverInstance } = get();
    if (driverInstance) {
      driverInstance.moveNext();
    }
  },

  prev: () => {
    const { driverInstance } = get();
    if (driverInstance) {
      driverInstance.movePrevious();
    }
  },

  close: () => {
    const { driverInstance } = get();
    if (driverInstance) {
      driverInstance.destroy();
    }
    set({
      isOpen: false,
      currentStep: 0,
      targetRect: null,
      stepMetadata: null,
      driverInstance: null,
    });
  },
}));
