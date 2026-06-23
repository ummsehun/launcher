import React from 'react';
import { useUIStore } from '../../../shared/stores/uiStore';
import { ModalShell } from './ModalShell';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { LauncherConfigPanel } from './LauncherConfigPanel';
import { LibraryPanel } from './LibraryPanel';
import { AssetsPanel } from './AssetsPanel';

export type FeatureModalType = 'settings' | 'launcher' | 'library' | 'assets';

const MODAL_COMPONENTS: Record<FeatureModalType, React.ComponentType> = {
  settings: GlobalSettingsPanel,
  launcher: LauncherConfigPanel,
  library: LibraryPanel,
  assets: AssetsPanel,
};

export const FeatureModal: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();

  if (!activeModal) return null;

  const Content = MODAL_COMPONENTS[activeModal as FeatureModalType];
  
  if (!Content) return null;

  return (
    <ModalShell onClose={closeModal}>
      <Content />
    </ModalShell>
  );
};
