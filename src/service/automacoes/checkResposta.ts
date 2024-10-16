import fs from 'fs';
import path from 'path';
import { enviarAudio } from './enviarAudio';




export async function checkResposta(client: any, clientePath: string, chatId: string, answer: string) {

  const envPath1 = path.join(clientePath, './config/.env'); 
  const envRaw1 = fs.readFileSync(envPath1, 'utf-8');
  const env = envRaw1.split('\n').map(linha => linha.trim());
  const TARGET_CHAT_ID = env.find(linha => linha.startsWith('TARGET_CHAT_ID='))?.split('=')[1] || ``;

    // Envia áudio de pitch de vendas
  if (answer.includes("Vou te enviar um áudio")) {
    console.log('Enviando áudio de pitch de vendas');
    try {
        const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
        await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
        await enviarAudio(client, chatId, clientePath);
    } catch (error) {
      console.error('Erro ao enviar áudio de pitch de vendas:', error);
    }
  };

  // Verifica se houve a solicitação de exclusão e bloqueia o contato
  if (answer.includes("Já excluimos seu contato e não iremos mais mandar mensagens para seu número")) {
    console.log('ALERTA LGPD');
    try {
        await client.sendText(TARGET_CHAT_ID, `Alerta de LGPD ${chatId}`);
        const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
        await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 10000));
        await client.blockContact(chatId);
        console.log(`Contato ${chatId} bloqueado com sucesso.`);
        await client.sendText(TARGET_CHAT_ID, `Contato bloqueado ${chatId}`);
        console.log(`Contato ${chatId} bloqueado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao bloquear o contato ${chatId}:`, error);
    }
  };

  // quero uma verificação para enviar um arquivo de documento 
  if (answer.includes("Segue nosso portifólio")) {
    console.log('Enviando arquivo de portifólio');
    try {
        const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
        await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
        await client.sendFile(chatId, path.join(clientePath, 'arquivos', 'portifolio.pdf'), 'portifolio.pdf');
        await client.sendText(TARGET_CHAT_ID, `Arquivo de portifólio ${chatId}`);
        console.log(`Arquivo de portifólio enviado com sucesso para ${chatId}`);
    } catch (error) {
      console.error(`Erro ao enviar arquivo de portifólio para ${chatId}:`, error);
    }
  }

  // Adicione outras verificações



};
