'use client';

import { useEffect, useRef, useState } from 'react';
import AppointmentForm from './AppointmentForm';

/**
 * Compact call-to-action that opens the booking form in a dialog, so the form
 * no longer takes a screen's worth of space on the trip page.
 * Uses a native <dialog> for free focus trapping and Esc-to-close.
 */
export default function AppointmentModal({ tripSlug }: { tripSlug?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Keep state in sync when the browser closes it (Esc, backdrop form submit).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  return (
    <>
      <div className="panel cta apt-cta">
        <h3>Speak to our team</h3>
        <p>
          Every itinerary can be tailored to your dates, group size, budget and learning
          objectives. We come back to you within <strong>24 hours</strong>.
        </p>
        <button className="btn btn-brass" onClick={() => setOpen(true)}>
          Book an appointment <span className="arrow">→</span>
        </button>
        <div className="c">
          <div>
            <b>Call</b> +971 4 420 6965
          </div>
          <div>
            <b>Email</b> info@premiumchoicetravel.com
          </div>
        </div>
      </div>

      <dialog
        ref={ref}
        className="apt-dialog"
        aria-label="Book an appointment"
        onClick={(e) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (e.target === ref.current) setOpen(false);
        }}
      >
        <div className="apt-dialog-inner">
          <button className="apt-dialog-close" onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
          <span className="eyebrow">Book an appointment</span>
          <h3>Tell us about your trip</h3>
          <p className="apt-dialog-lede">
            Choose how you&apos;d like to meet and our Dubai team will be in touch within 24 hours.
          </p>
          {open && <AppointmentForm tripSlug={tripSlug} />}
        </div>
      </dialog>
    </>
  );
}
