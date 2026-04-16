import type { InstagramProfile, InstagramPost, InfluencerResult } from "./types";

const RAPIDAPI_HOST = "instagram-scraper-stable-api.p.rapidapi.com";

function getApiKey() {
  return process.env.RAPIDAPI_KEY || "";
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    "X-RapidAPI-Key": getApiKey(),
  };
}

// 인스타그램 계정명 정규화
export function normalizeUsername(input: string): string {
  let username = input.trim();
  const urlMatch = username.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (urlMatch) username = urlMatch[1];
  username = username.replace(/^@/, "");
  username = username.replace(/\/$/, "");
  return username.toLowerCase();
}

// RapidAPI: 유사 계정 가져오기 (핵심 기능!)
export async function fetchSimilarAccounts(
  username: string
): Promise<InfluencerResult[]> {
  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/get_ig_similar_accounts.php?username_or_url=${encodeURIComponent(username)}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      console.log(`[similar] ${username}: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[similar] ${username}: 결과 없음`);
      return [];
    }

    console.log(`[similar] ${username}: ${data.length}개 유사 계정 발견`);

    return data.map((user: {
      username?: string;
      full_name?: string;
      profile_pic_url?: string;
      is_verified?: boolean;
      is_private?: boolean;
    }) => ({
      profile: {
        username: user.username || "",
        name: user.full_name || user.username || "",
        profilePic: user.profile_pic_url || "",
        bio: "",
        externalUrl: null,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isVerified: user.is_verified || false,
      } as InstagramProfile,
      recentPosts: [] as InstagramPost[],
    }));
  } catch (error) {
    console.error(`[similar] ${username} 실패:`, error);
    return [];
  }
}

// RapidAPI: 프로필 상세 정보 가져오기
export async function fetchProfileAbout(
  username: string
): Promise<InstagramProfile | null> {
  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/get_ig_user_about.php?username_or_url=${encodeURIComponent(username)}`,
      { headers: getHeaders() }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.error) return null;

    return {
      username: data.username || username,
      name: data.full_name || username,
      profilePic: data.profile_pic_url_hd || data.profile_pic_url || "",
      bio: data.biography || "",
      externalUrl: data.external_url || data.bio_links?.[0]?.url || null,
      postsCount: data.media_count || 0,
      followersCount: data.follower_count || 0,
      followingCount: data.following_count || 0,
      isVerified: data.is_verified || false,
    };
  } catch (error) {
    console.error(`[about] ${username} 실패:`, error);
    return null;
  }
}
