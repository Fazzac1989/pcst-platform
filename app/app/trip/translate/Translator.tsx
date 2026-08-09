'use client';

import { useEffect, useRef, useState } from 'react';

const LANGUAGES = [
  { name: 'English', code: 'en-GB' },
  { name: 'Arabic', code: 'ar-SA' },
  { name: 'Chinese (Mandarin)', code: 'zh-CN' },
  { name: 'Czech', code: 'cs-CZ' },
  { name: 'Dutch', code: 'nl-NL' },
  { name: 'French', code: 'fr-FR' },
  { name: 'German', code: 'de-DE' },
  { name: 'Greek', code: 'el-GR' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Icelandic', code: 'is-IS' },
  { name: 'Italian', code: 'it-IT' },
  { name: 'Japanese', code: 'ja-JP' },
  { name: 'Korean', code: 'ko-KR' },
  { name: 'Nepali', code: 'ne-NP' },
  { name: 'Portuguese', code: 'pt-PT' },
  { name: 'Spanish', code: 'es-ES' },
  { name: 'Swahili', code: 'sw-KE' },
  { name: 'Tagalog', code: 'fil-PH' },
  { name: 'Thai', code: 'th-TH' },
  { name: 'Turkish', code: 'tr-TR' },
  { name: 'Vietnamese', code: 'vi-VN' },
];

type Exchange = { id: number; original: string; translation: string; from: string; to: string };

function speak(text: string, langCode: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function Translator() {
  const [theirLang, setTheirLang] = useState('is-IS');
  const [myLang, setMyLang] = useState('en-GB');
  const [direction, setDirection] = useState<'in' | 'out'>('in'); // in: they speak → my language
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [typed, setTyped] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const recognitionRef = useRef<any>(null);
  const nextId = useRef(1);

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
  const sourceCode = direction === 'in' ? theirLang : myLang;
  const targetCode = direction === 'in' ? myLang : theirLang;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SR));
    // warm the voice list (loads async on some browsers)
    window.speechSynthesis?.getVoices();
    return () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function translate(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/app/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          sourceLang: langName(sourceCode),
          targetLang: langName(targetCode),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Translation failed.');
      setExchanges((xs) => [
        {
          id: nextId.current++,
          original: clean,
          translation: data.translation,
          from: langName(sourceCode),
          to: langName(targetCode),
        },
        ...xs,
      ]);
      speak(data.translation, targetCode);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }
    setError(null);
    setInterim('');
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = sourceCode;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = '';
    recognition.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      setInterim(finalText + interimText);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          setError(
            standalone
              ? 'Voice input is blocked in the installed app — open the trip in Safari or Chrome to use the microphone, or type below.'
              : 'Microphone access was blocked — allow it in your browser settings, or type below.'
          );
          break;
        case 'audio-capture':
          setError('No working microphone found — check it is not in use by another app, or type below.');
          break;
        case 'network':
          setError('The voice service could not be reached — check your connection, or type below.');
          break;
        case 'language-not-supported':
          setError(`This device cannot listen in ${langName(sourceCode)} — type it below instead.`);
          break;
        case 'no-speech':
          setError('Heard nothing — try again, a little closer to the phone.');
          break;
        case 'aborted':
          break;
        default:
          setError(`Voice input failed (${event.error}) — you can type below instead.`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) translate(finalText);
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if a session is already active or the device refuses
      setError('Could not start the microphone — wait a moment and tap again, or type below.');
    }
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
  }

  return (
    <div>
      <section className="papp-card">
        <div className="ptr-langs">
          <label>
            <span>{direction === 'in' ? 'They speak' : 'You speak'}</span>
            <select
              value={direction === 'in' ? theirLang : myLang}
              onChange={(e) => (direction === 'in' ? setTheirLang(e.target.value) : setMyLang(e.target.value))}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ptr-swap"
            onClick={() => setDirection(direction === 'in' ? 'out' : 'in')}
            title="Swap direction"
          >
            ⇄
          </button>
          <label>
            <span>Translate to</span>
            <select
              value={direction === 'in' ? myLang : theirLang}
              onChange={(e) => (direction === 'in' ? setMyLang(e.target.value) : setTheirLang(e.target.value))}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {speechSupported ? (
          <button
            className={`ptr-mic${listening ? ' listening' : ''}`}
            onClick={listening ? stopListening : startListening}
            disabled={busy}
          >
            {listening ? '⏹ Listening… tap when done' : busy ? 'Translating…' : `🎤 Tap & speak ${langName(sourceCode)}`}
          </button>
        ) : (
          <p className="ptr-note">
            Voice input isn&apos;t available in this browser — type instead below. (On iPhone, the
            Safari browser supports voice better than the home-screen app.)
          </p>
        )}
        {interim && <p className="ptr-interim">{interim}</p>}

        <form
          className="ptr-typed"
          onSubmit={(e) => {
            e.preventDefault();
            translate(typed);
            setTyped('');
          }}
        >
          <input
            placeholder={`…or type ${langName(sourceCode)} here`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-brass" disabled={busy || !typed.trim()}>
            →
          </button>
        </form>
        {error && <p className="papp-error">{error}</p>}
      </section>

      {exchanges.map((x) => (
        <section className="papp-card ptr-exchange" key={x.id}>
          <div className="ptr-original">
            <span>{x.from}</span>
            {x.original}
          </div>
          <div className="ptr-translation">
            <span>{x.to}</span>
            {x.translation}
            <button
              className="ptr-replay"
              onClick={() => speak(x.translation, LANGUAGES.find((l) => l.name === x.to)?.code ?? 'en-GB')}
              title="Play again"
            >
              🔊
            </button>
          </div>
        </section>
      ))}
      {exchanges.length === 0 && (
        <p className="papp-note">
          Point the phone at whoever is speaking, tap the button, and the translation appears here
          — spoken aloud and in writing. Use ⇄ to reply in their language.
        </p>
      )}
    </div>
  );
}
