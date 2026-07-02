"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const ALL_SPECIALTIES = "Todas";

interface ExploreSearchState {
  query: string;
  setQuery: (query: string) => void;
  specialty: string;
  setSpecialty: (specialty: string) => void;
}

const ExploreSearchContext = createContext<ExploreSearchState | null>(null);

export function ExploreSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState(ALL_SPECIALTIES);

  return (
    <ExploreSearchContext.Provider value={{ query, setQuery, specialty, setSpecialty }}>
      {children}
    </ExploreSearchContext.Provider>
  );
}

export function useExploreSearch() {
  const context = useContext(ExploreSearchContext);
  if (!context) {
    throw new Error("useExploreSearch must be used within ExploreSearchProvider");
  }
  return context;
}
