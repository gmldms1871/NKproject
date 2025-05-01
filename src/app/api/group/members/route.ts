import { supabase } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { groupId, userId, role } = await req.json()
    
    // 필수 파라미터 확인
    if (!groupId || !userId || !role) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }
    
    // 1. 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증에 실패했습니다.' },
        { status: 401 }
      )
    }
    
    // 2. 그룹 확인 및 소유자 권한 체크
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single()
      
    if (groupError) {
      return NextResponse.json(
        { error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 3. 소유자 권한 확인 
    // (소유자 본인을 추가하는 경우 또는 소유자가 다른 사람을 추가하는 경우)
    const isOwner = groupData.owner_id === user.id
    const isAddingSelf = userId === user.id
    
    if (!isOwner && !(isAddingSelf && userId === groupData.owner_id)) {
      return NextResponse.json(
        { error: '이 작업을 수행할 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 4. 이미 추가되었는지 확인
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle()
      
    if (existingMember) {
      return NextResponse.json(
        { message: '이미 그룹에 등록된 사용자입니다.', success: true },
        { status: 200 }
      )
    }
    
    // 5. 멤버 추가
    const now = new Date().toISOString()
    const { data: memberData, error: insertError } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: userId,
        role: role,
        invited_at: now,
        accepted_at: isAddingSelf ? now : null // 자기 자신을 추가하는 경우 자동 승인
      }])
      .select()
      .single()
      
    if (insertError) {
      console.error('멤버 추가 실패:', insertError)
      return NextResponse.json(
        { error: '멤버 추가에 실패했습니다: ' + insertError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: '멤버가 성공적으로 추가되었습니다.',
      data: memberData,
      success: true
    })
    
  } catch (error) {
    console.error('예상치 못한 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}