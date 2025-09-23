"use client";

import React from "react";
import { ProjectList } from "../../refactored/presentation/components/projects/ProjectList";

interface ProjectsPageProps {
  onNavigate: (page: string) => void;
}

export function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ProjectList 
        showCreateButton={true}
        showFilters={true}
        showPagination={true}
        pageSize={12}
        className=""
      />
    </div>
  );
}