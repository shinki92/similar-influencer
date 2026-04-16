import Groq from "groq-sdk";
import type { InstagramProfile } from "./types";

interface AnalysisResult {
  similar_usernames: string[];
  keywords: string[];
  category: string;
}

// Groq API (무료)를 이용하여 유사 계정 추천
export async function findSimilarAccounts(
  profile: InstagramProfile,
  postsDescription?: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const groq = new Groq({ apiKey });

  const prompt = `당신은 인스타그램 인플루언서 분석 전문가입니다.

아래 인스타그램 계정의 감도(분위기, 스타일, 카테고리)를 분석하고,
비슷한 감도를 가진 한국 인스타그램 계정을 30~40개 추천해주세요.

## 분석 대상 계정
- 계정명: @${profile.username}
- 이름: ${profile.name}
- 바이오: ${profile.bio || "없음"}
- 팔로워: ${profile.followersCount}
- 게시물 수: ${profile.postsCount}
${postsDescription ? `- 게시물 설명: ${postsDescription}` : ""}

## 요청사항
1. 해당 계정의 카테고리와 감도 키워드를 분석하세요
2. 비슷한 감도/분위기를 가진 실존 한국 인스타그램 계정을 추천하세요
3. 팔로워 수가 비슷한 범위(1천~10만)의 마이크로/나노 인플루언서 위주로 추천하세요
4. 다양한 분야(뷰티, 패션, 일상, 맛집, 여행 등)에서 감도가 비슷한 계정을 포함하세요

반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 다른 텍스트 없이):
{
  "category": "카테고리 (예: 뷰티/패션/일상 등)",
  "keywords": ["감도키워드1", "감도키워드2"],
  "similar_usernames": ["username1", "username2"]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 응답이 비어있습니다");

    const parsed: AnalysisResult = JSON.parse(content);
    console.log("[analyze] AI 추천 계정 수:", parsed.similar_usernames?.length || 0);
    return parsed;
  } catch (error) {
    console.error("AI 분석 실패:", error);
    return {
      similar_usernames: [],
      keywords: [],
      category: "분석 실패",
    };
  }
}
