import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addDays } from '../data/habit-calendar';

export default function useToday() {
  const [today, setToday] = useState(() => addDays(new Date(), 0));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime() + 500));
    }
    function refresh() {
      setToday(addDays(new Date(), 0));
      schedule();
    }
    schedule();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return today;
}
