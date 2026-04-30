import { env } from "#env";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

export async function summarizeText(text: string): Promise<string> {
    const prompt = `
      Resuma a conversa abaixo de forma clara e objetiva:

      - Tema principal
      - Pontos importantes
      - Decisões tomadas (se houver)
      - Tom geral da conversa (ex: descontraído, sério, debate, etc)

      CONVERSA:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;

    return response.text();
}
