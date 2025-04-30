"use client"

import Link from "next/link"
import { 
  Home, 
  Users, 
  Settings, 
  FileText, 
  BarChart2, 
  CheckSquare, 
  PenSquare, 
  GraduationCap,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

interface HomeSidebarProps {
  role: string
  newReportsCount: number
  onCreateGroup: () => void
}

export function HomeSidebar({ role, newReportsCount, onCreateGroup }: HomeSidebarProps) {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path
  }
  
  const NavItem = ({ href, icon, label, badge = null, onClick = undefined }: {
    href: string
    icon: React.ReactNode
    label: string
    badge?: React.ReactNode
    onClick?: () => void
  }) => (
    <Button 
      variant={isActive(href) ? "secondary" : "ghost"} 
      className={cn(
        "w-full justify-start text-left font-normal mb-1 h-10",
        isActive(href) ? "bg-gray-100 hover:bg-gray-200" : ""
      )}
      asChild={!onClick}
      onClick={onClick}
    >
      {onClick ? (
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
          {badge}
        </div>
      ) : (
        <Link href={href} className="flex items-center gap-2 w-full">
          {icon}
          <span>{label}</span>
          {badge}
        </Link>
      )}
    </Button>
  )
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Profile Section */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-lg text-gray-800">NK Academy</h3>
        <p className="text-sm text-gray-500">{role} 대시보드</p>
      </div>
      
      {/* Navigation Section */}
      <div className="p-3">
        {/* Main Navigation - Same for all roles */}
        <div className="mb-4">
          <NavItem 
            href="/" 
            icon={<Home className="h-4 w-4 mr-1" />} 
            label="홈"
          />
        </div>
        
        {/* Role-specific Navigation */}
        {role === 'CEO' ? (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">관리</h4>
              <NavItem 
                href="/group/manage" 
                icon={<Users className="h-4 w-4 mr-1" />} 
                label="구성원 관리"
              />
              <NavItem 
                href="/settings" 
                icon={<Settings className="h-4 w-4 mr-1" />} 
                label="업무 항목 설정"
              />
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">데이터</h4>
              <NavItem 
                href="/reports" 
                icon={<FileText className="h-4 w-4 mr-1" />} 
                label="보고서 관리"
                badge={newReportsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {newReportsCount}
                  </span>
                )}
              />
              <NavItem 
                href="/statistics" 
                icon={<BarChart2 className="h-4 w-4 mr-1" />} 
                label="통계"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">업무</h4>
              <NavItem 
                href="/tasks" 
                icon={<CheckSquare className="h-4 w-4 mr-1" />} 
                label="업무 입력"
              />
              <NavItem 
                href="/reports/create" 
                icon={<PenSquare className="h-4 w-4 mr-1" />} 
                label="보고서 작성"
              />
            </div>
            
            {role === 'Teacher' && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">교육</h4>
                <NavItem 
                  href="/students" 
                  icon={<GraduationCap className="h-4 w-4 mr-1" />} 
                  label="학생 관리"
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="border-t border-gray-100 p-3 mt-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">빠른 작업</h4>
        {role === 'CEO' && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-between" 
            onClick={onCreateGroup}
          >
            <span>새 그룹 생성</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {role !== 'CEO' && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-between" 
            asChild
          >
            <Link href="/tasks/create">
              <span>빠른 업무 입력</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}