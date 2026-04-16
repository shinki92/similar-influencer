import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getLatestSearchResult, getSearchResultById } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bizCode = searchParams.get("bizCode");
    const searchId = searchParams.get("searchId");

    if (!bizCode) {
      return NextResponse.json(
        { error: "bizCode가 필요합니다." },
        { status: 400 }
      );
    }

    const data = searchId
      ? getSearchResultById(bizCode, searchId)
      : getLatestSearchResult(bizCode);

    if (!data?.results) {
      return NextResponse.json(
        { error: "검색 결과를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    interface ResultItem {
      profile: {
        username: string;
        name: string;
        bio: string;
        followersCount: number;
        followingCount: number;
        postsCount: number;
        isVerified: boolean;
        externalUrl: string | null;
      };
    }

    const results = data.results as ResultItem[];

    const rows = results.map((item) => ({
      계정명: `@${item.profile.username}`,
      이름: item.profile.name,
      바이오: item.profile.bio,
      팔로워: item.profile.followersCount,
      팔로잉: item.profile.followingCount,
      게시물수: item.profile.postsCount,
      인증여부: item.profile.isVerified ? "Y" : "N",
      외부링크: item.profile.externalUrl || "",
      프로필URL: `https://instagram.com/${item.profile.username}`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "유사 인플루언서");

    worksheet["!cols"] = [
      { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }, { wch: 35 },
    ];

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="similar_influencers_${data.username}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("엑셀 다운로드 오류:", error);
    return NextResponse.json(
      { error: "다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
