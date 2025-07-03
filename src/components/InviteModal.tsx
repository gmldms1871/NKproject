"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tabs,
  List,
  Avatar,
  Empty,
  Spin,
  Tag,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { searchUsers, findUserByIdentifier } from "@/lib/users";
import { inviteToGroup } from "@/lib/groups";
import { formatPhoneNumber } from "@/lib/phone-utils";

interface InviteModalProps {
  open: boolean;
  onCancel: () => void;
  groupId: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
  inviterId: string;
  onSuccess: () => void;
}

interface SearchedUser {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
}

export default function InviteModal({
  open,
  onCancel,
  groupId,
  roles,
  inviterId,
  onSuccess,
}: InviteModalProps) {
  const [activeTab, setActiveTab] = useState("search");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const [directForm] = Form.useForm();

  // 검색 결과 초기화
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole("");
      setActiveTab("search");
      directForm.resetFields();
    }
  }, [open, directForm]);

  // 사용자 검색
  const handleSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const result = await searchUsers(query);

      if (result.success) {
        setSearchResults(result.data || []);
      } else {
        message.error(result.error || "사용자 검색에 실패했습니다.");
        setSearchResults([]);
      }
    } catch (error) {
      message.error("사용자 검색 중 오류가 발생했습니다.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 검색어 변경 시 디바운싱된 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 사용자 선택
  const handleUserSelect = (user: SearchedUser) => {
    setSelectedUser(user);
  };

  // 검색된 사용자로 초대
  const handleInviteSearchedUser = async () => {
    if (!selectedUser || !selectedRole) {
      message.warning("사용자와 역할을 모두 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const result = await inviteToGroup({
        groupId,
        inviteeEmail: selectedUser.email,
        roleId: selectedRole,
        inviterId,
      });

      if (result.success) {
        message.success(`${selectedUser.nickname}님에게 초대를 전송했습니다!`);
        onSuccess();
        onCancel();
      } else {
        message.error(result.error || "초대 전송에 실패했습니다.");
      }
    } catch (error) {
      message.error("초대 전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 직접 입력으로 초대
  const handleDirectInvite = async (values: any) => {
    setLoading(true);
    try {
      const inviteData = {
        groupId,
        roleId: values.roleId,
        inviterId,
        ...(values.identifier.includes("@")
          ? { inviteeEmail: values.identifier }
          : { inviteePhone: values.identifier }),
      };

      const result = await inviteToGroup(inviteData);

      if (result.success) {
        message.success("초대를 전송했습니다!");
        onSuccess();
        onCancel();
      } else {
        message.error(result.error || "초대 전송에 실패했습니다.");
      }
    } catch (error) {
      message.error("초대 전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 전화번호 포맷팅 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    directForm.setFieldValue("identifier", formatted);
  };

  const searchTabContent = (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div>
        <Input
          placeholder="닉네임, 이메일, 전화번호로 검색"
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="large"
        />
      </div>

      {/* 검색 결과 */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {searchLoading ? (
          <div className="text-center py-8">
            <Spin />
            <p className="mt-2 text-gray-500">사용자를 검색하는 중...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <List
            dataSource={searchResults}
            renderItem={(user) => (
              <List.Item
                key={user.id}
                className={`cursor-pointer hover:bg-gray-50 rounded p-2 ${
                  selectedUser?.id === user.id ? "bg-blue-50 border border-blue-200" : ""
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{user.name}</span>
                      <Tag color="blue">@{user.nickname}</Tag>
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <MailOutlined />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <PhoneOutlined />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  }
                />
                {selectedUser?.id === user.id && (
                  <div className="text-blue-600">
                    <UserOutlined />
                  </div>
                )}
              </List.Item>
            )}
          />
        ) : searchQuery && !searchLoading ? (
          <Empty description="검색 결과가 없습니다." />
        ) : (
          <Empty description="사용자를 검색해보세요." />
        )}
      </div>

      {/* 선택된 사용자 및 역할 선택 */}
      {selectedUser && (
        <div className="border-t pt-4">
          <div className="bg-blue-50 p-3 rounded mb-3">
            <div className="flex items-center space-x-2">
              <Avatar icon={<UserOutlined />} />
              <div>
                <div className="font-medium">
                  {selectedUser.name} (@{selectedUser.nickname})
                </div>
                <div className="text-sm text-gray-600">{selectedUser.email}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">역할 선택</label>
              <Select
                placeholder="초대할 역할을 선택하세요"
                value={selectedRole}
                onChange={setSelectedRole}
                style={{ width: "100%" }}
                size="large"
              >
                {roles.map((role) => (
                  <Select.Option key={role.id} value={role.id}>
                    <TeamOutlined className="mr-2" />
                    {role.name}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              disabled={!selectedRole}
              onClick={handleInviteSearchedUser}
            >
              초대 보내기
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const directTabContent = (
    <Form form={directForm} layout="vertical" onFinish={handleDirectInvite}>
      <Form.Item
        name="identifier"
        label="이메일 또는 전화번호"
        rules={[
          { required: true, message: "이메일 또는 전화번호를 입력해주세요!" },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();

              const isEmail = value.includes("@");
              if (isEmail) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                  return Promise.reject(new Error("올바른 이메일 형식이 아닙니다!"));
                }
              } else {
                const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
                if (!phoneRegex.test(value)) {
                  return Promise.reject(new Error("010-1234-5678 형식으로 입력해주세요!"));
                }
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input
          placeholder="example@email.com 또는 010-1234-5678"
          prefix={<MailOutlined />}
          size="large"
          maxLength={50}
          onChange={(e) => {
            const value = e.target.value;
            // 전화번호인 경우 자동 포맷팅
            if (value && !value.includes("@") && /^\d/.test(value)) {
              handlePhoneChange(e);
            }
          }}
        />
      </Form.Item>

      <Form.Item
        name="roleId"
        label="역할"
        rules={[{ required: true, message: "역할을 선택해주세요!" }]}
      >
        <Select placeholder="초대할 역할을 선택하세요" size="large">
          {roles.map((role) => (
            <Select.Option key={role.id} value={role.id}>
              <TeamOutlined className="mr-2" />
              {role.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          초대 보내기
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    {
      key: "search",
      label: (
        <Space>
          <SearchOutlined />
          사용자 검색
        </Space>
      ),
      children: searchTabContent,
    },
    {
      key: "direct",
      label: (
        <Space>
          <MailOutlined />
          직접 입력
        </Space>
      ),
      children: directTabContent,
    },
  ];

  return (
    <Modal
      title="멤버 초대"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div className="mb-4">
        <p className="text-gray-600">
          그룹에 초대할 사용자를 검색하거나 이메일/전화번호를 직접 입력하세요.
        </p>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />

      <div className="mt-4 pt-4 border-t">
        <Space>
          <Button onClick={onCancel}>취소</Button>
        </Space>
      </div>
    </Modal>
  );
}
