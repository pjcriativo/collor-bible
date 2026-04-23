import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "playing" | "paused";

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

/**
 * Wrapper leve sobre a Web Speech API (SpeechSynthesis) com escolha de voz
 * pt-BR quando disponível, controle de play/pause/stop e estado reativo.
 */
export function useSpeech(text: string, opts: UseSpeechOptions = {}) {
  const { lang = "pt-BR", rate = 0.88, pitch = 0.98 } = opts;
  const [status, setStatus] = useState<Status>("idle");
  const [supported, setSupported] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Detecta suporte e escolhe a melhor voz pt-BR disponível.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const naturalVoiceNames = [
        "google português",
        "microsoft maria",
        "microsoft francisca",
        "luciana",
        "português do brasil",
      ];
      const exactVoices = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
      const natural = exactVoices.find((v) =>
        naturalVoiceNames.some((name) => v.name.toLowerCase().includes(name)),
      );
      const exact = exactVoices[0];
      const prefix = voices.find((v) =>
        v.lang.toLowerCase().startsWith(lang.toLowerCase().split("-")[0]),
      );
      setVoice(natural ?? exact ?? prefix ?? voices[0]);
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [lang]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, [supported]);

  const play = useCallback(() => {
    if (!supported || !text.trim()) return;
    // Sempre cancela o que está tocando antes de começar.
    window.speechSynthesis.cancel();
    const naturalText = text
      .replace(/\.\s+/g, "... ")
      .replace(/!\s+/g, "! ... ")
      .replace(/\?\s+/g, "? ... ");
    const u = new SpeechSynthesisUtterance(naturalText);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? lang;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => {
      utteranceRef.current = null;
      setStatus("idle");
    };
    u.onerror = () => {
      utteranceRef.current = null;
      setStatus("idle");
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setStatus("playing");
  }, [supported, text, voice, lang, rate, pitch]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus("playing");
  }, [supported]);

  const toggle = useCallback(() => {
    if (status === "idle") play();
    else if (status === "playing") pause();
    else resume();
  }, [status, play, pause, resume]);

  // Para a fala ao desmontar / quando o texto muda.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  return { status, supported, play, pause, resume, stop, toggle };
}
