import axios from "axios"

const supportedTypes = [
  "general",
  "google-search",
  "youtube-search",
  "youtube-play",
  "get-time",
  "get-date",
  "get-day",
  "get-month",
  "calculator-open",
  "instagram-open",
  "facebook-open",
  "weather-show",
]

const geminiResponse = async (command, assistantName, userName) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error("Gemini is not configured. Add GEMINI_API_KEY to backend/.env.")
    error.status = 503
    throw error
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const prompt = `You are ${assistantName}, a voice assistant created by ${userName}.
Classify the user's request and respond with one JSON object only. Do not use markdown fences.

Allowed types: ${supportedTypes.join(", ")}.
Return this shape: {"type":"general","userInput":"the useful search query or original request","response":"a concise, spoken reply"}.

Use "general" for questions that need a spoken answer. Use "google-search" when asked to search Google, "youtube-search" for a YouTube search, and "youtube-play" to play a video or song. Use the relevant open type for calculator, Instagram, Facebook, and weather requests. Use get-time, get-date, get-day, or get-month for local time/date questions. If the request asks who created you, say ${userName}.

User request: ${JSON.stringify(command)}`

  const result = await axios.post(
    apiUrl,
    { contents: [{ parts: [{ text: prompt }] }] },
    {
      headers: { "x-goog-api-key": apiKey },
      timeout: 30000,
    },
  )

  const text = result.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim()

  if (!text) {
    throw new Error("Gemini returned an empty response.")
  }

  return text
}

export default geminiResponse
