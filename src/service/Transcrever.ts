// Transcrever.ts
import { VertexAI } from '@google-cloud/vertexai';

export const transcribeAudio = async (projectId: string, audioFilePath: string): Promise<string> => {
  const vertexAI = new VertexAI({ project: projectId, location: 'us-central1' });
  const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

  const filePart = {
    file_data: {
      file_uri: audioFilePath,
      mime_type: 'audio/mpeg',
    },
  };

  const textPart = {
    text: 'Por favor, transcreva o áudio.',
  };

  const request = {
    contents: [{ role: 'user', parts: [textPart] }],  };

  const resp = await generativeModel.generateContent(request);
  const contentResponse = await resp.response;

  return JSON.stringify(contentResponse);
};
