"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Badge, Avatar, Dropdown, Space, Button } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  BellOutlined,
  MailOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/auth-context";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { signOut } from "@/lib/users";

const { Header, Content } = Layout;

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // 읽지 않은 알림 개수 조회
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // 5분마다 알림 개수 업데이트
      const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const result = await getUnreadNotificationCount(user.id);
      if (result.success) {
        setUnreadCount(result.data || 0);
      }
    } catch (error) {
      console.error("알림 개수 조회 실패:", error);
    }
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      setUser(null);
      router.push("/");
    }
  };

  // 로그인이 필요한 페이지들
  const authRequiredPaths = ["/groups", "/invitations", "/notifications", "/mypage"];
  const isAuthRequired = authRequiredPaths.some((path) => pathname.startsWith(path));

  // 인증 페이지인 경우 네비게이션 숨김
  if (pathname === "/auth") {
    return <>{children}</>;
  }

  // 로그인이 필요한 페이지인데 로그인하지 않은 경우
  if (isAuthRequired && !user) {
    return <>{children}</>;
  }

  const menuItems: MenuProps["items"] = user
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

  const userMenuItems: MenuProps["items"] = [
    {
      key: "mypage",
      icon: <UserOutlined />,
      label: "마이페이지",
      onClick: () => router.push("/mypage"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "로그아웃",
      onClick: handleSignOut,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white border-b border-gray-200 px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          {/* 로고 및 메뉴 */}
          <div className="flex items-center space-x-8">
            <div
              className="text-xl font-bold text-gray-900 cursor-pointer"
              onClick={() => router.push("/")}
            >
              Report Management System
            </div>

            {menuItems && (
              <Menu
                mode="horizontal"
                selectedKeys={[pathname]}
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

      <Content>{children}</Content>
    </Layout>
  );
}
