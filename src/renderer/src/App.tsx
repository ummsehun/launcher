import { useEffect } from 'react';
import { LauncherPage } from './pages/launcher/LauncherPage';
import { FeatureModal } from './features/launcher/components/FeatureModal';
import { LauncherUpdateModal } from './features/launcher/components/LauncherUpdateModal';
import { TourPopover } from './features/launcher/components/TourPopover';
import { useLauncherConfigStore } from './features/launcher/stores/launcherConfigStore';
import './shared/styles/globals.css';
import './shared/i18n/config';

function App() {
  useEffect(() => {
    useLauncherConfigStore.getState().load();
  }, []);

  return (
    <>
      <LauncherPage />
      <FeatureModal />
      <LauncherUpdateModal />
      <TourPopover />
    </>
  );
}

export default App;
