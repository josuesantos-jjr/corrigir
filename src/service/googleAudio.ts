import { convertAudio } from './Converter';
import { transcribeAudio } from './Transcrever';
import { promises as fs } from 'fs';
import path from 'path';
import wppconnect from '@wppconnect-team/wppconnect';

export async function handleAudio(client: wppconnect.Whatsapp, chatId: string, messageId: string): Promise<string> {
  try {
    // Download the audio file
    const audioFilePath = await client.downloadMedia(messageId);
    console.log('Audio file downloaded:', audioFilePath);

    // Create the 'arquivos' folder if it doesn't exist
    const arquivosDir = path.join('C:', 'Users', 'Familia Santos', 'Desktop', 'Clientes Robo', 'Dennis- Ademicon', 'src', 'Chats', 'Historico', chatId, 'arquivos');
    if (!(await fs.access(arquivosDir).then(() => true).catch(() => false))) {
      await fs.mkdir(arquivosDir, { recursive: true });
    }

    // Get the current date and time
    const now = new Date();
    const fileName = `${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}-${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.ogg`;

    // Save the audio file in the 'arquivos' folder
    const savedAudioFilePath = path.join(arquivosDir, fileName);
    await fs.copyFile(audioFilePath, savedAudioFilePath);
    console.log('Audio file saved:', savedAudioFilePath);

    // Convert the audio to MP3
    const mp3FilePath = path.join(arquivosDir, fileName.replace('.ogg', '.mp3'));
    await convertAudio(savedAudioFilePath, mp3FilePath);
    console.log('Audio file converted to MP3:', mp3FilePath);

    // Transcribe the audio using Vertex AI
    const projectId = 'delta-avenue-419516'; // Replace with your Google Cloud Project ID
    const transcript = await transcribeAudio(projectId, savedAudioFilePath);
    console.log('Audio transcribed:', transcript);

    return transcript;
  } catch (error) {
    console.error('Error handling audio:', error);
    throw error;
  }
}