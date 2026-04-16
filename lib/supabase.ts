import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

// 클라이언트용 (브라우저)
export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }
  return _supabase;
}

// 서버용 (API 라우트) - lazy init
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
  }
  return _supabaseAdmin;
}

// bizCode로 사용자 찾기 또는 생성
export async function getOrCreateUser(bizCode: string) {
  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("users")
    .select("*")
    .eq("biz_code", bizCode)
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from("users")
    .insert({ biz_code: bizCode })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// 오늘 남은 검색 횟수 확인
export async function getRemainingSearches(userId: string, limit: number) {
  const today = new Date().toISOString().split("T")[0];
  const db = getSupabaseAdmin();

  const { data } = await db
    .from("daily_usage")
    .select("search_count")
    .eq("user_id", userId)
    .eq("search_date", today)
    .single();

  return limit - (data?.search_count || 0);
}

// 검색 횟수 차감
export async function decrementSearchCount(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("daily_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("search_date", today)
    .single();

  if (existing) {
    await db
      .from("daily_usage")
      .update({ search_count: existing.search_count + 1 })
      .eq("id", existing.id);
  } else {
    await db
      .from("daily_usage")
      .insert({ user_id: userId, search_date: today, search_count: 1 });
  }
}

// 검색 기록 저장
export async function saveSearchHistory(
  userId: string,
  username: string,
  results: unknown
) {
  await getSupabaseAdmin()
    .from("search_history")
    .insert({ user_id: userId, username, results });
}

// 검색 기록 조회
export async function getSearchHistory(userId: string) {
  const { data } = await getSupabaseAdmin()
    .from("search_history")
    .select("*")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .limit(20);

  return data || [];
}

// 캐시에서 프로필 가져오기 (24시간 유효)
export async function getCachedProfile(username: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await getSupabaseAdmin()
    .from("instagram_cache")
    .select("*")
    .eq("username", username)
    .gte("cached_at", oneDayAgo)
    .single();

  return data;
}

// 프로필 캐시 저장
export async function setCachedProfile(
  username: string,
  profileData: unknown,
  postsData: unknown
) {
  await getSupabaseAdmin().from("instagram_cache").upsert(
    {
      username,
      profile_data: profileData,
      posts_data: postsData,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "username" }
  );
}
