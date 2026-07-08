"use client";

import type { ReactNode } from "react";
import { Icon, Line, Row, ShineFx } from "@once-ui-system/core";

interface SearchBarShellProps {
  leading: ReactNode;
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export function SearchBarShell({ leading, query, onQueryChange, placeholder, ariaLabel }: SearchBarShellProps) {
  return (
    <Row
      fillWidth
      vertical="center"
      gap="12"
      radius="full"
      border="neutral-alpha-medium"
      background="neutral-alpha-weak"
      paddingX="16"
      paddingY="4"
    >
      {leading}
      <Line background="neutral-alpha-medium" vert maxHeight="20" />
      <Row style={{ position: "relative", flex: 1, minWidth: 0 }} vertical="center">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={ariaLabel}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            font: "inherit",
            fontSize: "var(--font-size-body-s)",
            width: "100%",
            minWidth: 0,
            height: "2.25rem",
          }}
        />
        {query.length === 0 && (
          <Row
            fillWidth
            vertical="center"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <Row hide="s" fillWidth style={{ minWidth: 0 }}>
              <ShineFx
                variant="body-default-s"
                onBackground="neutral-weak"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {placeholder}
              </ShineFx>
            </Row>
            <Row show="s">
              <ShineFx variant="body-default-s" onBackground="neutral-weak">
                Buscar…
              </ShineFx>
            </Row>
          </Row>
        )}
      </Row>
      <Icon name="search" size="s" onBackground="neutral-weak" />
    </Row>
  );
}
