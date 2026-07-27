import { NextResponse } from "next/server";

// 진단용 임시 라우트였음 — 운영에서 더 이상 노출하지 않는다.
// (GitHub 웹 업로드로는 파일 삭제가 불가해 404 스텁으로 대체.
//  다음 작업 때 app/api/debug 폴더째 삭제할 것)
export async function GET() {
  return new NextResponse(null, { status: 404 });
}
