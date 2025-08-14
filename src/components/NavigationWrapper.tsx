"use client";

import { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Badge, Avatar, Dropdown, Space, Button, App } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  BellOutlined,
  MailOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserAddOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { useNotification } from "@/contexts/notification-context";
import { signOut } from "@/lib/users";

const { Header, Content } = Layout;

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuth();
  const { pageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const { unreadCount, updateUnreadCount, setUnreadCount } = useNotification();
  const [signingOut, setSigningOut] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    await updateUnreadCount(user.id);
  }, [user, updateUnreadCount]);

  // 읽지 않은 알림 개수 조회
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // 5분마다 알림 개수 업데이트
      const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      // 사용자가 없으면 알림 개수 초기화
      setUnreadCount(0);
    }
  }, [loadUnreadCount, user, setUnreadCount]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return; // 중복 실행 방지

    setSigningOut(true);

    try {
      // 서버 측 로그아웃 처리
      const result = await signOut();

      if (result.success) {
        // 컨텍스트에서 사용자 정보 제거
        setUser(null);

        // 상태 초기화
        setUnreadCount(0);

        // 성공 메시지
        messageApi.success("안전하게 로그아웃되었습니다.");

        // 홈페이지로 리디렉션
        router.push("/");
      } else {
        // 서버 측 로그아웃 실패 시에도 클라이언트 정리
        setUser(null);
        setUnreadCount(0);

        messageApi.warning("로그아웃 처리 중 일부 문제가 발생했지만 로그아웃되었습니다.");
        router.push("/");
      }
    } catch (error) {
      // 에러 발생 시에도 클라이언트 세션 정리
      console.error("로그아웃 처리 중 오류:", error);

      setUser(null);
      setUnreadCount(0);

      messageApi.error("로그아웃 처리 중 오류가 발생했지만 로그아웃되었습니다.");
      router.push("/");
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, setUser, setUnreadCount, messageApi, router]);

  // 로그인이 필요한 페이지들
  const authRequiredPaths = ["/groups", "/invitations", "/notifications", "/mypage"];
  const isAuthRequired = authRequiredPaths.some((path) => pathname.startsWith(path));

  const menuItems: MenuProps["items"] = useMemo(() => {
    return user
      ? [
          {
            key: "/",
            icon: <HomeOutlined />,
            label: "홈",
          },
          {
            key: "/groups",
            icon: <TeamOutlined />,
            label: "그룹",
          },
          {
            key: "/invitations",
            icon: <MailOutlined />,
            label: "초대",
          },
          {
            key: "/notifications",
            icon:
              unreadCount > 0 ? (
                <Badge count={unreadCount} size="small">
                  <BellOutlined />
                </Badge>
              ) : (
                <BellOutlined />
              ),
            label: "알림",
          },
        ]
      : [
          {
            key: "/",
            icon: <HomeOutlined />,
            label: "홈",
          },
        ];
  }, [user, unreadCount]);

  const userMenuItems: MenuProps["items"] = useMemo(
    () => [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "프로필",
        onClick: () => router.push("/mypage"),
      },
      {
        type: "divider" as const,
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: signingOut ? "로그아웃 중..." : "로그아웃",
        onClick: handleSignOut,
        disabled: signingOut,
      },
    ],
    [signingOut, router, handleSignOut]
  );

  // 인증 페이지인 경우 네비게이션 숨김
  if (pathname === "/auth") {
    return <>{children}</>;
  }

  // 로그인이 필요한 페이지인데 로그인하지 않은 경우
  if (isAuthRequired && !user) {
    return <>{children}</>;
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Layout className="min-h-screen">
      {/* 메인 네비게이션 헤더 */}
      <Header className="bg-white border-b border-gray-200 px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          {/* 로고 및 메뉴 */}
          <div className="flex items-center space-x-8">
            <div
              className="text-xl font-bold text-gray-900 cursor-pointer"
              onClick={() => router.push("/")}
            >
              NK Project
            </div>

            {menuItems && (
              <Menu
                mode="horizontal"
                selectedKeys={[pathname.startsWith("/groups") ? "/groups" : pathname]}
                items={menuItems}
                onClick={handleMenuClick}
                className="border-none"
                style={{ minWidth: 0, flex: "auto" }}
              />
            )}
          </div>

          {/* 사용자 영역 */}
          <div className="flex items-center space-x-4">
            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
                <Space className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span className="text-gray-700">{user.name}</span>
                  {signingOut && <span className="text-gray-500 text-xs">(로그아웃 중)</span>}
                </Space>
              </Dropdown>
            ) : (
              <Space>
                <Button icon={<LoginOutlined />} onClick={() => router.push("/auth")}>
                  로그인
                </Button>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => router.push("/auth")}
                >
                  회원가입
                </Button>
              </Space>
            )}
          </div>
        </div>
      </Header>

      <Content>
        {/* 페이지별 헤더 */}
        {pageHeader && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {pageHeader.backUrl && (
                    <Button
                      icon={<ArrowLeftOutlined />}
                      onClick={() => router.push(pageHeader.backUrl!)}
                    >
                      뒤로 가기
                    </Button>
                  )}
                  <div>
                    {pageHeader.breadcrumb && (
                      <nav className="text-sm text-gray-500 mb-1">
                        {pageHeader.breadcrumb.map((crumb, index) => (
                          <span key={index}>
                            {crumb.href ? (
                              <button
                                onClick={() => router.push(crumb.href!)}
                                className="hover:text-gray-700"
                              >
                                {crumb.title}
                              </button>
                            ) : (
                              crumb.title
                            )}
                            {index < pageHeader.breadcrumb!.length - 1 && " > "}
                          </span>
                        ))}
                      </nav>
                    )}
                    {pageHeader.title && (
                      <h1 className="text-2xl font-bold text-gray-900">{pageHeader.title}</h1>
                    )}
                    {pageHeader.subtitle && (
                      <p className="text-gray-600 mt-1">{pageHeader.subtitle}</p>
                    )}
                  </div>
                </div>
                {pageHeader.actions && <div>{pageHeader.actions}</div>}
              </div>
            </div>
          </div>
        )}

        {/* 메인 컨텐츠 */}
        <div className={pageHeader ? "" : ""}>{children}</div>
      </Content>
    </Layout>
  );
}
