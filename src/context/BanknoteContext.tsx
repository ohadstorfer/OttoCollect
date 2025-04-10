
import { createContext, useContext, ReactNode } from "react";

interface BanknoteContextType {
  banknoteId: string | null;
}

const BanknoteContext = createContext<BanknoteContextType>({ banknoteId: null });

export function useBanknoteContext() {
  return useContext(BanknoteContext);
}

interface BanknoteProviderProps {
  children: ReactNode;
  banknoteId: string | null;
}

export function BanknoteProvider({ children, banknoteId }: BanknoteProviderProps) {
  return (
    <BanknoteContext.Provider value={{ banknoteId }}>
      {children}
    </BanknoteContext.Provider>
  );
}
