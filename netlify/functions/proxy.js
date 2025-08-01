// 이 파일은 Netlify의 서버리스 함수(Functions)로 작동합니다.
// 사용자의 요청을 받아 API 키와 함께 Google AI 서버로 전달하고, 그 결과를 다시 사용자에게 보내줍니다.

exports.handler = async (event, context) => {
  // POST 요청이 아니면 에러 처리
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'POST 메서드만 허용됩니다.' }),
    };
  }

  try {
    const { word, pos } = JSON.parse(event.body);

    // Netlify 환경 변수에서 API 키를 가져옵니다.
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    const prompt = `You are a helpful assistant for a Vietnamese person learning Korean.
For the Korean word "${word}":
1. Provide the most common Vietnamese translation.
2. Create a simple, natural Korean example sentence using the word "${word}".
3. Provide the Vietnamese translation of that example sentence.

Return the response as a JSON object with the following exact keys: "vietnamese_translation", "korean_example", "vietnamese_example". Do not include any other text or markdown formatting in your response.`;

    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    const apiResponse = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Google AI API Error:", errorText);
      throw new Error(`Google AI API에서 오류가 발생했습니다: ${apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    
    // Netlify 함수는 body에 문자열을 담아 반환해야 합니다.
    const responseBody = result.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: responseBody,
    };

  } catch (error) {
    console.error("Netlify 함수 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버에서 오류가 발생했습니다.", error: error.message }),
    };
  }
};

