/**
 * A right arrow drawn as an SVG, for routes: "DXB → HEL".
 *
 * The typed arrow (U+2192) is not in the Latin subset Google serves for
 * Fraunces or Archivo, so on Vercel — where Chromium has no system font to
 * fall back on — it printed as an empty box. Up and down arrows are in the
 * subset; the right arrow, oddly, is not. A drawn arrow cannot go missing.
 *
 * Sized in ems so it follows whatever type it sits in, and marked decorative:
 * the accessible text is supplied by the caller where it matters.
 */
export default function Arrow({ label = 'to' }: { label?: string }) {
  return (
    <>
      <svg
        viewBox="0 0 24 12"
        width="1em"
        height=".5em"
        aria-hidden="true"
        focusable="false"
        style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 .18em', overflow: 'visible' }}
      >
        <path d="M0 6h21M16 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {` ${label} `}
      </span>
    </>
  );
}
