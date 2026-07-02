"use client";

import { Column, Row } from "@once-ui-system/core";
import { Sidebar } from "@/components/resources/Sidebar";
import { ResourceSearchBar } from "@/components/resources/ResourceSearchBar";
import { ResourceSearchProvider } from "@/components/resources/SearchContext";

export default function RecursosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResourceSearchProvider>
      <Column fillWidth maxWidth="xl" paddingTop="32" paddingBottom="64" paddingX="24" gap="32" horizontal="center">
        <Row fillWidth gap="32" s={{ direction: "column" }}>
          <Sidebar />
          <Column flex={1} fillWidth gap="24">
            <ResourceSearchBar />
            {children}
          </Column>
        </Row>
      </Column>
    </ResourceSearchProvider>
  );
}
