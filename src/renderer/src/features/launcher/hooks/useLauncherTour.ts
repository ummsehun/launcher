import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../../shared/stores/uiStore';
import { useTerminalSeriesStore } from '../../terminal-series/stores/terminalSeriesStore';

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
    // 18-step onboarding tour using driver.js
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('launcher.tour.s1_title'),
          description: t('launcher.tour.s1_desc'),
          side: 'over',
          align: 'center',
        },
      },
      {
        popover: {
          title: t('launcher.tour.s2_title'),
          description: t('launcher.tour.s2_desc'),
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '#launcher-sidebar-panel',
        popover: {
          title: t('launcher.tour.s3_title'),
          description: t('launcher.tour.s3_desc'),
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#sidebar-series-gascii',
        popover: {
          title: t('launcher.tour.s4_title'),
          description: t('launcher.tour.s4_desc'),
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#sidebar-series-mienjine',
        popover: {
          title: t('launcher.tour.s5_title'),
          description: t('launcher.tour.s5_desc'),
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#sidebar-series-gascii',
        popover: {
          title: t('launcher.tour.s6_title'),
          description: t('launcher.tour.s6_desc'),
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#quick-actions-panel',
        popover: {
          title: t('launcher.tour.s7_title'),
          description: t('launcher.tour.s7_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#hero-tab-launcher',
        popover: {
          title: t('launcher.tour.s8_title'),
          description: t('launcher.tour.s8_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#settings-install-path-card',
        popover: {
          title: t('launcher.tour.s9_title'),
          description: t('launcher.tour.s9_desc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#hero-tab-library',
        popover: {
          title: t('launcher.tour.s10_title'),
          description: t('launcher.tour.s10_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#library-table-container, #library-empty-state',
        popover: {
          title: t('launcher.tour.s11_title'),
          description: t('launcher.tour.s11_desc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#hero-tab-assets',
        popover: {
          title: t('launcher.tour.s12_title'),
          description: t('launcher.tour.s12_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#media-download-panel',
        popover: {
          title: t('launcher.tour.s13_title'),
          description: t('launcher.tour.s13_desc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#action-bar-play-btn',
        popover: {
          title: t('launcher.tour.s14_title'),
          description: t('launcher.tour.s14_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#action-bar-menu-btn',
        popover: {
          title: t('launcher.tour.s15_title'),
          description: t('launcher.tour.s15_desc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#social-links-toolbar',
        popover: {
          title: t('launcher.tour.s16_title'),
          description: t('launcher.tour.s16_desc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#social-links-toolbar',
        popover: {
          title: t('launcher.tour.s17_title'),
          description: t('launcher.tour.s17_desc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        popover: {
          title: t('launcher.tour.s18_title'),
          description: t('launcher.tour.s18_desc'),
          side: 'over',
          align: 'center',
        },
      },
    ];

    let driverObj: any;

    driverObj = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: t('launcher.tour.next'),
      prevBtnText: t('launcher.tour.prev'),
      doneBtnText: t('launcher.tour.done'),
      onHighlightStarted: (element, step, { state }) => {
        const index = state.activeIndex ?? 0;
        syncTourState(index);

        // When focusing dynamically-opened panels, wait for mount and refresh overlay position
        if ([8, 10, 12].includes(index)) {
          setTimeout(() => {
            driverObj?.refresh();
          }, 150);
        }
      },
      onHighlighted: (element, step, { state }) => {
        const index = state.activeIndex ?? 0;

        // Auto-advance steps when active action tabs are clicked
        if ([7, 9, 11].includes(index) && element) {
          const handler = () => {
            driverObj?.moveNext();
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
      },
      steps,
    });

    driverObj.drive();
  };

  return { startTour };
};
