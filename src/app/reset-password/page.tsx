import { Suspense } from "react"
import ResetPasswordPage from "./ResetPasswordPage"

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ResetPasswordPage />
    </Suspense>
  )
}
