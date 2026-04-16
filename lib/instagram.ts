import type { InstagramProfile, InstagramPost } from "./types";

// 인스타그램 계정명 정규화
export function normalizeUsername(input: string): string {
  let username = input.trim();
  const urlMatch = username.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (urlMatch) username = urlMatch[1];
  username = username.replace(/^@/, "");
  username = username.replace(/\/$/, "");
  return username.toLowerCase();
}

function parseCount(text: string): number {
  if (!text) return 0;
  text = text.replace(/,/g, "").trim();
  const lower = text.toLowerCase();
  if (lower.endsWith("m")) return Math.round(parseFloat(lower) * 1000000);
  if (lower.endsWith("k")) return Math.round(parseFloat(lower) * 1000);
  return parseInt(text) || 0;
}

// 인스타그램 웹 프로필 페이지에서 데이터 추출 (Playwright 없이 fetch만 사용)
export async function crawlInstagramProfile(
  username: string
): Promise<{ profile: InstagramProfile; posts: InstagramPost[] } | null> {
  try {
    // 방법 1: 인스타그램 웹 페이지의 meta 태그에서 정보 추출
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`[crawl] ${username}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // 404 체크
    if (html.includes("Sorry, this page isn") || html.includes("이 페이지는 사용할 수 없습니다")) {
      console.log(`[crawl] ${username}: 페이지 없음`);
      return null;
    }

    // og:description에서 팔로워/게시물 수 추출
    // 형식: "24K Followers, 1,000 Following, 234 Posts - ..."
    const ogDescMatch = html.match(
      /property="og:description"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:description"/
    );

    let followersCount = 0;
    let followingCount = 0;
    let postsCount = 0;
    let bioFromOg = "";

    if (ogDescMatch) {
      const desc = ogDescMatch[1];
      const followersMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      const followingMatch = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
      const postsMatch = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);

      if (followersMatch) followersCount = parseCount(followersMatch[1]);
      if (followingMatch) followingCount = parseCount(followingMatch[1]);
      if (postsMatch) postsCount = parseCount(postsMatch[1]);

      // 바이오: "Posts - " 뒤의 내용
      const bioMatch = desc.match(/Posts\s*-\s*([\s\S]*)/);
      if (bioMatch) bioFromOg = bioMatch[1].trim();
    }

    // og:title에서 이름 추출: "이름 (@username)"
    const ogTitleMatch = html.match(
      /property="og:title"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:title"/
    );

    let name = username;
    if (ogTitleMatch) {
      name = ogTitleMatch[1].replace(/\s*\(@[^)]+\).*/, "").trim();
    }

    // og:image에서 프로필 사진
    const ogImageMatch = html.match(
      /property="og:image"\s+content="([^"]+)"/
    ) || html.match(
      /content="([^"]+)"\s+property="og:image"/
    );
    const profilePic = ogImageMatch ? ogImageMatch[1] : "";

    // 인증 배지 확인
    const isVerified = html.includes('"is_verified":true');

    const profile: InstagramProfile = {
      username,
      name: name || username,
      profilePic,
      bio: bioFromOg || name,
      externalUrl: null,
      postsCount,
      followersCount,
      followingCount,
      isVerified,
    };

    // 게시물 썸네일은 fetch로는 가져오기 어려움 - 빈 배열 반환
    const posts: InstagramPost[] = [];

    console.log(
      `[crawl] ${username}: 팔로워 ${followersCount}, 게시물 ${postsCount}`
    );

    // 팔로워가 0이면 크롤링 실패로 간주
    if (followersCount === 0 && postsCount === 0) {
      console.log(`[crawl] ${username}: 데이터 파싱 실패 (로그인 필요할 수 있음)`);
      return null;
    }

    return { profile, posts };
  } catch (error) {
    console.error(`[crawl] ${username} 실패:`, error);
    return null;
  }
}
