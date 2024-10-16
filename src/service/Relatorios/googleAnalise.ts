import { type ChatSession, GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const generationConfig = {
  temperature: 0.5,
  topP: 0.8,
  topK: 64,
  maxOutputTokens: 819200,
  responseMimeType: "text/plain",
};
const activeChats = new Map();

const getOrCreateChatSession = (chatId: string): ChatSession => {
  console.log('activeChats.has(chatId)', activeChats.has(chatId));
  if (activeChats.has(chatId)) {
    const currentHistory = activeChats.get(chatId);
    console.log({ currentHistory, chatId });
    return model.startChat({
      history: currentHistory,
    });
  }
  // Carrega o prompt de análise de tags
  const promptsPath = path.join(process.cwd(), 'src', 'relatorio', '.promptsRelatorios');
  const promptsRaw = fs.readFileSync(promptsPath, 'utf-8');
  const prompts = promptsRaw.split('\n').map(linha => linha.trim());
  const promptAnalisarTags = prompts.find(linha => linha.startsWith('ANALISAR_TAGS='))?.split('=')[1] || '';
  const history = [
    {
      role: 'user',
      parts: promptAnalisarTags ?? 'oi',
    },
    {
      role: 'model',
      parts: 'Olá, certo!',
    },
  ];
  activeChats.set(chatId, history);
  return model.startChat({
    history,
  });
};

export const mainGoogleAnalise = async ({
  currentMessageAnalise,
  chatId,
  clearHistory,
}: {
  currentMessageAnalise: string;
  chatId: string;
  clearHistory: boolean;
}): Promise<string> => {
  try {
    const chat = getOrCreateChatSession(chatId);
    const prompt = currentMessageAnalise;
    const result = await chat.sendMessage(prompt);

    // Verificar se a resposta da API está no formato esperado
    if (!result || !result.response) {
      throw new Error('Resposta inválida da API Gemini.');
    }

    const response = result.response;
    const text = response.text();

  if (clearHistory) {
    activeChats.delete(chatId); // Remove o histórico se clearHistory for true
  } else {
    activeChats.set(chatId, [
      ...activeChats.get(chatId),
      {
        role: 'user',
        parts: prompt,
      },
      {
        role: 'model',
        parts: text,
      },
    ]);
  }

  console.log('Resposta Gemini: ', text);
  return text;
} catch (error) {
  console.error('Erro ao processar a mensagem:', error);
  // Lógica de tratamento de erros (ex: retornar uma mensagem de erro amigável)
  return 'Ocorreu um erro ao processar sua solicitação.';
}
};