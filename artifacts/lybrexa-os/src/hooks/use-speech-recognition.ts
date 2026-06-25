import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechState = "idle" | "listening" | "processing" | "error" | "unsupported";

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((this: SpeechRecognitionInstance) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as Record<string, unknown>).SpeechRecognition as SpeechRecognitionConstructor
    ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition as SpeechRecognitionConstructor
    ?? null;
}

interface UseSpeechRecognitionOptions {
  onTranscript?: (text: string) => void;
  onInterim?: (text: string) => void;
  language?: string;
  continuous?: boolean;
}

export function useSpeechRecognition({
  onTranscript,
  onInterim,
  language = "en-US",
  continuous = false,
}: UseSpeechRecognitionOptions = {}) {
  const [state, setState] = useState<SpeechState>(() =>
    getSpeechRecognitionAPI() ? "idle" : "unsupported"
  );
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef("");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const start = useCallback(() => {
    const API = getSpeechRecognitionAPI();
    if (!API) { setState("unsupported"); return; }

    recognitionRef.current?.abort();
    finalTextRef.current = "";
    setInterimText("");
    setErrorMessage(null);

    const recognition = new API();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setState("listening");

    recognition.onresult = (event) => {
      let interim = "";
      let final = finalTextRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += (final ? " " : "") + result[0].transcript.trim();
        } else {
          interim += result[0].transcript;
        }
      }
      finalTextRef.current = final;
      setInterimText(interim);
      onInterim?.(interim);
    };

    recognition.onerror = (event) => {
      const msg =
        event.error === "no-speech" ? "No speech detected" :
        event.error === "not-allowed" ? "Microphone access denied" :
        event.error === "network" ? "Network error" :
        `Recognition error: ${event.error}`;
      setErrorMessage(msg);
      setState("error");
    };

    recognition.onend = () => {
      const text = finalTextRef.current.trim();
      setInterimText("");
      if (stateRef.current !== "error") {
        setState("processing");
        setTimeout(() => {
          if (text) onTranscript?.(text);
          setState("idle");
        }, 100);
      }
    };

    recognition.start();
  }, [language, continuous, onTranscript, onInterim]);

  const stop = useCallback(() => { recognitionRef.current?.stop(); }, []);

  const abort = useCallback(() => {
    recognitionRef.current?.abort();
    setInterimText("");
    setState("idle");
    setErrorMessage(null);
  }, []);

  return {
    state,
    interimText,
    errorMessage,
    isListening: state === "listening",
    isUnsupported: state === "unsupported",
    start,
    stop,
    abort,
  };
}
