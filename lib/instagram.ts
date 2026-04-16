import { chromium } from "playwright";
import type { InstagramProfile, InstagramPost } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function parseCount(text: string): number {
  if (!text) return 0;
  text = text.replace(/,/g, "").trim();
  const lower = text.toLowerCase();
  if (lower.includes("만") || lower.endsWith("m")) {
    return Math.round(parseFloat(lower.replace(/[만m]/g, "")) * 10000);
  }
  if (lower.includes("천") || lower.endsWith("k")) {
    return Math.round(parseFloat(lower.replace(/[천k]/g, "")) * 1000);
  }
  return parseInt(text) || 0;
}

// 인스타그램 계정명 정규화
export function normalizeUsername(input: string): string {
  let username = input.trim();
  // URL에서 추출
  const urlMatch = username.match(
    /instagram\.com\/([a-zA-Z0-9._]+)/
  );
  if (urlMatch) username = urlMatch[1];
  // @제거
  username = username.replace(/^@/, "");
  // 후행 슬래시 제거
  username = username.replace(/\/$/, "");
  return username.toLowerCase();
}

export async function crawlInstagramProfile(
  username: string
): Promise<{ profile: InstagramProfile; posts: InstagramPost[] } | null> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: randomUA(),
      viewport: { width: 1280, height: 800 },
      locale: "ko-KR",
    });

    const page = await context.newPage();

    // 인스타그램 프로필 페이지 접근
    const response = await page.goto(
      `https://www.instagram.com/${username}/`,
      { waitUntil: "networkidle", timeout: 15000 }
    );

    if (!response || response.status() === 404) {
      return null;
    }

    // 로그인 팝업이 뜨면 닫기
    try {
      const notNowBtn = page.locator('button:has-text("Not Now"), button:has-text("나중에 하기")');
      await notNowBtn.click({ timeout: 3000 });
    } catch {
      // 팝업이 없으면 무시
    }

    await page.waitForTimeout(2000);

    // 메타 태그에서 정보 추출 (더 안정적)
    const metaDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content")
      .catch(() => "");

    const metaTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content")
      .catch(() => username);

    const profilePic = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content")
      .catch(() => "");

    // 메타 디스크립션에서 팔로워/팔로잉/게시물 수 파싱
    // 형식: "팔로워 1.2만명, 팔로잉 212명, 게시물 82개..."
    let followersCount = 0;
    let followingCount = 0;
    let postsCount = 0;

    if (metaDescription) {
      const followersMatch = metaDescription.match(
        /(?:Followers|팔로워)\s*([\d,.만천k]+)/i
      );
      const followingMatch = metaDescription.match(
        /(?:Following|팔로잉)\s*([\d,.만천k]+)/i
      );
      const postsMatch = metaDescription.match(
        /(?:Posts|게시물)\s*([\d,.만천k]+)/i
      );

      if (followersMatch) followersCount = parseCount(followersMatch[1]);
      if (followingMatch) followingCount = parseCount(followingMatch[1]);
      if (postsMatch) postsCount = parseCount(postsMatch[1]);
    }

    // 바이오 텍스트 추출
    const bio = await page
      .locator("section header section span")
      .first()
      .textContent()
      .catch(() => "");

    // 외부 링크 추출
    const externalUrl = await page
      .locator('a[rel="me nofollow noopener noreferrer"]')
      .first()
      .getAttribute("href")
      .catch(() => null);

    // 인증 배지 확인
    const isVerified = await page
      .locator('svg[aria-label="인증됨"], svg[aria-label="Verified"]')
      .count()
      .then((c) => c > 0)
      .catch(() => false);

    // 이름 추출
    const name = metaTitle
      ? metaTitle.replace(/\(@[^)]+\).*/, "").trim()
      : username;

    // 최근 게시물 썸네일 추출
    const posts: InstagramPost[] = [];
    const postElements = await page.locator("article img").all();
    for (let i = 0; i < Math.min(postElements.length, 5); i++) {
      const src = await postElements[i].getAttribute("src").catch(() => "");
      if (src) {
        posts.push({
          thumbnailUrl: src,
          isVideo: false,
          viewCount: null,
        });
      }
    }

    // 릴스/비디오 확인
    const videoElements = await page
      .locator('article a svg[aria-label*="릴스"], article a svg[aria-label*="Reel"], article a svg[aria-label*="동영상"], article a svg[aria-label*="Video"]')
      .all();

    if (videoElements.length > 0) {
      // 일부 포스트를 비디오로 표시
      for (let i = 0; i < Math.min(videoElements.length, posts.length); i++) {
        posts[i].isVideo = true;
      }
    }

    const profile: InstagramProfile = {
      username,
      name: name || username,
      profilePic: profilePic || "",
      bio: bio || "",
      externalUrl,
      postsCount,
      followersCount,
      followingCount,
      isVerified,
    };

    return { profile, posts };
  } catch (error) {
    console.error(`크롤링 실패 (${username}):`, error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// 여러 계정을 순차적으로 크롤링 (딜레이 포함)
export async function crawlMultipleProfiles(
  usernames: string[]
): Promise<Map<string, { profile: InstagramProfile; posts: InstagramPost[] }>> {
  const results = new Map();

  for (const username of usernames) {
    const data = await crawlInstagramProfile(username);
    if (data) {
      results.set(username, data);
    }
    // 요청 간 2~4초 딜레이
    await new Promise((r) =>
      setTimeout(r, 2000 + Math.random() * 2000)
    );
  }

  return results;
}
