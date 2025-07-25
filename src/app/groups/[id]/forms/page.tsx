"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Empty,
  Spin,
  App,
  DatePicker,
  Tooltip,
  Badge,
  Avatar,
  Dropdown,
  Modal,
  Form,
  Radio,
  Checkbox,
  Collapse,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  FormOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  SendOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { RangePickerProps } from "antd/es/date-picker";
import dayjs, { Dayjs } from "dayjs";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getGroupForms,
  FormWithDetails,
  FormSearchConditions,
  deleteForm,
  sendForm,
  SendFormRequest,
} from "@/lib/forms";
import {
  getAllClasses,
  ClassWithDetails,
  getClassMembers,
  ClassMemberWithDetails,
} from "@/lib/classes";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";

interface FormListItem extends FormWithDetails {
  progressRate: number;
  totalTargets: number;
  completedResponses: number;
  pendingResponses: number;
  actualStatus: "draft" | "sent" | "active" | "closed";
}

interface SendTarget {
  type: "individual" | "class";
  id: string;
  name: string;
}

interface IndividualWithClass extends GroupMemberWithDetails {
  belongsToClass: ClassWithDetails | null;
}

interface SendFormModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (targets: SendTarget[]) => void;
  formTitle: string;
  loading: boolean;
}

// 전송 모달 컴포넌트
function SendFormModal({ open, onCancel, onConfirm, formTitle, loading }: SendFormModalProps) {
  const [form] = Form.useForm();
  const [targetType, setTargetType] = useState<"individual" | "class">("class");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [classMembers, setClassMembers] = useState<{ [classId: string]: ClassMemberWithDetails[] }>(
    {}
  );
  const [individuals, setIndividuals] = useState<GroupMemberWithDetails[]>([]);
  const [searchText, setSearchText] = useState("");
  const [alreadySentTargets, setAlreadySentTargets] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(false);
  const { message } = App.useApp();
  const params = useParams();
  const { user } = useAuth();
  const groupId = params.id as string;

  const loadTargets = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      setLoadingData(true);

      const [classResult, memberResult] = await Promise.all([
        getAllClasses(groupId, user.id),
        getGroupMembers(groupId, user.id),
      ]);

      if (classResult.success) {
        const classesData = classResult.data || [];
        setClasses(classesData);

        // 각 반의 구성원들 로드
        const memberPromises = classesData.map(async (cls) => {
          const membersResult = await getClassMembers(cls.id, user.id);
          return {
            classId: cls.id,
            members: membersResult.success ? membersResult.data || [] : [],
          };
        });

        const memberResults = await Promise.all(memberPromises);
        const membersMap: { [classId: string]: ClassMemberWithDetails[] } = {};
        memberResults.forEach(({ classId, members }) => {
          membersMap[classId] = members;
        });
        setClassMembers(membersMap);
      }

      if (memberResult.success) {
        setIndividuals(memberResult.data || []);
      }

      // TODO: 이미 전송된 대상 확인 로직 추가
      // const sentTargets = await getFormTargets(formId);
      // setAlreadySentTargets(new Set(sentTargets.map(t => t.target_id)));
    } catch (error) {
      console.error("대상 목록 로드 오류:", error);
      message.error("대상 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingData(false);
    }
  }, [groupId, user, message]);

  useEffect(() => {
    if (open) {
      loadTargets();
    }
  }, [open, loadTargets]);

  // 개별 사용자 필터링 (반 정보 포함)
  const filteredIndividuals = individuals.filter((individual) => {
    const name = individual.users?.name || "";
    const nickname = individual.users?.nickname || "";
    const email = individual.users?.email || "";

    if (!searchText) return true;

    return (
      name.toLowerCase().includes(searchText.toLowerCase()) ||
      nickname.toLowerCase().includes(searchText.toLowerCase()) ||
      email.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // 개별 사용자에게 반 정보 추가
  const individualsWithClass: IndividualWithClass[] = filteredIndividuals.map((individual) => {
    // 이 사용자가 속한 반 찾기
    let userClass: ClassWithDetails | null = null;
    for (const cls of classes) {
      const members = classMembers[cls.id] || [];
      if (members.some((member) => member.user_id === individual.user_id)) {
        userClass = cls;
        break;
      }
    }

    return {
      ...individual,
      belongsToClass: userClass,
    };
  });

  // 반별 필터링
  const filteredClasses = classes.filter((cls) => {
    if (!searchText) return true;
    return cls.name.toLowerCase().includes(searchText.toLowerCase());
  });

  // 반 전체 전송 핸들러
  const handleSendToWholeClass = (classId: string) => {
    const newTargets = [...selectedTargets];
    if (newTargets.includes(`class_${classId}`)) {
      // 이미 선택되어 있으면 제거
      const index = newTargets.indexOf(`class_${classId}`);
      newTargets.splice(index, 1);

      // 해당 반의 개별 구성원도 모두 제거
      const members = classMembers[classId] || [];
      members.forEach((member) => {
        const memberIndex = newTargets.indexOf(`user_${member.user_id || ""}`);
        if (memberIndex > -1) {
          newTargets.splice(memberIndex, 1);
        }
      });
    } else {
      // 선택되어 있지 않으면 추가
      newTargets.push(`class_${classId}`);

      // 해당 반의 개별 구성원들은 제거 (중복 방지)
      const members = classMembers[classId] || [];
      members.forEach((member) => {
        const memberIndex = newTargets.indexOf(`user_${member.user_id || ""}`);
        if (memberIndex > -1) {
          newTargets.splice(memberIndex, 1);
        }
      });
    }

    setSelectedTargets(newTargets);
  };

  // 개별 구성원 전송 핸들러
  const handleToggleIndividual = (userId: string, classId?: string) => {
    const newTargets = [...selectedTargets];
    const userTarget = `user_${userId}`;

    if (newTargets.includes(userTarget)) {
      // 이미 선택되어 있으면 제거
      const index = newTargets.indexOf(userTarget);
      newTargets.splice(index, 1);
    } else {
      // 선택되어 있지 않으면 추가
      newTargets.push(userTarget);

      // 만약 이 사용자가 속한 반 전체가 선택되어 있다면 반 전체 선택 해제
      if (classId) {
        const classTarget = `class_${classId}`;
        const classIndex = newTargets.indexOf(classTarget);
        if (classIndex > -1) {
          newTargets.splice(classIndex, 1);
        }
      }
    }

    setSelectedTargets(newTargets);
  };

  const handleConfirm = () => {
    if (selectedTargets.length === 0) {
      message.warning("전송할 대상을 선택해주세요.");
      return;
    }

    const targets: SendTarget[] = [];

    selectedTargets.forEach((target) => {
      if (target.startsWith("class_")) {
        const classId = target.replace("class_", "");
        const cls = classes.find((c) => c.id === classId);
        if (cls) {
          targets.push({ type: "class" as const, id: classId, name: cls.name });
        }
      } else if (target.startsWith("user_")) {
        const userId = target.replace("user_", "");
        const individual = individuals.find((i) => i.user_id === userId);
        if (individual && individual.user_id) {
          targets.push({
            type: "individual" as const,
            id: userId,
            name: individual.users?.name || "",
          });
        }
      }
    });

    onConfirm(targets);
  };

  const handleCancel = () => {
    setSelectedTargets([]);
    setTargetType("class");
    setSearchText("");
    setClasses([]);
    setClassMembers({});
    setIndividuals([]);
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="폼 전송"
      open={open}
      onCancel={handleCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText={`선택된 ${selectedTargets.length}개 대상에게 전송`}
      okButtonProps={{ disabled: selectedTargets.length === 0 }}
      cancelText="취소"
      width={800}
    >
      <div className="space-y-4">
        <div>
          <strong>전송할 폼:</strong> {formTitle}
        </div>

        {loadingData ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item label="전송 대상">
              <Radio.Group
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setSelectedTargets([]);
                  setSearchText("");
                }}
              >
                <Radio value="class">반별 전송</Radio>
                <Radio value="individual">개별 전송</Radio>
              </Radio.Group>
            </Form.Item>

            {/* 검색 입력 */}
            <Form.Item label="검색">
              <Input
                placeholder={
                  targetType === "class" ? "반 이름으로 검색" : "이름, 닉네임, 이메일로 검색"
                }
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Form.Item>

            {targetType === "class" ? (
              // 반별 전송 - 아코디언 형태
              <div>
                <div className="text-sm text-gray-500 mb-3">
                  총 {filteredClasses.length}개 반 • 선택된 대상: {selectedTargets.length}개
                </div>

                <Collapse
                  ghost
                  className="border rounded"
                  items={filteredClasses.map((cls) => {
                    const members = classMembers[cls.id] || [];
                    const isClassSelected = selectedTargets.includes(`class_${cls.id}`);
                    const selectedMembersCount = members.filter((member) =>
                      selectedTargets.includes(`user_${member.user_id || ""}`)
                    ).length;

                    return {
                      key: cls.id,
                      label: (
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="bg-blue-500">{cls.name.charAt(0)}</Avatar>
                            <div>
                              <div className="font-medium">{cls.name}</div>
                              <div className="text-xs text-gray-500">
                                구성원 {cls.memberCount || 0}명
                                {cls.description && ` • ${cls.description}`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {(isClassSelected || selectedMembersCount > 0) && (
                              <Badge count={isClassSelected ? "전체" : selectedMembersCount} />
                            )}
                            <Button
                              type={isClassSelected ? "primary" : "default"}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendToWholeClass(cls.id);
                              }}
                            >
                              {isClassSelected ? "선택됨" : "반 전체"}
                            </Button>
                          </div>
                        </div>
                      ),
                      children: (
                        <div className="space-y-2 pl-4">
                          {members.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">구성원이 없습니다.</div>
                          ) : (
                            members.map((member) => {
                              const userId = member.user_id || "";
                              const isSelected = selectedTargets.includes(`user_${userId}`);
                              const isDisabled = isClassSelected;

                              return (
                                <div
                                  key={userId}
                                  className={`flex items-center justify-between p-2 border rounded ${
                                    isDisabled ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Avatar size="small" className="bg-green-500">
                                      {(member.users?.name || "").charAt(0)}
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{member.users?.name}</div>
                                      <div className="text-xs text-gray-500">
                                        @{member.users?.nickname} • {member.users?.email}
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    type={isSelected ? "primary" : "default"}
                                    size="small"
                                    disabled={isDisabled}
                                    onClick={() => handleToggleIndividual(userId, cls.id)}
                                  >
                                    {isDisabled
                                      ? "반 전체 선택됨"
                                      : isSelected
                                      ? "선택됨"
                                      : "개별 전송"}
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            ) : (
              // 개별 전송
              <div>
                <div className="text-sm text-gray-500 mb-3">
                  총 {individualsWithClass.length}명 • 선택된 대상: {selectedTargets.length}개
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-3">
                  {individualsWithClass.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">검색 결과가 없습니다.</div>
                  ) : (
                    individualsWithClass.map((individual) => {
                      const userId = individual.user_id || "";
                      const isSelected = selectedTargets.includes(`user_${userId}`);
                      const isAlreadySent = alreadySentTargets.has(userId);

                      return (
                        <div
                          key={userId}
                          className={`flex items-center justify-between p-3 border rounded ${
                            isAlreadySent ? "bg-gray-50 border-gray-300" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="bg-green-500">
                              {(individual.users?.name || "").charAt(0)}
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`font-medium ${isAlreadySent ? "text-gray-500" : ""}`}
                                >
                                  {individual.users?.name}
                                </span>
                                {individual.belongsToClass && (
                                  <Tag color="blue">{individual.belongsToClass.name}</Tag>
                                )}
                                {isAlreadySent && <Tag color="green">전송완료</Tag>}
                              </div>
                              <div className="text-xs text-gray-500">
                                @{individual.users?.nickname} • {individual.users?.email}
                              </div>
                              <div className="text-xs text-gray-400">
                                역할: {individual.group_roles?.name}
                              </div>
                            </div>
                          </div>

                          <Button
                            type={isSelected ? "primary" : "default"}
                            size="small"
                            disabled={isAlreadySent}
                            onClick={() => handleToggleIndividual(userId)}
                          >
                            {isAlreadySent ? "전송완료" : isSelected ? "선택됨" : "개별 전송"}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </Form>
        )}

        <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
          <div className="flex items-center space-x-2">
            <ExclamationCircleOutlined className="text-yellow-600" />
            <span className="text-sm">
              폼을 전송하면 수정이 불가능합니다. 정말 전송하시겠습니까?
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function FormsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { setPageHeader } = usePageHeader();

  const groupId = params.id as string;

  // State
  const [allForms, setAllForms] = useState<FormListItem[]>([]); // 전체 폼 데이터
  const [filteredForms, setFilteredForms] = useState<FormListItem[]>([]); // 필터링된 폼 데이터
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [tempSearchText, setTempSearchText] = useState(""); // 임시 검색어
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [creatorFilter, setCreatorFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // 전송 모달 관련
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedFormForSend, setSelectedFormForSend] = useState<FormListItem | null>(null);
  const [sendingForm, setSendingForm] = useState(false);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "폼 관리",
      subtitle: "그룹 내 모든 폼을 관리하고 진행 상황을 확인하세요",
      backUrl: `/groups/${groupId}`,
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId]);

  // 폼 상태 계산 함수
  const calculateActualStatus = (form: FormWithDetails): "draft" | "sent" | "active" | "closed" => {
    // 응답이 있으면서 완료된 응답이 있다면 active
    if (form.responses && form.responses.length > 0) {
      const hasCompleted = form.responses.some((r) => r.status === "completed");
      const hasActive = form.responses.some((r) => r.status === "active" || r.status === "pending");

      if (hasCompleted && !hasActive) return "closed";
      if (hasCompleted || hasActive) return "active";
    }

    // 타겟이 설정되어 있고 전송되었다면 sent
    if (form.targets && form.targets.length > 0 && form.status !== "draft") {
      return "sent";
    }

    // 기본적으로는 폼의 status를 따름
    if (form.status === "draft") return "draft";
    if (form.status === "closed") return "closed";

    return "draft"; // 기본값
  };

  // 폼 목록 조회 (서버에서 기본 데이터만 가져오기)
  const loadForms = useCallback(
    async (currentCreatorFilter?: string, currentDateRange?: [Dayjs, Dayjs] | null) => {
      if (!user || !groupId) return;

      try {
        setLoading(true);

        // 서버에서는 기본적인 조건만 사용 (actualStatus 필터링은 클라이언트에서)
        const conditions: FormSearchConditions = {};
        if (currentCreatorFilter) conditions.creatorId = currentCreatorFilter;
        if (currentDateRange) {
          conditions.createdAfter = currentDateRange[0].toISOString();
          conditions.createdBefore = currentDateRange[1].toISOString();
        }

        const result = await getGroupForms(groupId, conditions);

        if (result.success && result.data) {
          const formsWithProgress = result.data.map((form) => {
            const totalTargets = form.totalTargets || 0;
            const completedResponses = form.completedResponses || 0;
            const pendingResponses = totalTargets - completedResponses;
            const progressRate = totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0;
            const actualStatus = calculateActualStatus(form);

            return {
              ...form,
              progressRate,
              totalTargets,
              completedResponses,
              pendingResponses,
              actualStatus,
            } as FormListItem;
          });

          setAllForms(formsWithProgress);
        } else {
          message.error(result.error || "폼 목록 조회에 실패했습니다.");
        }
      } catch (error) {
        console.error("폼 조회 오류:", error);
        message.error("폼 목록 조회 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [user, groupId, message]
  );

  // 클라이언트 사이드 필터링
  const applyFilters = useCallback(() => {
    let filtered = [...allForms];

    // 검색어 필터링
    if (searchText.trim()) {
      filtered = filtered.filter(
        (form) =>
          form.title.toLowerCase().includes(searchText.toLowerCase()) ||
          (form.description && form.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // 상태 필터링
    if (statusFilter.length > 0) {
      filtered = filtered.filter((form) => statusFilter.includes(form.actualStatus));
    }

    setFilteredForms(filtered);
  }, [allForms, searchText, statusFilter]);

  // 검색 실행 (엔터키 또는 검색 버튼)
  const handleSearch = useCallback(() => {
    setSearchText(tempSearchText);
  }, [tempSearchText]);

  // 엔터키 처리
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchText("");
    setTempSearchText("");
    setStatusFilter([]);
    setCreatorFilter(undefined);
    setDateRange(null);
  };

  // DatePicker onChange 핸들러
  const handleDateRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    } else {
      setDateRange(null);
    }
  };

  // 폼 삭제
  const handleDeleteForm = useCallback(
    async (formId: string, formTitle: string) => {
      modal.confirm({
        title: "폼 삭제",
        content: `"${formTitle}" 폼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        okText: "삭제",
        okType: "danger",
        cancelText: "취소",
        onOk: async () => {
          try {
            const result = await deleteForm(formId, user!.id);
            if (result.success) {
              message.success("폼이 삭제되었습니다.");
              loadForms(creatorFilter, dateRange);
            } else {
              message.error(result.error || "폼 삭제에 실패했습니다.");
            }
          } catch (error) {
            message.error("폼 삭제 중 오류가 발생했습니다.");
          }
        },
      });
    },
    [modal, user, message, loadForms, creatorFilter, dateRange]
  );

  // 폼 전송 모달 열기
  const handleSendForm = (form: FormListItem) => {
    setSelectedFormForSend(form);
    setSendModalOpen(true);
  };

  // 폼 전송 확인 (임시 구현)
  const handleConfirmSend = async (targets: SendTarget[]) => {
    if (!selectedFormForSend) return;

    try {
      setSendingForm(true);

      // TODO: 실제 전송 API 구현 필요
      // const result = await sendFormToTargets(selectedFormForSend.id, targets, user!.id);

      // 임시로 성공 처리
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기

      message.success(`폼이 ${targets.length}개 대상에게 전송되었습니다.`);
      setSendModalOpen(false);
      setSelectedFormForSend(null);
      loadForms(creatorFilter, dateRange); // 목록 새로고침
    } catch (error) {
      message.error("폼 전송 중 오류가 발생했습니다.");
    } finally {
      setSendingForm(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadForms(creatorFilter, dateRange);
  }, [loadForms, creatorFilter, dateRange]);

  // 데이터가 변경되거나 필터가 변경될 때 필터링 적용
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 통계 계산
  const statistics = {
    totalForms: filteredForms.length,
    draftForms: filteredForms.filter((f) => f.actualStatus === "draft").length,
    sentForms: filteredForms.filter((f) => f.actualStatus === "sent").length,
    activeForms: filteredForms.filter((f) => f.actualStatus === "active").length,
    closedForms: filteredForms.filter((f) => f.actualStatus === "closed").length,
    averageProgress:
      filteredForms.length > 0
        ? filteredForms.reduce((sum, form) => sum + form.progressRate, 0) / filteredForms.length
        : 0,
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<FormListItem> = [
    {
      title: "폼 제목",
      dataIndex: "title",
      key: "title",
      fixed: "left",
      width: 300,
      render: (title: string, record: FormListItem) => (
        <div className="flex items-center space-x-3">
          <Avatar size="small" icon={<FormOutlined />} />
          <div>
            <div
              className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
              onClick={() => router.push(`/groups/${groupId}/forms/${record.id}`)}
            >
              {title}
            </div>
            {record.description && (
              <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "상태",
      key: "actualStatus",
      width: 100,
      render: (_, record: FormListItem) => {
        const statusConfig = {
          draft: { color: "default", text: "임시저장", icon: <ClockCircleOutlined /> },
          sent: { color: "blue", text: "전송됨", icon: <MailOutlined /> },
          active: { color: "green", text: "진행중", icon: <CheckCircleOutlined /> },
          closed: { color: "red", text: "완료", icon: <ExclamationCircleOutlined /> },
        };

        const config = statusConfig[record.actualStatus] || statusConfig.draft;

        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "진행률",
      key: "progress",
      width: 200,
      render: (_, record: FormListItem) => (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{record.progressRate.toFixed(0)}%</span>
            <span className="text-xs text-gray-500">
              {record.completedResponses}/{record.totalTargets}
            </span>
          </div>
          <Progress
            percent={record.progressRate}
            size="small"
            status={record.progressRate === 100 ? "success" : "active"}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">
            완료 {record.completedResponses}명 · 대기 {record.pendingResponses}명
          </div>
        </div>
      ),
    },
    {
      title: "대상",
      key: "targets",
      width: 120,
      render: (_, record: FormListItem) => (
        <div className="flex items-center space-x-1">
          <TeamOutlined className="text-gray-400" />
          <span className="font-medium">{record.totalTargets}</span>
          <span className="text-xs text-gray-500">명</span>
        </div>
      ),
    },
    {
      title: "생성자",
      key: "creator",
      width: 120,
      render: (_, record: FormListItem) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <span className="text-sm">{record.creator?.name}</span>
        </div>
      ),
    },
    {
      title: "생성일",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (date: string) => (
        <span className="text-sm text-gray-500">{dayjs(date).format("MM/DD")}</span>
      ),
    },
    {
      title: "작업",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_, record: FormListItem) => {
        const items = [
          {
            key: "view",
            label: "상세보기",
            icon: <EyeOutlined />,
            onClick: () => router.push(`/groups/${groupId}/forms/${record.id}`),
          },
          {
            key: "edit",
            label: "수정",
            icon: <EditOutlined />,
            disabled: record.actualStatus === "sent" || record.actualStatus === "closed",
            onClick: () => router.push(`/groups/${groupId}/forms/create?edit=${record.id}`), // ✅ 수정 URL
          },
          {
            key: "duplicate",
            label: "복제",
            icon: <CopyOutlined />,
            onClick: () => router.push(`/groups/${groupId}/forms/create?duplicate=${record.id}`), // ✅ 복제 URL
          },
          {
            key: "send",
            label: "전송",
            icon: <SendOutlined />,
            onClick: () => handleSendForm(record),
            disabled: record.actualStatus !== "draft", // 임시저장 상태에서만 전송 가능
          },
          {
            type: "divider" as const,
          },
          {
            key: "delete",
            label: "삭제",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteForm(record.id, record.title),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic title="전체 폼" value={statistics.totalForms} prefix={<FormOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic
              title="임시저장"
              value={statistics.draftForms}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#8c8c8c" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic
              title="전송됨"
              value={statistics.sentForms}
              prefix={<MailOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card>
            <Statistic
              title="진행중"
              value={statistics.activeForms}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="완료"
              value={statistics.closedForms}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
      </Row>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="폼 제목으로 검색"
              value={tempSearchText}
              onChange={(e) => setTempSearchText(e.target.value)}
              onSearch={handleSearch}
              onPressEnter={handleSearchKeyPress}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="상태 필터"
              value={statusFilter}
              onChange={setStatusFilter}
              mode="multiple"
              allowClear
              className="w-full"
            >
              <Select.Option value="draft">임시저장</Select.Option>
              <Select.Option value="sent">전송됨</Select.Option>
              <Select.Option value="active">진행중</Select.Option>
              <Select.Option value="closed">완료</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              placeholder={["시작일", "종료일"]}
              value={dateRange}
              onChange={handleDateRangeChange}
              className="w-full"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button icon={<FilterOutlined />} onClick={handleResetFilters}>
              필터 초기화
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(`/groups/${groupId}/forms/create`)}
              className="w-full"
            >
              새 폼 생성
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 폼 목록 테이블 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredForms}
          rowKey="id"
          pagination={{
            total: filteredForms.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="등록된 폼이 없습니다">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => router.push(`/groups/${groupId}/forms/create`)}
                >
                  첫 번째 폼 생성하기
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* 전송 모달 */}
      <SendFormModal
        open={sendModalOpen}
        onCancel={() => {
          setSendModalOpen(false);
          setSelectedFormForSend(null);
        }}
        onConfirm={handleConfirmSend}
        formTitle={selectedFormForSend?.title || ""}
        loading={sendingForm}
      />
    </div>
  );
}
