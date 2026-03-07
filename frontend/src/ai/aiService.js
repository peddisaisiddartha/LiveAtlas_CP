export async function askAI(question) {

  try {

    const API_KEY = import.meta.env.VITE_GEMINI_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful travel guide explaining places to tourists. Question: ${question}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates) {
      console.error(data);
      return "AI service unavailable";
    }

    return data.candidates[0].content.parts[0].text;

  } catch (err) {
    console.error(err);
    return "AI error occurred";
  }

}
