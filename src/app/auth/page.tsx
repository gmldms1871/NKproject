"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Tabs, Button, Input, Form, Select, DatePicker, message } from "antd";
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { signUp, signIn, EDUCATION_LEVELS } from "@/lib/users";
import { useAuth } from "@/contexts/auth-context";
import { formatPhoneNumber } from "@/lib/phone-utils";

export default function AuthPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signUpForm] = Form.useForm();
  const [signInForm] = Form.useForm();

  // 전화번호 자동 포맷팅 핸들러
  const handlePhoneChange =
    (formName: "signin" | "signup") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      if (formName === "signin") {
        signInForm.setFieldValue("identifier", formatted);
      } else {
        signUpForm.setFieldValue("phone", formatted);
      }
    };

  const handleSignUp = async (values: any) => {
    setIsLoading(true);

    try {
      const result = await signUp({
        email: values.email,
        password: values.password,
        name: values.name,
        nickname: values.nickname,
        phone: values.phone,
        birth_date: values.birth_date.format("YYYY-MM-DD"),
        education: values.education,
      });

      if (result.success) {
        message.success("회원가입이 완료되었습니다! 로그인해주세요.");
        signUpForm.resetFields();
      } else {
        message.error(result.error || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      message.error("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 처리
  const handleSignIn = async (values: any) => {
    setIsLoading(true);

    try {
      const result = await signIn({
        identifier: values.identifier,
        password: values.password,
      });

      if (result.success && result.data) {
        setUser(result.data);
        message.success(`환영합니다, ${result.data.name}님!`);
        router.push("/mypage");
      } else {
        message.error(result.error || "로그인에 실패했습니다.");
      }
    } catch (error) {
      message.error("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const tabItems = [
    {
      key: "signin",
      label: "로그인",
      children: (
        <Form
          form={signInForm}
          name="signin"
          onFinish={handleSignIn}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="identifier"
            label="이메일 또는 전화번호"
            rules={[{ required: true, message: "이메일 또는 전화번호를 입력해주세요!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="example@email.com 또는 010-1234-5678"
              maxLength={50}
              onChange={(e) => {
                const value = e.target.value;
                // 전화번호인 경우 자동 포맷팅
                if (value && !value.includes("@") && /^\d/.test(value)) {
                  handlePhoneChange("signin")(e);
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[{ required: true, message: "비밀번호를 입력해주세요!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              로그인
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "signup",
      label: "회원가입",
      children: (
        <Form
          form={signUpForm}
          name="signup"
          onFinish={handleSignUp}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: "이메일을 입력해주세요!" },
              { type: "email", message: "올바른 이메일 형식이 아닙니다!" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="example@email.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: "비밀번호를 입력해주세요!" },
              { min: 8, message: "비밀번호는 8자리 이상이어야 합니다!" },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
                message: "영어와 숫자를 포함해야 합니다!",
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="8자리 이상, 영어+숫자 포함" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="이름"
              rules={[{ required: true, message: "이름을 입력해주세요!" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="홍길동" />
            </Form.Item>

            <Form.Item
              name="nickname"
              label="닉네임"
              rules={[{ required: true, message: "닉네임을 입력해주세요!" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="길동이" />
            </Form.Item>
          </div>

          <Form.Item
            name="phone"
            label="전화번호"
            rules={[
              { required: true, message: "전화번호를 입력해주세요!" },
              {
                pattern: /^01[0-9]-\d{4}-\d{4}$/,
                message: "010-1234-5678 형식으로 입력해주세요!",
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="010-1234-5678"
              onChange={handlePhoneChange("signup")}
            />
          </Form.Item>

          <Form.Item
            name="birth_date"
            label="생년월일"
            rules={[{ required: true, message: "생년월일을 선택해주세요!" }]}
          >
            <DatePicker placeholder="생년월일 선택" style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="education"
            label="교육 수준"
            rules={[{ required: true, message: "교육 수준을 선택해주세요!" }]}
          >
            <Select placeholder="교육 수준을 선택하세요">
              {Object.entries(EDUCATION_LEVELS).map(([key, value]) => (
                <Select.Option key={key} value={value}>
                  {value as string}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              회원가입
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">보고서 관리 시스템</h2>
          <p className="text-sm text-gray-600">계정을 만들거나 로그인하세요</p>
        </div>

        <Card>
          <Tabs defaultActiveKey="signin" centered items={tabItems} />
        </Card>
      </div>
    </div>
  );
}
