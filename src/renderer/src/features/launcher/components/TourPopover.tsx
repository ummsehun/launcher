import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTourStore } from '../stores/tourStore';


export const TourPopover: React.FC = () => {
  const { t } = useTranslation();
  const {
    isOpen,
    currentStep,
    totalSteps,
    targetRect,
    stepMetadata,
    next,
    prev,
    close,
  } = useTourStore();

  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Calculate coordinates dynamically based on targetRect and stepMetadata
  useEffect(() => {
    if (!isOpen || !stepMetadata) return;

    const calculatePosition = () => {
      const popoverEl = popoverRef.current;
      if (!popoverEl) return;

      const popoverWidth = 520; // Fixed width
      const popoverHeight = popoverEl.offsetHeight || 250;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default to center of screen (e.g., side: 'over' or no targetRect)
      let top = (viewportHeight - popoverHeight) / 2;
      let left = (viewportWidth - popoverWidth) / 2;

      if (targetRect) {
        const side = stepMetadata.side || 'bottom';
        const align = stepMetadata.align || 'center';

        // 1. Calculate base positions depending on the requested 'side'
        if (side === 'top') {
          top = targetRect.top - popoverHeight - 16;
          // Align horizontally
          if (align === 'start') {
            left = targetRect.left;
          } else if (align === 'end') {
            left = targetRect.right - popoverWidth;
          } else {
            left = targetRect.left + (targetRect.width - popoverWidth) / 2;
          }
        } else if (side === 'bottom') {
          top = targetRect.bottom + 16;
          // Align horizontally
          if (align === 'start') {
            left = targetRect.left;
          } else if (align === 'end') {
            left = targetRect.right - popoverWidth;
          } else {
            left = targetRect.left + (targetRect.width - popoverWidth) / 2;
          }
        } else if (side === 'left') {
          left = targetRect.left - popoverWidth - 16;
          // Align vertically
          if (align === 'start') {
            top = targetRect.top;
          } else if (align === 'end') {
            top = targetRect.bottom - popoverHeight;
          } else {
            top = targetRect.top + (targetRect.height - popoverHeight) / 2;
          }
        } else if (side === 'right') {
          left = targetRect.right + 16;
          // Align vertically
          if (align === 'start') {
            top = targetRect.top;
          } else if (align === 'end') {
            top = targetRect.bottom - popoverHeight;
          } else {
            top = targetRect.top + (targetRect.height - popoverHeight) / 2;
          }
        }
      }

      // 2. Bound checks: Ensure the popover does not bleed off-screen
      const margin = 16;
      left = Math.max(margin, Math.min(viewportWidth - popoverWidth - margin, left));
      top = Math.max(margin, Math.min(viewportHeight - popoverHeight - margin, top));

      setCoords({ top, left });
    };

    // Calculate immediately and also after a microtask to allow DOM layout
    calculatePosition();
    const timer = setTimeout(calculatePosition, 30);

    // Watch for window resize
    window.addEventListener('resize', calculatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, targetRect, stepMetadata, currentStep]);

  if (!isOpen || !stepMetadata) return null;

  const percent = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  // Use pre-formatted HTML / clean inline codes formatting inside translation description
  const renderDescription = (desc: string) => {
    // Basic formatting helper for <code> blocks and dividers inside i18n variables
    const parts = desc.split(/(<code>.*?<\/code>|---)/g);
    return parts.map((part, i) => {
      if (part === '---') {
        return <hr key={i} className="my-2.5 border-t border-launcher-divider/30" />;
      }
      if (part.startsWith('<code>') && part.endsWith('</code>')) {
        const cleanContent = part.replace(/<\/?code>/g, '');
        return (
          <code
            key={i}
            className="px-2 py-0.5 mx-0.5 rounded bg-launcher-control text-launcher-accent border border-launcher-divider font-mono text-[13px] font-semibold"
          >
            {cleanContent}
          </code>
        );
      }
      return part;
    });
  };

  return createPortal(
    <div
      style={{
        zIndex: 2147483647, // Max z-index to ensure it sits cleanly above driver.js overlay in the global stacking context
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()} // Prevent click events from bubbling up and triggering driver.js outside-click closing behavior
      className="custom-tour-popover fixed w-[520px] bg-launcher-panelStrongBg border border-launcher-panelStrongBorder text-launcher-text rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ease-out p-8"
    >
      {/* Tour Progress Bar */}
      <div className="absolute top-0 left-0 h-1 bg-launcher-accent shadow-glow transition-all duration-300" style={{ width: `${percent}%` }} />

      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-launcher-textMuted hover:text-launcher-text bg-transparent hover:bg-launcher-controlHover transition-all duration-150 border-none cursor-pointer"
        aria-label={t('launcher.tour.done')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Popover Content */}
      <div className="flex flex-col flex-1">
        <h3 className="text-launcher-text font-extrabold text-[20px] mb-3 tracking-tight leading-snug">
          {stepMetadata.title}
        </h3>
        <p className="text-launcher-textMuted text-[15px] leading-relaxed whitespace-pre-line font-medium">
          {renderDescription(stepMetadata.description)}
        </p>
      </div>

      {/* Footer / Buttons */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-launcher-divider">
        <span className="flex-1 text-[12px] font-bold text-launcher-textMuted tracking-wider">
          {currentStep + 1} / {totalSteps}
        </span>

        {/* Previous Button (Hide on first step) */}
        {currentStep > 0 && (
          <button
            onClick={prev}
            className="h-[44px] min-w-[110px] px-5 rounded-lg flex items-center justify-center font-bold text-[14px] bg-launcher-control border border-launcher-border text-launcher-textMuted hover:bg-launcher-controlHover hover:text-launcher-text transition-all duration-200 cursor-pointer"
          >
            {t('launcher.tour.prev')}
          </button>
        )}

        {/* Next / Done Button */}
        <button
          onClick={isLastStep ? close : next}
          className="h-[44px] min-w-[110px] px-5 rounded-lg flex items-center justify-center font-bold text-[14px] bg-launcher-accent border border-launcher-accent text-white hover:bg-launcher-accentHover hover:shadow-glow transition-all duration-200 cursor-pointer"
        >
          {isLastStep ? t('launcher.tour.done') : t('launcher.tour.next')}
        </button>
      </div>
    </div>,
    document.body
  );
};
