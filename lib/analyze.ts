import Groq from "groq-sdk";

// AI로 추천 이유 생성
export async function generateRecommendReasons(
  inputUsername: string,
  similarUsernames: string[]
): Promise<Record<string, string>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    console.log("[analyze] GROQ_API_KEY 없음 - 추천 이유 생략");
    return {};
  }

  const groq = new Groq({ apiKey });

  const usernameList = similarUsernames.slice(0, 20).join(", ");

  const prompt = `인스타그램 계정 @${inputUsername}과 유사한 계정들입니다: ${usernameList}

각 계정이 왜 @${inputUsername}과 유사한지 한 줄로 간단히 설명해주세요.
실제 계정 정보를 모르면 일반적인 유사점을 추정해서 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "username1": "추천 이유",
  "username2": "추천 이유"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return {};

    const parsed = JSON.parse(content);
    console.log("[analyze] 추천 이유 생성 완료:", Object.keys(parsed).length, "개");
    return parsed;
  } catch (error) {
    console.error("[analyze] 추천 이유 생성 실패:", error);
    return {};
  }
}
