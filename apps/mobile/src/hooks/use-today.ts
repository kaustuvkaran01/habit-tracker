import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, dateKey } from '../data/sample-habits';

export default function useToday() {
  const [today, setToday] = useState(() => addDays(new Date(), 0));
  useEffect(() => {
    function refresh() {
      const next = addDays(new Date(), 0);
      setToday((current) => dateKey(current) === dateKey(next) ? current : next);
    }
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, tomorrow.getTime() - now.getTime() + 500);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [today]);
  return today;
}
