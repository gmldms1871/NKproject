"use client";

import { Button, Card, Descriptions, Layout, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

const { Content, Footer } = Layout;

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen">
      <Content className="flex-1">
        <div className="py-12 md:py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-5xl xl:text-6xl">
                    {user ? `환영합니다, ${user.name}님!` : "로그인하여주세요."}
                  </h1>
                  <p className="text-xl text-gray-600 max-w-2xl">
                    {user
                      ? "보고서 관리 시스템에서 그룹을 관리하고 보고서를 작성하세요."
                      : "보고서 관리 시스템에서 그룹을 관리하고 보고서를 작성하세요."}
                  </p>
                </div>

                <Space size="large">
                  {user ? (
                    <>
                      <Button type="primary" size="large" onClick={() => router.push("/mypage")}>
                        마이페이지 가기
                      </Button>
                      <Button size="large">보고서 관리</Button>
                    </>
                  ) : (
                    <>
                      <Button type="primary" size="large" onClick={() => router.push("/auth")}>
                        시작하기
                      </Button>
                      <Button size="large">더 알아보기</Button>
                    </>
                  )}
                </Space>
              </div>

              <div className="flex justify-center">
                {user && (
                  <Card title="내 정보" className="w-full max-w-md" extra={<UserOutlined />}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="이메일">{user.email}</Descriptions.Item>
                      <Descriptions.Item label="닉네임">{user.nickname}</Descriptions.Item>
                      <Descriptions.Item label="교육 수준">{user.education}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </Content>

      <Footer className="text-center bg-gray-50">
        <p className="text-gray-600">
          © {new Date().getFullYear()} Report Management System. All rights reserved.
        </p>
      </Footer>
    </Layout>
  );
}
