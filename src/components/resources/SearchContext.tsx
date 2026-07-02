"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const ALL_FORMATS = "Todos";
export const ALL_ORIENTATIONS = "Todas";
export const ALL_APPS = "Todas";

interface ResourceSearchState {
  query: string;
  setQuery: (query: string) => void;
  format: string;
  setFormat: (format: string) => void;
  orientation: string;
  setOrientation: (orientation: string) => void;
  app: string;
  setApp: (app: string) => void;
}

const ResourceSearchContext = createContext<ResourceSearchState | null>(null);

export function ResourceSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState(ALL_FORMATS);
  const [orientation, setOrientation] = useState(ALL_ORIENTATIONS);
  const [app, setApp] = useState(ALL_APPS);

  return (
    <ResourceSearchContext.Provider
      value={{ query, setQuery, format, setFormat, orientation, setOrientation, app, setApp }}
    >
      {children}
    </ResourceSearchContext.Provider>
  );
}

export function useResourceSearch() {
  const context = useContext(ResourceSearchContext);
  if (!context) {
    throw new Error("useResourceSearch must be used within ResourceSearchProvider");
  }
  return context;
}
