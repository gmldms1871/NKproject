"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Form,
  Input,
  Button,
  Checkbox,
  Space,
  Badge,
  Alert,
  Modal,
  message,
  Divider,
  DatePicker,
  TimePicker,
  Switch,
  Select,
  Spin,
  Empty,
  Tag,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { getFormDetails, sendForm, FormWithDetails, SendFormRequest } from "@/lib/forms";
import { getAllClasses } from "@/lib/classes";
import { getGroupMembers } from "@/lib/groups";
import dayjs from "dayjs";

const { TextArea } = Input;

// 타입 정의
interface ClassInfo {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  tags: string[];
}

interface StudentInfo {
  id: string;
  name: string;
  nickname: string;
  className?: string;
}

interface SendFormValues {
  targetClasses: string[];
  targetStudents: string[];
  message?: string;
  deadline?: dayjs.Dayjs;
  deadlineTime?: dayjs.Dayjs;
  enableReminder: boolean;
  reminderBefore: number; // 마감 전 몇 시간 전에 알림
}

export default function FormSendPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;
  const formId = params.formId as string;

  // 상태 관리
  const [form] = Form.useForm();
  const [formDetails, setFormDetails] = useState<FormWithDetails | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<{
    classes: string[];
    students: string[];
  }>({ classes: [], students: [] });

  // 선택된 대상 통계
  const [targetStats, setTargetStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalRecipients: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadInitialData();
  }, [user, groupId, formId]);

  // 페이지 헤더 설정
  useEffect(() => {
    if (formDetails) {
      setPageHeader({
        title: "폼 전송",
        subtitle: `"${formDetails.title}" 폼을 대상자에게 전송합니다`,
        backUrl: `/groups/${groupId}/forms/${formId}`,
        breadcrumb: [
          { title: "그룹", href: "/groups" },
          { title: "그룹 상세", href: `/groups/${groupId}` },
          { title: "폼 관리", href: `/groups/${groupId}/forms` },
          { title: formDetails.title, href: `/groups/${groupId}/forms/${formId}` },
          { title: "전송" },
        ],
      });
    }

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, formId, formDetails]);

  // 초기 데이터 로드
  const loadInitialData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [formResult, classesResult, membersResult] = await Promise.all([
        getFormDetails(formId),
        getAllClasses(groupId, user.id),
        getGroupMembers(groupId, user.id),
      ]);

      if (formResult.success && formResult.data) {
        setFormDetails(formResult.data);
      }

      if (classesResult.success && classesResult.data) {
        // 클래스 정보를 변환
        const classInfo: ClassInfo[] = classesResult.data.map((cls) => ({
          id: cls.id,
          name: cls.name,
          description: cls.description === null ? undefined : cls.description,
          memberCount: cls.memberCount || 0,
          tags: cls.class_tags.map((tag) => tag.name),
        }));
        setClasses(classInfo);
      }

      if (membersResult.success && membersResult.data) {
        // 학생 정보 필터링
        const studentInfo: StudentInfo[] = membersResult.data
          .filter((member) => member.users?.education === "student")
          .map((member) => ({
            id: member.users!.id,
            name: member.users!.name,
            nickname: member.users!.nickname,
            // className은 실제로는 다른 방법으로 가져와야 함
          }));
        setStudents(studentInfo);
      }
    } catch (error) {
      message.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, formId]);

  // 대상 선택 업데이트
  useEffect(() => {
    const classCount = selectedTargets.classes.length;
    const studentCount = selectedTargets.students.length;

    // 선택된 반의 총 학생 수 계산
    const classStudentCount = selectedTargets.classes.reduce((total, classId) => {
      const classInfo = classes.find((c) => c.id === classId);
      return total + (classInfo?.memberCount || 0);
    }, 0);

    setTargetStats({
      totalClasses: classCount,
      totalStudents: studentCount,
      totalRecipients: classStudentCount + studentCount,
    });
  }, [selectedTargets, classes]);

  // 반 선택/해제
  const handleClassChange = (classIds: string[]) => {
    setSelectedTargets({
      ...selectedTargets,
      classes: classIds,
    });
  };

  // 개별 학생 선택/해제
  const handleStudentChange = (studentIds: string[]) => {
    setSelectedTargets({
      ...selectedTargets,
      students: studentIds,
    });
  };

  // 폼 전송
  const handleSendForm = async (values: SendFormValues) => {
    if (!user || !formDetails) return;

    if (targetStats.totalRecipients === 0) {
      message.error("전송할 대상을 선택해주세요.");
      return;
    }

    setSending(true);
    try {
      const targets = [
        ...selectedTargets.classes.map((classId) => ({
          type: "class" as const,
          id: classId,
        })),
        ...selectedTargets.students.map((studentId) => ({
          type: "individual" as const,
          id: studentId,
        })),
      ];

      const sendRequest: SendFormRequest = {
        formId,
        targets,
        message: values.message,
      };

      const result = await sendForm(sendRequest);

      if (result.success) {
        message.success("폼이 성공적으로 전송되었습니다!");
        router.push(`/groups/${groupId}/forms/${formId}/progress`);
      } else {
        message.error(result.error || "폼 전송에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 전송 미리보기
  const handlePreview = () => {
    if (targetStats.totalRecipients === 0) {
      message.error("전송할 대상을 선택해주세요.");
      return;
    }
    setPreviewVisible(true);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">폼 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!formDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Empty description="폼을 찾을 수 없습니다." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendForm}
          initialValues={{
            enableReminder: true,
            reminderBefore: 24,
          }}
        >
          {/* 폼 정보 요약 */}
          <Card title="전송할 폼 정보" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">{formDetails.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formDetails.description || "설명이 없습니다."}
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <Badge count={formDetails.questions.length} color="blue">
                    <span className="text-sm text-gray-500">질문 수</span>
                  </Badge>
                  <Badge count={formDetails.tags.length} color="green">
                    <span className="text-sm text-gray-500">태그 수</span>
                  </Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => router.push(`/groups/${groupId}/forms/${formId}`)}
                >
                  폼 미리보기
                </Button>
              </div>
            </div>
          </Card>

          {/* 수업시 세팅 */}
          <Card title="수업시 세팅" className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">문항 수</label>
                <div className="text-2xl font-bold">8개</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">예상 소요시간</label>
                <div className="text-2xl font-bold">10분</div>
              </div>

              <Divider />

              <Alert
                message="진행 세팅"
                description="반 단위로 진행하면 각 반의 구성원 전원에게 자동으로 배포됩니다."
                type="info"
                showIcon
              />
            </div>
          </Card>

          {/* 수업자 선택 */}
          <Card title="수업자 선택" className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 반별 선택 */}
              <div>
                <h4 className="font-medium mb-3">반별 선택</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {classes.map((classInfo) => (
                    <div
                      key={classInfo.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedTargets.classes.includes(classInfo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleClassChange([...selectedTargets.classes, classInfo.id]);
                            } else {
                              handleClassChange(
                                selectedTargets.classes.filter((id) => id !== classInfo.id)
                              );
                            }
                          }}
                        />
                        <div>
                          <div className="font-medium">{classInfo.name}</div>
                          <div className="text-sm text-gray-500">
                            담당: {classInfo.description || "담당자 미설정"} • 학생{" "}
                            {classInfo.memberCount}명
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge count={classInfo.memberCount} color="blue" />
                      </div>
                    </div>
                  ))}
                </div>

                {classes.length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="생성된 반이 없습니다" />
                )}
              </div>

              {/* 개별 학생 선택 */}
              <div>
                <h4 className="font-medium mb-3">개별 학생 선택</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {students.slice(0, 10).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedTargets.students.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleStudentChange([...selectedTargets.students, student.id]);
                            } else {
                              handleStudentChange(
                                selectedTargets.students.filter((id) => id !== student.id)
                              );
                            }
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <UserOutlined className="text-gray-400" />
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-500">
                              {student.nickname} {student.className && `• ${student.className}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {students.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="그룹에 학생이 없습니다"
                  />
                )}
              </div>
            </div>
          </Card>

          {/* 전송 요약 */}
          <Card title="전송 요약" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{targetStats.totalClasses}</div>
                <div className="text-sm text-gray-600">선택된 반</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{targetStats.totalStudents}</div>
                <div className="text-sm text-gray-600">개별 학생</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {targetStats.totalRecipients}
                </div>
                <div className="text-sm text-gray-600">총 수신자</div>
              </div>
            </div>

            {selectedTargets.classes.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">선택된 반:</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedTargets.classes.map((classId) => {
                    const classInfo = classes.find((c) => c.id === classId);
                    return classInfo ? (
                      <Tag key={classId} color="blue">
                        {classInfo.name} ({classInfo.memberCount}명)
                      </Tag>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {selectedTargets.students.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">선택된 학생:</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedTargets.students.map((studentId) => {
                    const student = students.find((s) => s.id === studentId);
                    return student ? (
                      <Tag key={studentId} color="green">
                        {student.name}
                      </Tag>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 전송 메시지 */}
          <Card title="전송 메시지" className="mb-6">
            <Form.Item name="message" label="안내 메시지 (선택사항)">
              <TextArea
                rows={3}
                placeholder="수신자에게 전달할 메시지를 입력하세요..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Alert
              message="전송 안내"
              description="폼이 전송되면 수정할 수 없습니다. 전송 전에 폼 내용을 다시 한 번 확인해주세요."
              type="warning"
              showIcon
              className="mt-4"
            />
          </Card>

          {/* 하단 버튼 */}
          <Card>
            <div className="flex justify-between items-center">
              <Button onClick={() => router.back()} size="large">
                취소
              </Button>

              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={handlePreview}
                  size="large"
                  disabled={targetStats.totalRecipients === 0}
                >
                  미리보기
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  htmlType="submit"
                  loading={sending}
                  size="large"
                  disabled={targetStats.totalRecipients === 0}
                >
                  폼 전송하기
                </Button>
              </Space>
            </div>
          </Card>
        </Form>

        {/* 전송 미리보기 모달 */}
        <Modal
          title="전송 미리보기"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setPreviewVisible(false)}>
              닫기
            </Button>,
            <Button
              key="send"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                setPreviewVisible(false);
                form.submit();
              }}
              loading={sending}
            >
              전송하기
            </Button>,
          ]}
          width={600}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">폼 제목</h4>
              <p>{formDetails.title}</p>
            </div>

            <div>
              <h4 className="font-medium">수신자</h4>
              <p>
                {targetStats.totalRecipients}명 (반 {targetStats.totalClasses}개, 개별{" "}
                {targetStats.totalStudents}명)
              </p>
            </div>

            <div>
              <h4 className="font-medium">전송 메시지</h4>
              <p>{form.getFieldValue("message") || "메시지가 없습니다."}</p>
            </div>

            <Alert
              message="전송 확인"
              description="위 내용으로 폼을 전송합니다. 전송 후에는 수정할 수 없습니다."
              type="info"
              showIcon
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}
