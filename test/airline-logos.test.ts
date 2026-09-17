import { describe, expect, it } from 'vitest';
import { airlineCode, airlineLogoUrl } from '@/lib/brochure/proposal-schema';

describe('airlineCode', () => {
  it('reads the airline from the flight number', () => {
    expect(airlineCode({ flightNumber: 'EK 203', carrier: '' })).toBe('EK');
    expect(airlineCode({ flightNumber: 'LH631', carrier: '' })).toBe('LH');
    expect(airlineCode({ flightNumber: 'ek 5', carrier: '' })).toBe('EK');
    expect(airlineCode({ flightNumber: 'FZ-123', carrier: '' })).toBe('FZ');
    // Alphanumeric codes exist: IndiGo, Air Arabia.
    expect(airlineCode({ flightNumber: '6E 1234', carrier: '' })).toBe('6E');
    expect(airlineCode({ flightNumber: 'G9 401', carrier: '' })).toBe('G9');
  });

  it('falls back to the carrier name', () => {
    expect(airlineCode({ flightNumber: '', carrier: 'Emirates' })).toBe('EK');
    expect(airlineCode({ flightNumber: '', carrier: 'Lufthansa' })).toBe('LH');
    expect(airlineCode({ flightNumber: '', carrier: 'flydubai' })).toBe('FZ');
    expect(airlineCode({ flightNumber: '', carrier: 'Qatar Airways (QR)' })).toBe('QR');
  });

  it('prefers the flight number over the name', () => {
    expect(airlineCode({ flightNumber: 'QR 1001', carrier: 'Emirates' })).toBe('QR');
  });

  it('does not match a short name inside another word', () => {
    // "Lufthansa" must not become SAS or ANA.
    expect(airlineCode({ flightNumber: 'Lufthansa', carrier: 'Lufthansa' })).toBe('LH');
    expect(airlineCode({ flightNumber: '', carrier: 'Tapestry Air' })).toBeNull();
  });

  it('gives nothing for an unknown airline or an empty flight', () => {
    expect(airlineCode({ flightNumber: '', carrier: '' })).toBeNull();
    expect(airlineCode({ flightNumber: 'charter', carrier: 'School Charter Co' })).toBeNull();
  });
});

describe('airlineLogoUrl', () => {
  it('points at the logo service by code', () => {
    expect(airlineLogoUrl({ flightNumber: 'EK 203', carrier: 'Emirates' })).toBe('https://pics.avs.io/240/80/EK.png');
    expect(airlineLogoUrl({ flightNumber: '', carrier: '' })).toBeNull();
  });
});
