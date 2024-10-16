import { type ChatSession, GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY_CHAT!);
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
  const history = [
    {
      role: 'user',
      parts: process.env.POMPT_ATIVOS ?? 'oi',
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

export const mainGoogleChat = async ({
  currentMessageChat,
  chatId,
  clearHistory,
  maxRetries = 5, // Define o número máximo de tentativas
}: {
  currentMessageChat: string;
  chatId: string;
  clearHistory: boolean;
  maxRetries?: number; // Parâmetro opcional para definir o número máximo de tentativas
}): Promise<string> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const chat = getOrCreateChatSession(chatId);
      const prompt = currentMessageChat;
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
      retries++;
      console.log(`Tentativa ${retries} de ${maxRetries}...`);
      // Aguarda um tempo antes de tentar novamente
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  // Se todas as tentativas falharem, retorna uma mensagem de erro
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.';
};
