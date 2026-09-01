'use client';

/**
 * The one piece of the brochure report that needs a browser.
 *
 * Printing is the primary path because it gives the reader their own dialogue
 * and their own paper size. Inside an iframe, or where the browser blocks it,
 * the server-rendered PDF is the fallback rather than a dead button.
 */
export function PrintBar({ pdfHref }: { pdfHref: string }) {
  const print = () => {
    try {
      if (window.self !== window.top) throw new Error('framed');
      window.print();
    } catch {
      window.location.href = pdfHref;
    }
  };

  return (
    <div
      className="rep-toolbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        padding: '10px 16px',
        background: 'rgba(22,36,46,.92)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <button
        type="button"
        onClick={print}
        style={{
          border: '1px solid rgba(255,255,255,.28)',
          background: 'transparent',
          color: '#fff',
          borderRadius: 999,
          padding: '8px 18px',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Print / save as PDF
      </button>
    </div>
  );
}
