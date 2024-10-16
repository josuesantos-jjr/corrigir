import fs from 'fs';
import path from 'path';
import wppconnect from '@wppconnect-team/wppconnect';
import { sendMessageZap } from '../../multi';
import { enviarAudioPitchVendas } from './enviarAudio';

const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || ''; // Substitua pelo seu Chat ID de destino


export async function checkResposta(client: any, chatId: string, answer: string) {

    // Envia áudio de pitch de vendas
  if (answer.includes("Vou te enviar um áudio")) {
    console.log('Enviando áudio de pitch de vendas');
    try {
        const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
        await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
        await enviarAudioPitchVendas(client, chatId);
    } catch (error) {
      console.error('Erro ao enviar áudio de pitch de vendas:', error);
    }
  };

  // Verifica se houve a solicitação de exclusão e bloqueia o contato
  if (answer.includes("Já excluimos seu contato e não iremos mais mandar mensgens para seu número")) {
    console.log('ALERTA LGPD');
    try {
        await sendMessageZap(client, TARGET_CHAT_ID, `Alerta de LGPD ${chatId}`);
        const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
        await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 10000));
        await client.blockContact(chatId);
        console.log(`Contato ${chatId} bloqueado com sucesso.`);
        await sendMessageZap(client, TARGET_CHAT_ID, `Contato bloqueado ${chatId}`);
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
        await client.sendFile(chatId, path.join(__dirname, 'portifolio.pdf'), 'portifolio.pdf');
        await sendMessageZap(client, TARGET_CHAT_ID, `Arquivo de portifólio ${chatId}`);
        console.log(`Arquivo de portifólio enviado com sucesso para ${chatId}`);
    } catch (error) {
    console.error(`Erro ao bloquear o contato ${chatId}:`, error);
  }
};

  // Adicione outras verificações



};
