import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConfigProvider, App } from "antd";
import koKR from "antd/locale/ko_KR";
import { AuthProvider } from "@/contexts/auth-context";
import { PageHeaderProvider } from "@/contexts/page-header-context";
import { NavigationWrapper } from "@/components/NavigationWrapper";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "보고서 관리 시스템",
  description: "그룹, 보고서 및 업무를 효율적으로 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ConfigProvider
          locale={koKR}
          theme={{
            token: {
              colorPrimary: "#1677ff",
              borderRadius: 6,
            },
          }}
        >
          <App>
            <AuthProvider>
              <PageHeaderProvider>
                <NavigationWrapper>{children}</NavigationWrapper>
              </PageHeaderProvider>
            </AuthProvider>
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
