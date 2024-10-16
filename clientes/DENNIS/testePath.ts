import wppconnect from '@wppconnect-team/wppconnect';
import dotenv from 'dotenv';
import { initializeNewAIChatSession, mainOpenAI } from '../../src/service/openai';
import { splitMessages, sendMessagesWithDelay } from '../../src/util';
import { mainGoogleBG } from '../../src/service/googleBG';
import { mainGoogleChat } from '../../src/service/googlechat';
import fs from 'fs';
import path, { resolve } from 'path';
import { dispararMensagens } from '../../src/disparo/disparo'; // Importando a função
import { checkResposta } from '../../src/service/automacoes/checkResposta'; 
import { fileURLToPath } from 'url';
import { getPasta } from '../../src/teste';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, './config/.env'); 

const envRaw = fs.readFileSync(envPath, 'utf-8');
const env = envRaw.split('\n').map(linha => linha.trim());
dotenv.config({ path: envPath });

type AIOption = `GPT` | `GEMINI`;

const messageBufferPerChatId = new Map<string, string[]>();
const messageTimeouts = new Map<string, NodeJS.Timeout>();
const orçamentoTimeouts = new Map<string, NodeJS.Timeout>(); // Mapa para controlar os timeouts do orçamento



const cliente = env.find(linha => linha.startsWith('CLIENTE='))?.split('=')[1] || '';
const aiSelected = env.find(linha => linha.startsWith('AI_SELECTED='))?.split('=')[1] as AIOption || `GEMINI`;
const AI_SELECTED: AIOption = aiSelected;
const TARGET_CHAT_ID = env.find(linha => linha.startsWith('TARGET_CHAT_ID='))?.split('=')[1] || ``;
const GEMINI_KEY = env.find(linha => linha.startsWith('GEMINI_KEY='))?.split('=')[1] || ``;

console.log(`Cliente: ${cliente}`);
console.log(`AI Selected: ${AI_SELECTED}`);
console.log(`Target Chat ID: ${TARGET_CHAT_ID}`);
console.log(`Gemini Key: ${GEMINI_KEY}`);

export const getCliente = (): string => {
  return env.find(linha => linha.startsWith('CLIENTE='))?.split('=')[1] || '';
};
const clientePath = getPasta(cliente);

console.log(`Pasta cliente: ${clientePath}`);





const envPath1 = path.join(clientePath, './config/.env'); 
const envRaw1 = fs.readFileSync(envPath1, 'utf-8');
const env1 = envRaw1.split('\n').map(linha => linha.trim());
const testePath = env1.find(linha => linha.startsWith('CLIENTE='))?.split('=')[1] || '';

console.log(`Testando ler o arquivo dentro do caminho teste: ${testePath}`);