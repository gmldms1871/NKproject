"use client";

import { useState, useEffect, useCallback } from "react";
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
  Alert,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SearchOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { findUserByIdentifier } from "@/lib/users";
import { inviteToGroup, checkPendingInvitation } from "@/lib/groups";
import { formatPhoneNumber, validateFormattedPhone } from "@/lib/phone-utils";
import { validateEmail } from "@/lib/supabase";
import { Database } from "@/lib/types/types";

// 타입 정의
type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];

interface InviteModalProps {
  open: boolean;
  onCancel: () => void;
  groupId: string;
  roles: GroupRole[];
  inviterId: string;
  onSuccess: () => void;
}

interface SearchedUser {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  birth_date: string;
  education: string | null;
}

interface DirectInviteFormValues {
  identifier: string;
  roleId: string;
}

interface SearchInviteFormValues {
  identifier: string;
  roleId: string;
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
  const [foundUser, setFoundUser] = useState<SearchedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [pendingInvitation, setPendingInvitation] = useState(false);

  const [searchForm] = Form.useForm();

  // owner 역할을 제외한 역할들
  const availableRoles = roles.filter((role) => role.name !== "owner");

  // 검색 결과 초기화
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setFoundUser(null);
      setSelectedRole("");
      setPendingInvitation(false);
      setActiveTab("search");
      searchForm.resetFields();
    }
  }, [open, searchForm]);

  // 정확한 이메일/전화번호로 사용자 검색
  const handleExactSearch = useCallback(
    async (identifier: string) => {
      if (!identifier || identifier.trim().length === 0) {
        setFoundUser(null);
        setPendingInvitation(false);
        return;
      }

      const trimmedIdentifier = identifier.trim();

      // 이메일 또는 전화번호 형식 검증
      const isValidEmail = validateEmail(trimmedIdentifier);
      const isValidPhone = validateFormattedPhone(trimmedIdentifier);

      if (!isValidEmail && !isValidPhone) {
        setFoundUser(null);
        setPendingInvitation(false);
        return;
      }

      setSearchLoading(true);
      try {
        // 사용자 검색
        const userResult = await findUserByIdentifier(trimmedIdentifier);

        if (userResult.success && userResult.data) {
          const userData = userResult.data as SearchedUser;
          setFoundUser(userData);

          // 이미 초대된 사용자인지 확인
          const invitationResult = await checkPendingInvitation(
            groupId,
            isValidEmail ? trimmedIdentifier : undefined,
            isValidPhone ? trimmedIdentifier : undefined
          );

          if (invitationResult.success) {
            setPendingInvitation(invitationResult.data || false);
          }
        } else {
          setFoundUser(null);
          setPendingInvitation(false);
        }
      } catch (error) {
        console.error("사용자 검색 오류:", error);
        setFoundUser(null);
        setPendingInvitation(false);
      } finally {
        setSearchLoading(false);
      }
    },
    [groupId]
  );

  // 검색어 변경 시 디바운싱된 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      handleExactSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, groupId, handleExactSearch]);

  // 정확 검색으로 찾은 사용자 초대
  const handleInviteFoundUser = async () => {
    if (!foundUser || !selectedRole || pendingInvitation) {
      return;
    }

    setLoading(true);
    try {
      const isEmail = validateEmail(searchQuery.trim());

      const result = await inviteToGroup({
        groupId,
        inviteeEmail: isEmail ? foundUser.email : undefined,
        inviteePhone: !isEmail ? foundUser.phone : undefined,
        roleId: selectedRole,
        inviterId,
      });

      if (result.success) {
        message.success(`${foundUser.nickname}님에게 초대를 전송했습니다!`);
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
  const handleDirectInvite = async (values: DirectInviteFormValues) => {
    setLoading(true);
    try {
      // 중복 초대 확인
      const isEmail = validateEmail(values.identifier);
      const invitationResult = await checkPendingInvitation(
        groupId,
        isEmail ? values.identifier : undefined,
        !isEmail ? values.identifier : undefined
      );

      if (invitationResult.success && invitationResult.data) {
        message.warning("이미 해당 사용자에게 초대를 보냈습니다.");
        setLoading(false);
        return;
      }

      const inviteData = {
        groupId,
        roleId: values.roleId,
        inviterId,
        ...(isEmail ? { inviteeEmail: values.identifier } : { inviteePhone: values.identifier }),
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
    searchForm.setFieldValue("identifier", formatted);
  };

  const searchTabContent = (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div>
        <Input
          placeholder="정확한 이메일 또는 전화번호를 입력하세요"
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="large"
          maxLength={50}
        />
        <div className="text-xs text-gray-500 mt-1">예: example@email.com 또는 010-1234-5678</div>
      </div>

      {/* 검색 결과 */}
      <div style={{ minHeight: 200 }}>
        {searchLoading ? (
          <div className="text-center py-8">
            <Spin />
            <p className="mt-2 text-gray-500">사용자를 검색하는 중...</p>
          </div>
        ) : foundUser ? (
          <div className="border rounded-lg p-4 bg-blue-50">
            {pendingInvitation && (
              <Alert
                message="이미 초대된 사용자입니다"
                description="해당 사용자에게는 이미 초대를 보낸 상태입니다."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

            <div className="flex items-center space-x-3 mb-3">
              <Avatar size={48} icon={<UserOutlined />} />
              <div>
                <div className="font-medium text-lg">{foundUser.name}</div>
                <div className="text-sm text-gray-600">@{foundUser.nickname}</div>
              </div>
            </div>

            {!pendingInvitation && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">역할 선택</label>
                  <Select
                    placeholder="초대할 역할을 선택하세요"
                    value={selectedRole}
                    onChange={setSelectedRole}
                    style={{ width: "100%" }}
                    size="large"
                  >
                    역할 선택
                    {availableRoles.map((role) => (
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
                  onClick={handleInviteFoundUser}
                >
                  초대 보내기
                </Button>
              </div>
            )}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-8">
            <Empty
              description="해당하는 사용자를 찾을 수 없습니다."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <div className="text-xs text-gray-500 mt-2">
              정확한 이메일 주소나 전화번호를 입력해주세요.
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Empty
              description="정확한 이메일 또는 전화번호를 입력하세요."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </div>
    </div>
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
  ];

  return (
    <Modal
      title="멤버 초대"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <div className="mb-4">
        <p className="text-gray-600">
          그룹에 초대할 사용자의 정확한 이메일 주소나 전화번호를 입력하세요.
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
