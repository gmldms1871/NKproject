"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  backUrl?: string;
  actions?: ReactNode;
  breadcrumb?: { title: string; href?: string }[];
}

interface PageHeaderContextType {
  pageHeader: PageHeaderProps | null;
  setPageHeader: (header: PageHeaderProps | null) => void;
  setTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: { title: string; href?: string }[]) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [pageHeader, setPageHeader] = useState<PageHeaderProps | null>(null);

  const setTitle = (title: string) => {
    setPageHeader((prev) => ({
      ...prev,
      title,
    }));
  };

  const setBreadcrumbs = (breadcrumbs: { title: string; href?: string }[]) => {
    setPageHeader((prev) => ({
      ...prev,
      breadcrumb: breadcrumbs,
    }));
  };

  return (
    <PageHeaderContext.Provider
      value={{
        pageHeader,
        setPageHeader,
        setTitle,
        setBreadcrumbs,
      }}
    >
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  return context;
}
