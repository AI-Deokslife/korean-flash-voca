// 이 파일은 Netlify의 서버리스 함수(Functions)로 작동합니다.
// 사용자의 요청을 받아 API 키와 함께 Google AI 서버로 전달하고, 그 결과를 다시 사용자에게 보내줍니다.

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청이 아니면 에러 처리
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'POST 메서드만 허용됩니다.' }),
    };
  }

  try {
    // 요청 본문 파싱
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '잘못된 JSON 형식입니다.', error: parseError.message })
      };
    }

    const { word, pos } = requestBody;

    if (!word) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'word 파라미터가 필요합니다.' })
      };
    }

    // Netlify 환경 변수에서 API 키를 가져옵니다.
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      console.error('API 키가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'API 키가 설정되지 않았습니다.' })
      };
    }

    const prompt = `You are a helpful assistant for a Vietnamese person learning Korean.
For the Korean word "${word}":
1. Provide the most common Vietnamese translation.
2. Create a simple, natural Korean example sentence using the word "${word}".
3. Provide the Vietnamese translation of that example sentence.

Return the response as a JSON object with the following exact keys: "vietnamese_translation", "korean_example", "vietnamese_example". Do not include any other text or markdown formatting in your response.`;

    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    console.log('API 요청 시작:', { word, pos });

    const apiResponse = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Google AI API Error:", {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorText
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: `Google AI API 오류: ${apiResponse.status}`,
          error: errorText 
        })
      };
    }

    const result = await apiResponse.json();
    console.log('API 응답 받음:', result);
    
    // 응답 구조 검증
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('예상되지 않은 API 응답 구조:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: '예상되지 않은 API 응답 구조',
          response: result 
        })
      };
    }
    
    const responseBody = result.candidates[0].content.parts[0].text;
    
    // JSON 파싱 검증
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (jsonError) {
      console.error('AI 응답 JSON 파싱 오류:', jsonError, 'Raw response:', responseBody);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'AI 응답 형식 오류',
          rawResponse: responseBody 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedResponse),
    };

  } catch (error) {
    console.error("Netlify 함수 오류:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: "서버에서 오류가 발생했습니다.", 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
