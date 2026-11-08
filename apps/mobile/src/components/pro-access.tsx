import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { purchaseAdapter, type Entitlement } from '../data/pro-access';

const AccessContext = createContext<Entitlement>({ status: 'loading' });
export function ProAccessProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Entitlement>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    void purchaseAdapter.read().then(value => { if (active) setAccess(value); })
      .catch(() => { if (active) setAccess({ status: 'unavailable' }); });
    return () => { active = false; };
  }, []);
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}
export function useProAccess() { return useContext(AccessContext); }
