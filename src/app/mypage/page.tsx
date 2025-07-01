"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Tabs,
  Button,
  Input,
  Form,
  Select,
  DatePicker,
  Modal,
  Descriptions,
  message,
  Space,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  LogoutOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import {
  updateProfile,
  resetPassword,
  deleteAccount,
  signOut,
  EDUCATION_LEVELS,
} from "@/lib/users";
import dayjs from "dayjs";

export default function MyPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [deleteForm] = Form.useForm();

  // 사용자 정보로 폼 초기화
  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        nickname: user.nickname,
        birth_date: user.birth_date ? dayjs(user.birth_date) : null,
        education: user.education,
      });
    }
  }, [user, profileForm]);

  // 로그인 확인
  useEffect(() => {
    if (!user) {
      router.push("/auth");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <Button type="primary" onClick={() => router.push("/auth")}>
              로그인 하러 가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 로그아웃 처리
  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      setUser(null);
      message.success("안전하게 로그아웃되었습니다.");
      router.push("/auth");
    }
  };

  // 프로필 수정 처리
  const handleUpdateProfile = async (values: any) => {
    setIsLoading(true);

    try {
      const result = await updateProfile(user.id, {
        nickname: values.nickname,
        birth_date: values.birth_date ? values.birth_date.format("YYYY-MM-DD") : undefined,
        education: values.education,
      });

      if (result.success && result.data) {
        setUser(result.data);
        message.success("프로필이 성공적으로 수정되었습니다.");
      } else {
        message.error(result.error || "프로필 수정에 실패했습니다.");
      }
    } catch (error) {
      message.error("프로필 수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 변경 처리
  const handleResetPassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(user.id, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result.success) {
        message.success("비밀번호가 성공적으로 변경되었습니다.");
        passwordForm.resetFields();
      } else {
        message.error(result.error || "비밀번호 변경에 실패했습니다.");
      }
    } catch (error) {
      message.error("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 계정 탈퇴 처리
  const handleDeleteAccount = async (values: any) => {
    if (values.confirmText !== "계정탈퇴") {
      message.error("'계정탈퇴'를 정확히 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteAccount(user.id, values.password);

      if (result.success) {
        setUser(null);
        message.success("계정이 성공적으로 탈퇴되었습니다.");
        router.push("/auth");
      } else {
        message.error(result.error || "계정 탈퇴에 실패했습니다.");
      }
    } catch (error) {
      message.error("계정 탈퇴 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setDeleteModalVisible(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <Card className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">마이페이지</h1>
              <p className="text-gray-600">안녕하세요, {user.name}님!</p>
            </div>
            <Button icon={<LogoutOutlined />} onClick={handleSignOut}>
              로그아웃
            </Button>
          </div>
        </Card>

        {/* 사용자 정보 카드 */}
        <Card
          title={
            <>
              <UserOutlined /> 내 정보
            </>
          }
          className="mb-6"
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="이메일" span={1}>
              {user.email}
            </Descriptions.Item>
            <Descriptions.Item label="전화번호" span={1}>
              {user.phone}
            </Descriptions.Item>
            <Descriptions.Item label="이름" span={1}>
              {user.name}
            </Descriptions.Item>
            <Descriptions.Item label="닉네임" span={1}>
              {user.nickname}
            </Descriptions.Item>
            <Descriptions.Item label="생년월일" span={1}>
              {user.birth_date}
            </Descriptions.Item>
            <Descriptions.Item label="교육 수준" span={1}>
              {user.education}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 설정 탭 */}
        <Card>
          <Tabs
            defaultActiveKey="profile"
            items={[
              {
                key: "profile",
                label: (
                  <>
                    <EditOutlined /> 프로필 수정
                  </>
                ),
                children: (
                  <div className="max-w-md">
                    <p className="text-gray-600 mb-4">
                      닉네임, 생년월일, 교육 수준을 수정할 수 있습니다.
                    </p>
                    <Form
                      form={profileForm}
                      onFinish={handleUpdateProfile}
                      layout="vertical"
                      size="large"
                    >
                      <Form.Item
                        name="nickname"
                        label="닉네임"
                        rules={[{ required: true, message: "닉네임을 입력해주세요!" }]}
                      >
                        <Input placeholder="닉네임" />
                      </Form.Item>

                      <Form.Item name="birth_date" label="생년월일">
                        <DatePicker
                          placeholder="생년월일 선택"
                          style={{ width: "100%" }}
                          format="YYYY-MM-DD"
                        />
                      </Form.Item>

                      <Form.Item name="education" label="교육 수준">
                        <Select placeholder="교육 수준을 선택하세요">
                          {Object.entries(EDUCATION_LEVELS).map(([key, value]) => (
                            <Select.Option key={key} value={value}>
                              {value as string}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isLoading}>
                          프로필 수정
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
              {
                key: "password",
                label: (
                  <>
                    <LockOutlined /> 비밀번호 변경
                  </>
                ),
                children: (
                  <div className="max-w-md">
                    <p className="text-gray-600 mb-4">
                      보안을 위해 정기적으로 비밀번호를 변경하세요.
                    </p>
                    <Form
                      form={passwordForm}
                      onFinish={handleResetPassword}
                      layout="vertical"
                      size="large"
                    >
                      <Form.Item
                        name="currentPassword"
                        label="현재 비밀번호"
                        rules={[{ required: true, message: "현재 비밀번호를 입력해주세요!" }]}
                      >
                        <Input.Password placeholder="현재 비밀번호" />
                      </Form.Item>

                      <Form.Item
                        name="newPassword"
                        label="새 비밀번호"
                        rules={[
                          { required: true, message: "새 비밀번호를 입력해주세요!" },
                          { min: 8, message: "비밀번호는 8자리 이상이어야 합니다!" },
                          {
                            pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
                            message: "영어와 숫자를 포함해야 합니다!",
                          },
                        ]}
                      >
                        <Input.Password placeholder="8자리 이상, 영어+숫자 포함" />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
                        label="새 비밀번호 확인"
                        rules={[{ required: true, message: "새 비밀번호를 다시 입력해주세요!" }]}
                      >
                        <Input.Password placeholder="새 비밀번호 확인" />
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isLoading}>
                          비밀번호 변경
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
              {
                key: "danger",
                label: (
                  <>
                    <DeleteOutlined /> 계정 관리
                  </>
                ),
                children: (
                  <div className="max-w-md">
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="text-lg font-semibold text-red-600 mb-2">위험 구역</h3>
                      <p className="text-sm text-red-600 mb-4">
                        이 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
                      </p>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setDeleteModalVisible(true)}
                      >
                        계정 탈퇴
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* 계정 탈퇴 모달 */}
        <Modal
          title="계정 탈퇴"
          open={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          footer={null}
          destroyOnClose
        >
          <div className="mb-4">
            <p className="text-gray-600 mb-2">정말로 계정을 탈퇴하시겠습니까?</p>
            <p className="text-sm text-red-600">
              이 작업은 되돌릴 수 없으며, 모든 데이터가 삭제됩니다.
            </p>
          </div>

          <Form form={deleteForm} onFinish={handleDeleteAccount} layout="vertical">
            <Form.Item
              name="password"
              label="비밀번호 확인"
              rules={[{ required: true, message: "비밀번호를 입력해주세요!" }]}
            >
              <Input.Password placeholder="계정 비밀번호 입력" />
            </Form.Item>

            <Form.Item
              name="confirmText"
              label={
                <>
                  확인을 위해 <strong>'계정탈퇴'</strong>를 입력하세요
                </>
              }
              rules={[
                { required: true, message: "'계정탈퇴'를 입력해주세요!" },
                {
                  validator: (_, value) => {
                    if (value === "계정탈퇴") {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("'계정탈퇴'를 정확히 입력해주세요!"));
                  },
                },
              ]}
            >
              <Input placeholder="계정탈퇴" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setDeleteModalVisible(false)}>취소</Button>
                <Button danger htmlType="submit" loading={isLoading}>
                  계정 탈퇴
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
