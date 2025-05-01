interface SettingsLayoutProps {
    children: React.ReactNode;
    params: {
      id: string;
    };
  }
  
  export default function SettingsLayout({ children, params }: SettingsLayoutProps) {
    const { id } = params;
    return (
      <div className="p-4">
        {/* 설정 탭 네비게이션 */}
        <nav className="mb-6 flex space-x-4">
          <a
            href={`/group/${id}/settings`}
            className="font-semibold text-gray-700 hover:text-gray-900"
          >
            기본 설정
          </a>
          <a
            href={`/group/${id}/settings/input-settings`}
            className="font-semibold text-gray-700 hover:text-gray-900"
          >
            입력 항목 설정
          </a>
          {/* 필요한 추가 탭 링크를 여기에 */}
        </nav>
  
        {/* 자식 페이지 렌더링 */}
        <div>{children}</div>
      </div>
    );
  }
  