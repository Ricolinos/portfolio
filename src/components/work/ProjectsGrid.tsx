"use client";

import { useMemo, useState } from "react";
import { Column, Grid, SegmentedControl } from "@once-ui-system/core";
import { ShotCard } from "@/components/work/ShotCard";
import { home } from "@/resources";
import type { getPosts } from "@/utils/utils";

const ALL = "Todos";

interface ProjectsGridProps {
  projects: ReturnType<typeof getPosts>;
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const categories = useMemo(() => {
    const tags = projects
      .map((project) => project.metadata.tag)
      .filter((tag): tag is string => Boolean(tag));
    return [ALL, ...Array.from(new Set(tags))];
  }, [projects]);

  const [selected, setSelected] = useState(ALL);

  const filtered =
    selected === ALL ? projects : projects.filter((project) => project.metadata.tag === selected);

  return (
    <Column fillWidth gap="24">
      <SegmentedControl
        selected={selected}
        onToggle={setSelected}
        buttons={categories.map((category) => ({ value: category, label: category }))}
      />
      <Grid columns="3" s={{ columns: 1 }} gap="24" fillWidth>
        {filtered.map((project, index) => (
          <ShotCard
            key={project.slug}
            priority={index < 3}
            href={`/work/${project.slug}`}
            image={project.metadata.images?.[0]}
            title={project.metadata.title}
            tag={project.metadata.tag}
            avatar={project.metadata.team?.[0]?.avatar}
            featured={`/work/${project.slug}` === home.featured.href}
          />
        ))}
      </Grid>
    </Column>
  );
}
