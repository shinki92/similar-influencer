import { NextRequest, NextResponse } from "next/server";

// 인스타그램 이미지 프록시 (CORS 우회)
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 24시간 캐시
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
