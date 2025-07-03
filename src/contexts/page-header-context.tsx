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
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [pageHeader, setPageHeader] = useState<PageHeaderProps | null>(null);

  return (
    <PageHeaderContext.Provider value={{ pageHeader, setPageHeader }}>
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
