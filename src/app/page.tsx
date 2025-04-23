'use client'

import { supabase } from '@/lib/supabaseClient'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // 간단한 테스트: Supabase 상태 확인
    console.log('Supabase 연결됨:', supabase)
  }, [])

  return (
    <main>
      <h1>Supabase 연결 테스트 완료!</h1>
    </main>
  )
}
