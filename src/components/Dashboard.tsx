"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Progress, Table, Spin, Empty } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  UserOutlined,
  TeamOutlined,
  FormOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { GroupStatistics } from "@/lib/statistics";

interface DashboardProps {
  groupId: string;
  userId: string;
  isOwner: boolean;
  activeTab: string;
}

export default function Dashboard({ groupId, userId, isOwner, activeTab }: DashboardProps) {
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;

    const loadStatistics = async () => {
      try {
        setLoading(true);
        const { getGroupStatistics } = await import("@/lib/statistics");
        const result = await getGroupStatistics(groupId, userId);

        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          setError(result.error || "통계를 불러오는데 실패했습니다.");
        }
      } catch (err) {
        setError("통계를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [groupId, userId, isOwner]);

  if (!isOwner) {
    return (
      <Card title="대시보드" className="mb-6">
        <Empty description="오너만 대시보드를 볼 수 있습니다." />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="대시보드" className="mb-6">
        <div className="text-center py-8">
          <Spin size="large" />
          <p className="mt-4 text-gray-500">통계를 불러오는 중...</p>
        </div>
      </Card>
    );
  }

  if (error || !statistics) {
    return (
      <Card title="대시보드" className="mb-6">
        <Empty description={error || "통계 데이터를 불러올 수 없습니다."} />
      </Card>
    );
  }

  // 대시보드 탭이 활성화되지 않았으면 차트를 렌더링하지 않음
  const isDashboardActive = activeTab === "dashboard";

  // 월별 통계 차트 데이터
  const monthlyChartData = statistics.monthlyStats.map((stat) => ({
    month: stat.month,
    "폼 생성": stat.formsCreated,
    "응답 수신": stat.responsesReceived,
    "보고서 완료": stat.reportsCompleted,
  }));

  // 역할별 통계 데이터 (파이 차트용)
  const roleChartData = statistics.roleStats.map((stat) => ({
    name: stat.roleName,
    value: stat.memberCount,
  }));

  // 차트 색상
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // 폼별 통계 테이블 컬럼
  const formColumns = [
    {
      title: "폼 제목",
      dataIndex: "formTitle",
      key: "formTitle",
    },
    {
      title: "응답 수",
      dataIndex: "totalResponses",
      key: "totalResponses",
      render: (value: number) => <span className="font-medium">{value}개</span>,
    },
    {
      title: "완료율",
      dataIndex: "completionRate",
      key: "completionRate",
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          status={value >= 80 ? "success" : value >= 50 ? "normal" : "exception"}
        />
      ),
    },
    {
      title: "평균 평점",
      dataIndex: "averageRating",
      key: "averageRating",
      render: (value: number | undefined) =>
        value ? (
          <span className="font-medium">{value}/5</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ];

  return (
    <Card title="대시보드" className="mb-6">
      {/* 기본 통계 카드 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 멤버"
              value={statistics.totalMembers}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 클래스"
              value={statistics.totalClasses}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 폼"
              value={statistics.totalForms}
              prefix={<FormOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 보고서"
              value={statistics.totalReports}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      {/* 폼 응답 및 보고서 통계 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="폼 응답 통계" className="h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>총 응답</span>
                <span className="font-medium">{statistics.formResponseStats.totalResponses}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span>완료된 응답</span>
                <span className="font-medium text-green-600">
                  {statistics.formResponseStats.completedResponses}개
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>대기 중인 응답</span>
                <span className="font-medium text-orange-600">
                  {statistics.formResponseStats.pendingResponses}개
                </span>
              </div>
              <div className="pt-2">
                <Progress
                  percent={statistics.formResponseStats.completionRate}
                  status={statistics.formResponseStats.completionRate >= 80 ? "success" : "normal"}
                  format={(percent) => `완료율: ${percent}%`}
                />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="보고서 통계" className="h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>총 보고서</span>
                <span className="font-medium">{statistics.reportStats.totalReports}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span>완료된 보고서</span>
                <span className="font-medium text-green-600">
                  {statistics.reportStats.completedReports}개
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>대기 중인 보고서</span>
                <span className="font-medium text-orange-600">
                  {statistics.reportStats.pendingReports}개
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>거부된 보고서</span>
                <span className="font-medium text-red-600">
                  {statistics.reportStats.rejectedReports}개
                </span>
              </div>
              <div className="pt-2">
                <Progress
                  percent={statistics.reportStats.completionRate}
                  status={statistics.reportStats.completionRate >= 80 ? "success" : "normal"}
                  format={(percent) => `완료율: ${percent}%`}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 월별 통계 차트 */}
      {isDashboardActive && (
        <Card title="월별 활동 통계" className="mb-6">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="폼 생성" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="응답 수신" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="보고서 완료" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 폼별 통계 */}
      {isDashboardActive && (
        <Card title="폼별 응답 통계" className="mb-6">
          {statistics.formStats.length > 0 ? (
            <div className="space-y-6">
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statistics.formStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="formTitle"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalResponses" fill="#8884d8" name="응답 수" />
                    <Bar dataKey="completionRate" fill="#82ca9d" name="완료율 (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table
                columns={formColumns}
                dataSource={statistics.formStats}
                rowKey="formId"
                pagination={false}
                size="small"
              />
            </div>
          ) : (
            <Empty description="폼 데이터가 없습니다." />
          )}
        </Card>
      )}

      {/* 역할별 통계 */}
      {isDashboardActive && (
        <Card title="역할별 멤버 통계" className="mb-6">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent || 0 * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </Card>
  );
}
