'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { applyBrochureSheetFits, compactBrochureSheets, measureBrochureSheets, refreshPhotoGrids } from '../lib/brochure-layout';
/** One fixed Letter sheet; only its outer scale responds to the workspace. */
export default function BrochurePreview({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const wrapper = container.current!;
    const observer = new ResizeObserver(() => setScale(Math.min(1, wrapper.clientWidth / 816)));
    observer.observe(wrapper); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false; const sheet = root.current!;
    async function prepare() {
      await Promise.all([
        document.fonts.load('400 12px "Listory Brochure Sans"'), document.fonts.load('700 12px "Listory Brochure Sans"'),
        document.fonts.load('400 12px "Listory Brochure Serif"'), document.fonts.load('italic 400 12px "Listory Brochure Serif"'), document.fonts.load('500 15px "Bodoni Moda"'),
        ...Array.from(sheet.querySelectorAll('img')).map(image => image.decode().catch(() => {})),
      ]);
      if (cancelled) return;
      refreshPhotoGrids(sheet);
      let fits = measureBrochureSheets(sheet);
      if (fits.some(fit => fit.scale < .8)) { compactBrochureSheets(fits, sheet); refreshPhotoGrids(sheet); fits = measureBrochureSheets(sheet); }
      applyBrochureSheetFits(fits, sheet);
    }
    void prepare(); return () => { cancelled = true; };
  }, [children]);
  return <div ref={container} className="brochure-preview-scale" style={{ height: 1056 * scale }}><div ref={root} className="brochure-preview-fixed" style={{ transform: `scale(${scale})` }}><div className="brochure-page-sheet"><div className="brochure-page-artwork">{children}</div></div></div></div>;
}
