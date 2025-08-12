import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Button,
  Form,
  Select,
  Space,
  Alert,
  Checkbox,
  List,
  Avatar,
  Typography,
  Spin,
  App,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { sendForm, SendFormRequest, updateReportsWithSupervision } from "@/lib/forms";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";
import { getAllClasses, ClassWithDetails } from "@/lib/classes";

const { Text } = Typography;

interface SendTarget {
  type: "user" | "class";
  id: string;
  name: string;
}

interface SendFormModalProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  groupId: string;
  onSuccess: () => void;
}

export default function SendFormModal({
  open,
  onClose,
  formId,
  groupId,
  onSuccess,
}: SendFormModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithDetails[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<SendTarget[]>([]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 그룹 멤버 로드
      const membersResult = await getGroupMembers(groupId, ""); // userId 추가
      if (membersResult.success && membersResult.data) {
        setGroupMembers(membersResult.data);
      }

      // 클래스 로드
      const classesResult = await getAllClasses(groupId, ""); // 올바른 파라미터 순서
      if (classesResult.success && classesResult.data) {
        setClasses(classesResult.data);
      }
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      message.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [groupId, message]); // useCallback 의존성 추가

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]); // loadData를 의존성에 추가

  // 개별 멤버 선택/해제
  const toggleMember = (member: GroupMemberWithDetails) => {
    const target: SendTarget = {
      type: "user",
      id: member.users.id,
      name: `${member.users.name} (${member.users.nickname})`,
    };

    setSelectedTargets((prev) => {
      const exists = prev.find((t) => t.type === "user" && t.id === member.users.id);
      if (exists) {
        return prev.filter((t) => !(t.type === "user" && t.id === member.users.id));
      } else {
        return [...prev, target];
      }
    });
  };

  // 클래스 선택/해제
  const toggleClass = (classItem: ClassWithDetails) => {
    const target: SendTarget = {
      type: "class",
      id: classItem.id,
      name: classItem.name,
    };

    setSelectedTargets((prev) => {
      const exists = prev.find((t) => t.type === "class" && t.id === classItem.id);
      if (exists) {
        return prev.filter((t) => !(t.type === "class" && t.id === classItem.id));
      } else {
        return [...prev, target];
      }
    });
  };

  // 폼 전송
  const handleSend = async () => {
    try {
      setSending(true);

      if (selectedTargets.length === 0) {
        message.warning("전송할 대상을 선택해주세요.");
        return;
      }

      // 🔧 폼 전송 전에 supervision 정보 업데이트
      const supervisionResult = await updateReportsWithSupervision(formId);
      if (!supervisionResult.success) {
        console.warn("Supervision 정보 업데이트 실패:", supervisionResult.error);
        // 계속 진행 (supervision 실패해도 폼 전송은 가능)
      }

      // 전송 요청 생성
      const sendRequest: SendFormRequest = {
        formId,
        targets: selectedTargets.map((target) => ({
          type: target.type,
          id: target.id,
        })),
      };

      const result = await sendForm(sendRequest);

      if (result.success) {
        message.success("폼이 성공적으로 전송되었습니다.");
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("폼 전송 오류:", error);
      message.error("폼 전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setSelectedTargets([]);
    form.resetFields();
    onClose();
  };

  if (loading) {
    return (
      <Modal title="폼 전송" open={open} onCancel={handleClose} footer={null} width={600}>
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="폼 전송"
      open={open}
      onCancel={handleClose}
      width={700}
      footer={
        <div className="flex justify-between">
          <Text type="secondary">선택된 대상: {selectedTargets.length}개</Text>
          <Space>
            <Button onClick={handleClose}>취소</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              disabled={selectedTargets.length === 0}
            >
              전송
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-6">
        <Alert
          message="폼 전송 안내"
          description="폼을 전송하면 선택된 대상자들이 폼을 받게 되며, 전송 후에는 폼을 수정할 수 없습니다. 신중히 검토 후 전송해주세요."
          type="warning"
          showIcon
        />

        {/* 선택된 대상 목록 */}
        {selectedTargets.length > 0 && (
          <div>
            <Text strong>선택된 대상:</Text>
            <div className="mt-2 space-y-1">
              {selectedTargets.map((target, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-blue-50 p-2 rounded"
                >
                  <Space>
                    {target.type === "user" ? (
                      <UserOutlined className="text-blue-500" />
                    ) : (
                      <TeamOutlined className="text-green-500" />
                    )}
                    <Text>{target.name}</Text>
                    <Text type="secondary">({target.type === "user" ? "개인" : "클래스"})</Text>
                  </Space>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => {
                      setSelectedTargets((prev) => prev.filter((_, i) => i !== index));
                    }}
                  >
                    제거
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 개별 멤버 선택 */}
        <div>
          <Text strong>개별 멤버 선택:</Text>
          <List
            className="mt-2"
            size="small"
            dataSource={groupMembers}
            renderItem={(member) => {
              const isSelected = selectedTargets.some(
                (t) => t.type === "user" && t.id === member.users.id
              );

              return (
                <List.Item
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                  onClick={() => toggleMember(member)}
                >
                  <List.Item.Meta
                    avatar={<Checkbox checked={isSelected} onChange={() => toggleMember(member)} />}
                    title={
                      <Space>
                        <Avatar icon={<UserOutlined />} size="small" />
                        {member.users.name}
                        <Text type="secondary">({member.users.nickname})</Text>
                      </Space>
                    }
                    description={`역할: ${member.group_roles?.name || "일반 멤버"}`}
                  />
                </List.Item>
              );
            }}
          />
        </div>

        {/* 클래스 선택 */}
        {classes.length > 0 && (
          <div>
            <Text strong>클래스 선택:</Text>
            <List
              className="mt-2"
              size="small"
              dataSource={classes}
              renderItem={(classItem) => {
                const isSelected = selectedTargets.some(
                  (t) => t.type === "class" && t.id === classItem.id
                );

                return (
                  <List.Item
                    className={`cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-green-50" : ""}`}
                    onClick={() => toggleClass(classItem)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Checkbox checked={isSelected} onChange={() => toggleClass(classItem)} />
                      }
                      title={
                        <Space>
                          <Avatar icon={<TeamOutlined />} size="small" />
                          {classItem.name}
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary">멤버 {classItem.memberCount || 0}명</Text>
                          {classItem.class_tags && classItem.class_tags.length > 0 && (
                            <span>
                              {classItem.class_tags.map((tag) => (
                                <Text key={tag.id} code style={{ fontSize: "11px" }}>
                                  {tag.name}
                                </Text>
                              ))}
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
