import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';
import { useTourStore, TourStepMetadata } from '../stores/tourStore';

export const useLauncherTour = () => {
  const { t } = useTranslation();

  const syncTourState = (index: number) => {
    const uiStore = useUIStore.getState();
    const seriesStore = useTerminalSeriesStore.getState();

    // Explicitly enforce the exact app state corresponding to the active step index
    if (index < 4) {
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    } else if (index === 4) {
      // Step 5: Mienjine Tab
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'mienjine') {
        seriesStore.selectSeries('mienjine');
      }
    } else if (index === 5) {
      // Step 6: Gascii Tab again
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    } else if (index === 6 || index === 7) {
      // Step 7: Quick Actions, Step 8: Launcher Tab
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    } else if (index === 8) {
      // Step 9: Launcher Config Panel
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
      if (uiStore.activeModal !== 'launcher') {
        uiStore.openModal('launcher');
      }
    } else if (index === 9) {
      // Step 10: Library Tab
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    } else if (index === 10) {
      // Step 11: Library Panel
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
      if (uiStore.activeModal !== 'library') {
        uiStore.openModal('library');
      }
    } else if (index === 11) {
      // Step 12: Assets Tab
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    } else if (index === 12) {
      // Step 13: Assets Panel
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
      if (uiStore.activeModal !== 'assets') {
        uiStore.openModal('assets');
      }
    } else if (index >= 13) {
      // Steps 14+: Play button, detail options, social toolbar, support
      uiStore.closeModal();
      if (seriesStore.selectedSeriesId !== 'gascii') {
        seriesStore.selectSeries('gascii');
      }
    }
  };

  const startTour = () => {
    // 18-step onboarding tour configuration
    const steps: DriveStep[] = [
      {
        // s1: Welcome
      },
      {
        // s2: Quick overview
      },
      {
        element: '#launcher-sidebar-panel', // s3
      },
      {
        element: '#sidebar-series-gascii', // s4
      },
      {
        element: '#sidebar-series-mienjine', // s5
      },
      {
        element: '#sidebar-series-gascii', // s6
      },
      {
        element: '#quick-actions-panel', // s7
      },
      {
        element: '#hero-tab-launcher', // s8
      },
      {
        element: '#settings-install-path-card', // s9
      },
      {
        element: '#hero-tab-library', // s10
      },
      {
        element: '#library-table-container, #library-empty-state', // s11
      },
      {
        element: '#hero-tab-assets', // s12
      },
      {
        element: '#media-download-panel', // s13
      },
      {
        element: '#action-bar-play-btn', // s14
      },
      {
        element: '#action-bar-menu-btn', // s15
      },
      {
        element: '#social-links-toolbar', // s16
      },
      {
        element: '#social-links-toolbar', // s17
      },
      {
        // s18: Complete
      },
    ];

    const stepsMetadata: TourStepMetadata[] = [
      {
        title: t('launcher.tour.s1_title'),
        description: t('launcher.tour.s1_desc'),
        side: 'over',
      },
      {
        title: t('launcher.tour.s2_title'),
        description: t('launcher.tour.s2_desc'),
        side: 'over',
      },
      {
        title: t('launcher.tour.s3_title'),
        description: t('launcher.tour.s3_desc'),
        side: 'right',
        align: 'start',
      },
      {
        title: t('launcher.tour.s4_title'),
        description: t('launcher.tour.s4_desc'),
        side: 'right',
        align: 'center',
      },
      {
        title: t('launcher.tour.s5_title'),
        description: t('launcher.tour.s5_desc'),
        side: 'right',
        align: 'center',
      },
      {
        title: t('launcher.tour.s6_title'),
        description: t('launcher.tour.s6_desc'),
        side: 'right',
        align: 'center',
      },
      {
        title: t('launcher.tour.s7_title'),
        description: t('launcher.tour.s7_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s8_title'),
        description: t('launcher.tour.s8_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s9_title'),
        description: t('launcher.tour.s9_desc'),
        side: 'bottom',
        align: 'center',
      },
      {
        title: t('launcher.tour.s10_title'),
        description: t('launcher.tour.s10_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s11_title'),
        description: t('launcher.tour.s11_desc'),
        side: 'bottom',
        align: 'center',
      },
      {
        title: t('launcher.tour.s12_title'),
        description: t('launcher.tour.s12_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s13_title'),
        description: t('launcher.tour.s13_desc'),
        side: 'bottom',
        align: 'center',
      },
      {
        title: t('launcher.tour.s14_title'),
        description: t('launcher.tour.s14_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s15_title'),
        description: t('launcher.tour.s15_desc'),
        side: 'top',
        align: 'center',
      },
      {
        title: t('launcher.tour.s16_title'),
        description: t('launcher.tour.s16_desc'),
        side: 'left',
        align: 'center',
      },
      {
        title: t('launcher.tour.s17_title'),
        description: t('launcher.tour.s17_desc'),
        side: 'left',
        align: 'center',
      },
      {
        title: t('launcher.tour.s18_title'),
        description: t('launcher.tour.s18_desc'),
        side: 'over',
        align: 'center',
      },
    ];

    let driverObj: any;

    driverObj = driver({
      showProgress: false, // Turn off legacy UI elements
      allowClose: false, // Disallow closing on outside overlay clicks to prevent premature guide ending
      stagePadding: 2, // Extremely tight focus padding
      onHighlightStarted: (element, step, { state }) => {
        const index = state.activeIndex ?? 0;
        syncTourState(index);

        const updateRect = () => {
          let rect = null;
          if (element) {
            const domRect = element.getBoundingClientRect();
            rect = {
              top: domRect.top,
              left: domRect.left,
              width: domRect.width,
              height: domRect.height,
              bottom: domRect.bottom,
              right: domRect.right,
            };
          }
          useTourStore.getState().updateStep(index, rect, stepsMetadata[index]);
        };

        // When focusing dynamically-opened panels, wait for mount and refresh overlay position
        if ([8, 10, 12].includes(index)) {
          setTimeout(() => {
            const currentElement = document.querySelector(step.element as string);
            let rect = null;
            if (currentElement) {
              const domRect = currentElement.getBoundingClientRect();
              rect = {
                top: domRect.top,
                left: domRect.left,
                width: domRect.width,
                height: domRect.height,
                bottom: domRect.bottom,
                right: domRect.right,
              };
            }
            useTourStore.getState().updateStep(index, rect, stepsMetadata[index]);
            driverObj?.refresh();
          }, 150);
        } else {
          updateRect();
        }
      },
      onHighlighted: (element, step, { state }) => {
        const index = state.activeIndex ?? 0;

        // Auto-advance steps when active action tabs are clicked
        if ([7, 9, 11].includes(index) && element) {
          const handler = () => {
            if (index === 7) useUIStore.getState().openModal('launcher');
            if (index === 9) useUIStore.getState().openModal('library');
            if (index === 11) useUIStore.getState().openModal('assets');

            setTimeout(() => {
              driverObj?.moveNext();
            }, 150);
          };
          element.addEventListener('click', handler);
          (element as any)._tourHandler = handler;
        }
      },
      onDeselected: (element, step, { state }) => {
        if (element && (element as any)._tourHandler) {
          element.removeEventListener('click', (element as any)._tourHandler);
          delete (element as any)._tourHandler;
        }
      },
      onDestroyed: () => {
        // Enforce modal closed state on tour end/close
        useUIStore.getState().closeModal();
        useTourStore.getState().close();
      },
      steps,
    });

    // Start tour in Zustand store as well
    useTourStore.getState().startTour(driverObj, steps.length);
    driverObj.drive();
  };

  return { startTour };
};
