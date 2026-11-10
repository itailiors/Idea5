import { Mic, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isRecordingSupported, pickMimeType } from '../../lib/audio';
import { formatClock } from '../../lib/dates';
import { createTimer, getElapsedMs, pauseTimer, startTimer, type TimerState } from '../../lib/timer';

type RecState = 'idle' | 'starting' | 'recording' | 'paused';

interface Props {
  onClipReady: (blob: Blob, mimeType: string, durationSec: number) => void | Promise<void>;
}

/**
 * Native MediaRecorder wrapper: record → pause/resume → stop.
 * On stop (or if the component unmounts mid-recording) the clip is handed to onClipReady.
 */
export function AudioRecorder({ onClipReady }: Props) {
  const [state, setState] = useState<RecState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clockRef = useRef<TimerState>(createTimer());
  const onClipReadyRef = useRef(onClipReady);
  onClipReadyRef.current = onClipReady;

  // Re-render the duration display while recording.
  useEffect(() => {
    if (state !== 'recording') return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [state]);

  // If the user navigates away mid-recording, stop and keep the clip.
  useEffect(
    () => () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
    },
    [],
  );

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    if (!isRecordingSupported()) {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const durationSec = getElapsedMs(pauseTimer(clockRef.current, performance.now()), performance.now()) / 1000;
        chunksRef.current = [];
        recorderRef.current = null;
        releaseMic();
        clockRef.current = createTimer();
        setState('idle');
        if (blob.size > 0) void onClipReadyRef.current(blob, type.split(';')[0], durationSec);
      };
      rec.start(1000);
      recorderRef.current = rec;
      clockRef.current = startTimer(createTimer(), performance.now());
      setState('recording');
    } catch (err) {
      releaseMic();
      setState('idle');
      const name = (err as DOMException)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow it in your browser settings to record.'
          : name === 'NotFoundError'
            ? 'No microphone found.'
            : 'Could not start recording.',
      );
    }
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      rec.pause();
      clockRef.current = pauseTimer(clockRef.current, performance.now());
      setState('paused');
    } else if (rec.state === 'paused') {
      rec.resume();
      clockRef.current = startTimer(clockRef.current, performance.now());
      setState('recording');
    }
  };

  const stop = () => recorderRef.current?.stop();

  const elapsed = getElapsedMs(clockRef.current, performance.now()) / 1000;
  const active = state === 'recording' || state === 'paused';

  return (
    <section className="card flex flex-col gap-2 py-3">
      {active ? (
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full bg-red-500 ${state === 'recording' ? 'animate-pulse' : 'opacity-40'}`} aria-hidden />
          <span className="font-mono text-lg tabular-nums">{formatClock(elapsed)}</span>
          <span className="text-xs text-stone-500">{state === 'paused' ? 'Paused' : 'Recording…'}</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={togglePause} className="btn-ghost px-3" aria-label={state === 'paused' ? 'Resume recording' : 'Pause recording'}>
              {state === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button type="button" onClick={stop} className="btn bg-red-500 px-3 text-white hover:bg-red-600" aria-label="Stop recording">
              <Square className="h-4 w-4" fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startRecording} disabled={state === 'starting'} className="btn-ghost w-full">
          <Mic className="h-4 w-4 text-red-500" />
          {state === 'starting' ? 'Requesting microphone…' : 'Record a voice note'}
        </button>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
