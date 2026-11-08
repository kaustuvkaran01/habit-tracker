import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createFirstUsePersistence } from '../data/first-use';

const persistence = createFirstUsePersistence(AsyncStorage);
export default function useFirstUse(hydrated: boolean, hasExistingData: boolean) {
  const [status, setStatus] = useState<'loading' | 'welcome' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [saving, setSaving] = useState(false), [attempt, setAttempt] = useState(0);
  const existing = useRef(hasExistingData), generation = useRef(0), lock = useRef(false), finished = useRef(false), mayFinish = useRef(false);
  existing.current = hasExistingData;
  useEffect(() => {
    if (!hydrated || finished.current) return;
    const current = ++generation.current;
    let cancelled = false;
    const active = () => !cancelled && generation.current === current;
    void (async () => {
      let stage: 'load' | 'save' = 'load';
      try {
        const completed = await persistence.completed();
        if (!active()) return;
        if (completed || existing.current) {
          // Existing installations never lose history or get treated as a new
          // account merely because this release introduces a welcome marker.
          if (!completed) { stage = 'save'; await persistence.complete(); }
          if (active()) { finished.current = true; setStatus('ready'); setError(null); }
        } else { mayFinish.current = true; setStatus('welcome'); setError(null); }
      } catch { if (active()) { setError(stage); setStatus('error'); } }
    })();
    return () => { cancelled = true; generation.current++; };
  }, [hydrated, attempt]);

  const finish = useCallback(async () => {
    if (lock.current || finished.current || !mayFinish.current) return false;
    lock.current = true; setSaving(true); setError(null);
    const current = generation.current;
    try {
      await persistence.complete();
      if (generation.current !== current) return false;
      finished.current = true; setStatus('ready'); return true;
    } catch { if (generation.current === current) setError('save'); return false; }
    finally { lock.current = false; if (generation.current === current) setSaving(false); }
  }, []);
  const retry = useCallback(() => {
    if (lock.current) return;
    mayFinish.current = false; setError(null); setStatus('loading'); setAttempt(value => value + 1);
  }, []);
  const continueForSession = useCallback(() => {
    if (lock.current) return;
    generation.current++; finished.current = true; setError(null); setStatus('ready');
  }, []);
  return { status, error, saving, finish, retry, continueForSession };
}
