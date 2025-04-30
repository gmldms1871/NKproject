import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin.server";

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, signupPhone, nickname } = body;
    if (!name || !email || !password || !signupPhone || !nickname) {
      return NextResponse.json({ error: "필수 입력값이 부족합니다." }, { status: 400 })
    }

    // 1. Auth 회원가입
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone: signupPhone,
      email_confirm: true,
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    const userId = signUpData?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "유저 ID를 가져오지 못했습니다." }, { status: 500 })
    }

    // 2. public.users upsert
    const { error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        [{
          id: userId,
          email,
          name,
          phone: signupPhone,
          nick_name: nickname,
        }],
        { onConflict: "id" }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "회원가입 성공!" }, { status: 200 })

  } catch (error) {
    console.error("회원가입 오류:", error)
    return NextResponse.json({ error: "서버 에러가 발생했습니다." }, { status: 500 })
  }
}
