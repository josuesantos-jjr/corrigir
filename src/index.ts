import wppconnect from '@wppconnect-team/wppconnect';
import dotenv from 'dotenv';
import { initializeNewAIChatSession, mainOpenAI } from './service/openai';
import { splitMessages, sendMessagesWithDelay } from './util';
import { mainGoogle } from './service/google';
import { mainGoogleBG } from './service/googleBG';
import { mainGoogleChat } from './service/googlechat';
import fs from 'fs';
import path, { resolve } from 'path';
import { extrairListas } from './disparo/extrairListas'; // Importando a função
import { dispararMensagens } from './disparo/disparo'; // Importando a função
import { relatorios } from './relatorio/relatorios'; 
import { checkResposta } from './service/automacoes/checkResposta'; 




dotenv.config();

type AIOption = `GPT` | `GEMINI`;

const messageBufferPerChatId = new Map<string, string[]>();
const messageTimeouts = new Map<string, NodeJS.Timeout>();
const orçamentoTimeouts = new Map<string, NodeJS.Timeout>(); // Mapa para controlar os timeouts do orçamento

const AI_SELECTED: AIOption = (process.env.AI_SELECTED as AIOption) || `GEMINI`;
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || ``; // Substitua pelo seu Chat ID de destino


// Configuração para retentativas
const MAX_RETRIES_START = 300; // Número máximo de retentativas para nome
const MAX_RETRIES_NAME = 10; // Número máximo de retentativas para nome
const MAX_RETRIES_INTEREST = 10; // Número máximo de retentativas para interesse
const MAX_RETRIES_ORÇAMENTO = 10; // Número máximo de retentativas para orçamento
const MAX_RETRIES_RESUMO = 10; // Número máximo de retentativas para orçamento
const INITIAL_BACKOFF_MS = 1000 * Math.random() * (20 - 1) + 5; // Tempo de espera inicial em milissegundos

let leadCount = 1; // Contador de leads

if (AI_SELECTED === `GEMINI` && !process.env.GEMINI_KEY) {
  throw Error(
    `Você precisa colocar uma key do Gemini no .env! Crie uma gratuitamente em https://aistudio.google.com/app/apikey?hl=pt-br`
  );
}

if (
  AI_SELECTED === `GPT` &&
  (!process.env.OPENAI_KEY || !process.env.OPENAI_ASSISTANT)
) {
  throw Error(
    `Para utilizar o GPT você precisa colocar no .env a sua key da openai e o id do seu assistente.`
  );
}

wppconnect
  .create({
    session: `sessionName`,
    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
      console.log(`Terminal qrcode: `, asciiQR);
    },
    statusFind: (statusSession, session) => {
      console.log(`Status Session: `, statusSession);
      console.log(`Session name: `, session);
    },
    headless: `new` as any,
  })
  .then((client) => {
    start(client);
  })
  .catch((erro) => {
    console.log(erro);
  });


async function start(client: wppconnect.Whatsapp): Promise<void> {

      // Chame a função dispararMensagens 

      dispararMensagens(client)
      .then(() => console.log(`Disparo de mensagens concluído!`))
      .catch((error) => console.error(`Erro ao disparar mensagens:`, error));
               
      client.onMessage((message) => {
        console.log(`Mensagem recebida:`, message.type); // Log para verificar o tipo de mensagem recebida
        (async () => {
          if (message.type === `ptt`) {
            console.log(`Mensagem de áudio recebida!`);
            const chatId: string = message.chatId as string; 
            
            // Envia a mensagem de erro para o chatId
            const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
            await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
            await client.startTyping(chatId, (intervalo_aleatorio * 1000));
            await sendMessage(client, chatId, "O áudio não está carregando aqui. Consegue escrever?");
            
          } else {
            console.log(`Tipo de mensagem não suportado:`, message.type); // Log para tipos de mensagem não suportados
          }
        if (
          message.type === `chat` &&
          !message.isGroupMsg &&
          message.chatId !== `status@broadcast`
        ) {
          const chatId: string = message.chatId as string; 
          console.log(`Mensagem recebida:`, message.body);
          if (AI_SELECTED === `GPT`) {
            console.log(`Inicializando nova sessão de chat com GPT...`);
            await initializeNewAIChatSession(chatId);
          }
          if (!messageBufferPerChatId.has(chatId)) {
            messageBufferPerChatId.set(chatId, []);
          }
          messageBufferPerChatId.set(chatId, [
            ...(messageBufferPerChatId.get(chatId) || []),
            message.body ? message.body : ``, // Adiciona uma string vazia se message.body for undefined
          ]);
          // Salva a mensagem recebida no arquivo
          saveMessageToFile(client, chatId, message.body ? message.body : ``, `User`); // Adiciona uma string vazia se message.body for undefined

          if (messageTimeouts.has(chatId)) {
            clearTimeout(messageTimeouts.get(chatId));
          }
          console.log(`Aguardando novas mensagens do cliente...`);

          // Configura o timeout para as próximas mensagens
          const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
          messageTimeouts.set(
            chatId,
            setTimeout(() => {
              (async () => {
                // Mostrar typing na conversa pelo tempo do intervalo aletorio
                await client.startTyping(chatId, (intervalo_aleatorio * 1000));
                const messages = messageBufferPerChatId.get(chatId) || [];
                if (messages.length > 0) {
                  console.log(
                    `Gerando resposta para: `,
                    messages.join(` \n `)
                  );
                  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, `${chatId}.json`);
                  const conversation = fs.readFileSync(filePath, `utf-8`);               
                  const currentMessage = messages.join(` \n `) + conversation;
                  // Função para fazer a requisição com retentativas
                  async function makeRequestWithRetry(
                    currentMessage: string,
                    chatId: string,
                    retries = 0
                  ): Promise<string | undefined> {
                    try {
                      console.log(`Fazendo requisição para a IA no Chat...`);
                      const answer =
                        AI_SELECTED === `GPT`
                          ? await mainOpenAI({
                              currentMessage,
                              chatId,
                            })
                          : await mainGoogleChat({ currentMessageChat: `${conversation}\n\n${currentMessage}`, chatId, clearHistory: true, // Ajuste conforme necessário
                            });
                      return answer;
                    } catch (error: any) {
                      if (
                        (error.message.includes(`429 Too Many Requests`) ||
                        error.message.includes(`503 Service Unavailable`) ||  
                        error.message.includes(`GoogleGenerativeAI Error`) ||  
                        error.message.includes(
                            `messageBufferPerChatId.get is not a function`
                          ) ||
                          error.message.includes(`[500 Internal Server Error]`)) &&
                        retries < MAX_RETRIES_START
                      ) {
                        const backoffTime =
                          INITIAL_BACKOFF_MS * Math.pow(1, retries);
                        console.log(
                          `Muitas requisições, tentando novamente em ${backoffTime} segundos...`
                        );
                        await new Promise((resolve) =>
                          setTimeout(resolve, backoffTime)
                        );
                        return await makeRequestWithRetry(
                          currentMessage,
                          chatId,
                          retries + 1
                        );
                      } else {
                        console.error(
                          `Erro ao obter resposta da IA:`,
                          error
                        );
                        throw error; // Propaga o erro para tratamento externo se necessário
                      }
                    }
                  }
                  // Faz a requisição com retentativas
                  const answer = await makeRequestWithRetry(
                    currentMessage,
                    chatId
                  );
                  if (answer === `_fim` || answer === undefined) return;
                  // Remover emojis da resposta
                  const filteredAnswer = removeEmojis(answer);

                  const splitMessagesArray = splitMessages(filteredAnswer); // Add the `!` operator to assert that the value is not undefined
                  console.log(`Enviando mensagens...`);
                  await sendMessagesWithDelay({
                    client,
                    messages: splitMessagesArray,
                    targetNumber: message.from,
                  });
                  // Salva a resposta da IA no arquivo
                  saveMessageToFile(client, chatId, answer, `IA`);
                  messageBufferPerChatId.delete(chatId);
                  messageTimeouts.delete(chatId);
                  
                  // Chama a função checkResposta para executar a ação
                  await checkResposta(client, chatId, answer);

                  messageBufferPerChatId.delete(chatId);
                  messageTimeouts.delete(chatId);
                } else {
                  console.log(`Nenhuma mensagem encontrada para o chatId:`, chatId);
                }
              })();
            }, intervalo_aleatorio * 1000)
          );
        }
      })();
    });
}



// Função para remover emojis
function removeEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}]/gu, ``) // Emoticons
             .replace(/[\u{1F300}-\u{1F5FF}]/gu, ``) // Símbolos e pictogramas
             .replace(/[\u{1F680}-\u{1F6FF}]/gu, ``) // Transporte e símbolos de mapa
             .replace(/[\u{1F700}-\u{1F77F}]/gu, ``) // Símbolos alfanuméricos
             .replace(/[\u{1F780}-\u{1F7FF}]/gu, ``) // Símbolos geométricos
             .replace(/[\u{1F800}-\u{1F8FF}]/gu, ``) // Símbolos suplementares
             .replace(/[\u{1F900}-\u{1F9FF}]/gu, ``) // Símbolos e pictogramas suplementares
             .replace(/[\u{1FA00}-\u{1FA6F}]/gu, ``) // Símbolos adicionais
             .replace(/[\u{1FA70}-\u{1FAFF}]/gu, ``) // Símbolos adicionais
             .replace(/[\u{2600}-\u{26FF}]/gu, ``)   // Diversos símbolos e pictogramas
             .replace(/[\u{2700}-\u{27BF}]/gu, ``);  // Dingbats
}

// Função para salvar mensagens em um arquivo
function saveMessageToFile(client: wppconnect.Whatsapp, chatId: string, message: string, type: `User` | `IA`) {
  const chatDir = path.join(process.cwd(), `src`, `Chats`, `Historico`, chatId);
  const fileName = `${chatId}.json`;
  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, `${chatId}.json`);

  // Cria o diretório se ele não existir
  if (!fs.existsSync(chatDir)) {
    console.log(`Criando diretório para o chatId:`, chatId);
    fs.mkdirSync(chatDir, { recursive: true });
  }

  // Cria o arquivo Dados.json se ele não existir
  const dadosFilePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, `Dados.json`);
  if (!fs.existsSync(dadosFilePath)) {
    console.log(`Criando arquivo Dados.json para o chatId:`, chatId);
    fs.writeFileSync(dadosFilePath, `{}`, `utf-8`); // Cria um arquivo vazio
  }

  // Formata a data e a hora
  const now = new Date();
  const date = now.toLocaleDateString(`pt-BR`);
  const time = now.toLocaleTimeString(`pt-BR`, { hour: `2-digit`, minute: `2-digit`, second: `2-digit` });

  // Formata a mensagem
  const formattedMessage = `${type === `User` ? `User` : `Model`} ${time}: ${message}`;

  // Cria o objeto JSON da mensagem
  const messageData = {
    date: date,
    time: time,
    type: type,
    message: message,
  };

  // Verifica se o arquivo já existe
  let messages: any[] = [];
  if (fs.existsSync(filePath)) {
    console.log(`Arquivo já existe, lendo conteúdo...`);
    
    const fileContent = fs.readFileSync(filePath, `utf-8`);
    messages = JSON.parse(fileContent);
  }

  // Adiciona a nova mensagem ao array
  messages.push(messageData);

  // Escreve o array JSON no arquivo
  console.log(`Escrevendo mensagem no arquivo:`, formattedMessage);
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), `utf-8`); // Adiciona a formatação com 2 espaços de indentação

  // Envia o conteúdo do arquivo para a IA para identificar o nome e interesse
  if (type === `User`) {
    console.log(`Enviando conversa para a IA para identificar nome e interesse...`);
    identifyNameAndInterest(client, chatId);
  }
}

// Função para identificar o nome e interesse na conversa
async function identifyNameAndInterest(client: wppconnect.Whatsapp, chatId: string) {
  const chatDir = path.join(process.cwd(), `src`, `Chats`, `Historico`, chatId);
  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, `${chatId}.json`);
  const conversation = fs.readFileSync(filePath, `utf-8`);

  const namePrompt = process.env.NAME_PROMPT || ``;
  const interestPrompt = process.env.INTEREST_PROMPT || ``;
  const orçamentoPrompt = process.env.ORCAMENTO_PROMPT || ``;

  // Lê o conteúdo do arquivo Dados.json para obter o nome, número e interesse
  const fileName = `Dados.json`;
  const dadosPath = path.join(process.cwd(), `src`, `Chats`, `Historico`, chatId, fileName);
  const fileContent = fs.readFileSync(dadosPath, `utf-8`);
  const fileData = JSON.parse(fileContent);
  
  const name = fileData.name || `Não identificado`;
  let nameResponse: any; // define nameResponse with a default value
  let interestResponse: any; // define interestResponse with a default value
  


  // Verifica se o nome já foi identificado
  if (fileData.name) {
    console.log(`Nome já identificado:`, fileData.name);

    // Faz apenas a requisição para interesse
    const interestResponse = await makeRequestWithRetryInterest(interestPrompt, chatId, conversation);

    if (interestResponse?.includes("Interesse: Sim")) {
      console.log(`Interesse identificado: Sim`);
      updateLeadData(chatId, `interest`, "Sim");
    }

  } else {
    // Nome não identificado, faz as requisições para nome e interesse
    const [nameResponse, interestResponse] = await Promise.all([
      makeRequestWithRetryName(namePrompt, chatId, conversation),
      makeRequestWithRetryInterest(interestPrompt, chatId, conversation),
    ]);

    // Processa as respostas
    const nameMatch = nameResponse?.match(/Nome do cliente: (.+)/);
    if (nameMatch) {
      const name = nameMatch[1];
      console.log(`Nome do cliente identificado:`, name);
      updateLeadData(chatId, `name`, name);
    }

    if (interestResponse?.includes("Interesse: Sim")) {
      console.log(`Interesse identificado: Sim`);
      updateLeadData(chatId, `interest`, "Sim");
    }
  }

  // Processa as respostas
  const nameMatch = nameResponse?.match(/Nome do cliente: (.+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    console.log(`Nome do cliente identificado:`, name);
    updateLeadData(chatId, `name`, name);
  }

  if (interestResponse?.includes("Interesse: Sim")) {
    console.log(`Interesse identificado: Sim`);
    updateLeadData(chatId, `interest`, "Sim");
  }

  // Verifica se a data do orçamento é hoje e faz a requisição com retentativas para orçamento
  const orçamentoData = new Date();
  const today = orçamentoData.toLocaleDateString('pt-BR');
  const lastOrçamentoData = getLeadData(chatId, 'orçamentoData');
  const isUpdatingOrçamento = new Map<string, boolean>();

  // gera a resposta do orçamento
  const orçamentoResponse = await Promise.all([
    makeRequestWithRetryOrçamento(orçamentoPrompt, chatId, conversation)
  ]);
    
  // Process the response
  console.log('Orçamento response:', orçamentoResponse);

  if (orçamentoResponse?.includes("Orçamento: Sim")) {
    console.log('Orçamento identificado: Sim');
    updateLeadData(chatId, 'orçamento', "Sim");
    updateLeadData(chatId, 'orçamentoData', today);

    // Verifica se o orçamento não foi feito hoje e gera o lead com resumo
    if (lastOrçamentoData !== today && !isUpdatingOrçamento.get(chatId)) {
      isUpdatingOrçamento.set(chatId, true);
      console.log('Aguardando 10 minutos para verificar o orçamento...');
      setTimeout(() => {
        console.log(`10 minutos se passaram, gerando resumo para ${chatId}...`); 
      }, 10 * 60 * 1000);       
      
      generateSummary(client, chatId);      
  
      isUpdatingOrçamento.set(chatId, false); // Libera a verificação para este chatId
    } else {
      console.log('O orçamento foi feito hoje, não precisa de resumo.');
    }
  } else {
    // Salva a informação do orçamento no arquivo Dados.json
    updateLeadData(chatId, 'orçamento', orçamentoResponse?.includes("Orçamento: Sim") ? "Sim" : "Não");
    console.log(`Orçamento ${orçamentoResponse?.includes("Orçamento: Sim") ? "Sim" : "Não"} identificado`);
  }
}


// Função para fazer a requisição com retentativas para o nome
async function makeRequestWithRetryName(prompt: string, chatId: string, conversation: string, retries = 0): Promise<string | undefined> {
  try {
    const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
    console.log(`Fazendo requisição para a IA (Nome) aguardando ${intervalo_aleatorio}...`);
    await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
    const response =
      AI_SELECTED === `GPT`
        ? await mainOpenAI({ currentMessage: `${prompt}\n\n${conversation}`, chatId })
        : await mainGoogleBG({ currentMessageBG: `${prompt}\n\n${conversation}`, chatId, clearHistory: true });
    return response;
  } catch (error: any) {
    if (
      (error.message.includes(`429 Too Many Requests`) ||
        error.message.includes(`503 Service Unavailable`) ||  
        error.message.includes(`messageBufferPerChatId.get is not a function`) ||
        error.message.includes(`[500 Internal Server Error]`)) &&
      retries < MAX_RETRIES_NAME
    ) {
      const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1, retries);
      console.log(`Muitas requisições, tentando novamente em ${backoffTime} segundos...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return await makeRequestWithRetryName(prompt, chatId, conversation, retries + 1);
    } else {
      console.error(`Erro ao obter resposta da IA (Nome):`, error);
      return undefined; // Ignora o erro e continua
    }
  }
}

// Função para fazer a requisição com retentativas para o interesse
async function makeRequestWithRetryInterest(prompt: string, chatId: string, conversation: string, retries = 0): Promise<string | undefined> {
  try {
    const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
    console.log(`Fazendo requisição para a IA (Interesse) aguardando ${intervalo_aleatorio}...`);
    await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
    const response =
      AI_SELECTED === `GPT`
        ? await mainOpenAI({ currentMessage: `${prompt}\n\n${conversation}`, chatId })
        : await mainGoogleBG({ currentMessageBG: `${prompt}\n\n${conversation}`, chatId, clearHistory: true });
    return response;
  } catch (error: any) {
    if (
      (error.message.includes(`429 Too Many Requests`) ||
        error.message.includes(`503 Service Unavailable`) ||  
        error.message.includes(`messageBufferPerChatId.get is not a function`) ||
        error.message.includes(`[500 Internal Server Error]`)) &&
      retries < MAX_RETRIES_INTEREST
    ) {
      const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1, retries);
      console.log(`Muitas requisições, tentando novamente em ${backoffTime} segundos...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return await makeRequestWithRetryInterest(prompt, chatId, conversation, retries + 1);
    } else {
      console.error(`Erro ao obter resposta da IA (Interesse):`, error);
      return undefined; // Ignora o erro e continua
    }
  }
}

// Função para fazer a requisição com retentativas para o orçamento
async function makeRequestWithRetryOrçamento(prompt: string, chatId: string, conversation: string, retries = 0): Promise<string | undefined> {
  try {
    const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
    console.log(`Fazendo requisição para a IA (Orçamento) aguardando ${intervalo_aleatorio}...`);
    await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
    const response =
      AI_SELECTED === `GPT`
        ? await mainOpenAI({ currentMessage: `${prompt}\n\n${conversation}`, chatId })
        : await mainGoogleBG({ currentMessageBG: `${prompt}\n\n${conversation}`, chatId, clearHistory: true });
    return response;
  } catch (error: any) {
    if (
      (error.message.includes(`429 Too Many Requests`) ||
        error.message.includes(`503 Service Unavailable`) ||  
        error.message.includes(`messageBufferPerChatId.get is not a function`) ||
        error.message.includes(`[500 Internal Server Error]`)) &&
      retries < MAX_RETRIES_ORÇAMENTO
    ) {
      const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1, retries);
      console.log(`Muitas requisições, tentando novamente em ${backoffTime} segundos...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return await makeRequestWithRetryOrçamento(prompt, chatId, conversation, retries + 1);
    } else {
      console.error(`Erro ao obter resposta da IA (Orçamento):`, error);
      return undefined; // Ignora o erro e continua
    }
  }
}

// Função para atualizar os dados do lead no arquivo Dados.json
function updateLeadData(chatId: string, field: `name` | `interest` | `phone` | `summary` | `orçamento` | `orçamentoData`, value: string) {
  const fileName = `Dados.json`;
  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, fileName);


  // Lê o conteúdo do arquivo
  let fileContent = fs.readFileSync(filePath, `utf-8`);
  const fileData = JSON.parse(fileContent);

  // Atualiza o campo no objeto
  fileData[field] = value;

  // Converte o objeto para JSON
  const updatedContent = JSON.stringify(fileData);

  // Escreve o conteúdo atualizado no arquivo
  fs.writeFileSync(filePath, updatedContent, `utf-8`);
}

// Função para obter os dados do lead no arquivo Dados.json
function getLeadData(chatId: string, field: `name` | `interest` | `phone` | `summary` | `orçamento` | `orçamentoData`): string {
  const fileName = `Dados.json`;
  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, fileName);


  // Lê o conteúdo do arquivo
  let fileContent = fs.readFileSync(filePath, `utf-8`);
  const fileData = JSON.parse(fileContent);

  // Retorna o valor do campo
  return fileData[field] || ``;
}

// Função para gerar o resumo da conversa
async function generateSummary(client: wppconnect.Whatsapp, chatId: string) {
  const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, `${chatId}`, `${chatId}.json`);
  const conversation = fs.readFileSync(filePath, `utf-8`);
  const summaryPrompt = process.env.SUMMARY_PROMPT || ``;
  console.log(`Gerando resumo da conversa...`);

  // Função para fazer a requisição com retentativas
  const intervalo_aleatorio = Math.random() * (20 - 15) + 15;
  await new Promise((resolve) => setTimeout(resolve, intervalo_aleatorio * 1000));
  console.log(`Fazendo requisição para a IA (Resumo) aguardando ${intervalo_aleatorio}...`);

  async function makeRequestWithRetry(
    prompt: string,
    chatId: string,
    retries = 0
  ): Promise<string | undefined> {
    try {
      console.log(`Fazendo requisição para a IA (Resumo)...`);
      const response =
        AI_SELECTED === `GPT`
          ? await mainOpenAI({ currentMessage: `${prompt}\n\n${conversation}`, chatId })
          : await mainGoogleChat({ currentMessageChat: `${prompt}\n\n${conversation}`, chatId, clearHistory: true });
      return response;
    } catch (error: any) {
      if (
        (error.message.includes(`429 Too Many Requests`) ||
          error.message.includes(`503 Service Unavailable`) ||  
          error.message.includes(
            `messageBufferPerChatId.get is not a function`
          ) ||
          error.message.includes(`[500 Internal Server Error]`)) &&
        retries < MAX_RETRIES_RESUMO
      ) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1, retries);
        console.log(
          `Muitas requisições, tentando novamente em ${backoffTime} segundos...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        intervalo_aleatorio * 1000;
        return await makeRequestWithRetry(prompt, chatId, retries + 1);
      } else {
        console.error(`Erro ao obter resposta da IA:`, error);
        throw error; // Propaga o erro para tratamento externo se necessário
      }
    }
  }intervalo_aleatorio * 1000

  const summaryResponse = await makeRequestWithRetry(summaryPrompt, chatId);

  updateLeadData(chatId, `summary`, summaryResponse!);
  await saveLead(client, chatId);
}

// Função para salvar o lead no arquivo
async function saveLead(client: wppconnect.Whatsapp, chatId: string) {
      const now = new Date();
      const monthYear = now.toLocaleDateString(`pt-BR`, { month: `long`, year: `numeric` });
      const leadsDir = path.join(process.cwd(), `src`, `Chats`, `Leads`);
      const leadsFile = path.join(leadsDir, `${monthYear}.json`);
      const intervalo_aleatorio = Math.random() * (20 - 15) + 5;

      // Cria o diretório se ele não existir
      if (!fs.existsSync(leadsDir)) {
        console.log(`Criando diretório para leads:`, leadsDir);
        fs.mkdirSync(leadsDir, { recursive: true });
      }

      // Lê o conteúdo do arquivo de leads
      let leadsContent = ``;
      let existingLeads: any[] = [];
      if (fs.existsSync(leadsFile)) {
        console.log(`Lendo conteúdo do arquivo de leads:`, leadsFile);
        leadsContent = fs.readFileSync(leadsFile, `utf-8`);
        try {
          existingLeads = JSON.parse(leadsContent);
          if (!Array.isArray(existingLeads)) {
            console.error(`O conteúdo do arquivo de leads não é um array. Redefinindo para um array vazio.`);
            existingLeads = [];
          }
        } catch (error) {
          console.error(`Erro ao analisar o conteúdo do arquivo de leads. Redefinindo para um array vazio.`, error);
          existingLeads = [];
        }
      }

      // Lê o conteúdo do arquivo Dados.json para obter o nome, número e interesse
      const fileName = `Dados.json`;
      const filePath = path.join(process.cwd(), `src`, `Chats`, `Historico`, chatId, fileName);
      const fileContent = fs.readFileSync(filePath, `utf-8`);
      const fileData = JSON.parse(fileContent);

      const name = fileData.name || `Não identificado`;
      const number = fileData.number || chatId;
      const interest = fileData.interest || `Não identificado`;
      const summary = fileData.summary || `Não identificado`;
      const orçamento = fileData.orçamento || `Não identificado`;

      // Verifica se o lead já existe
      const existingLeadIndex = existingLeads.findIndex(lead => lead.number === number);

      if (existingLeadIndex !== -1) {
        // Atualiza o lead existente
        console.log(`Lead já existe, atualizando informações...`);
        existingLeads[existingLeadIndex] = {
          ...existingLeads[existingLeadIndex],
          name: name,
          interest: interest,
          summary: summary,
        };

        // Escreve o array atualizado no arquivo
        console.log(`Salvando lead no arquivo:`, leadsFile);
        fs.writeFileSync(leadsFile, JSON.stringify(existingLeads, null, 2), `utf-8`);

        // Envia a mensagem para o chatId especificado
        const message = `*Atualizando lead* \nNome: ${name}\nNúmero: ${number.split(`@`)[0]}\nInteresse: ${interest}\n${summary}`;
        await sendMessage(client, TARGET_CHAT_ID, message);

      } else {
        // Cria um novo lead
        console.log(`Criando novo lead...`);

        // Obtém o último leadCount do arquivo
        leadCount = getLastLeadCount(leadsFile);

        const lead = {
          leadCount: leadCount,
          name: name,
          number: number,
          interest: interest,
          summary: summary,
        };
        existingLeads.push(lead);
        leadCount++;

        // Escreve o array atualizado no arquivo
        console.log(`Salvando lead no arquivo:`, leadsFile);
        fs.writeFileSync(leadsFile, JSON.stringify(existingLeads, null, 2), `utf-8`);

        // Envia a mensagem para o chatId especificado
        const message = `*Novo lead*\nNome: ${name}\nNúmero: ${number.split(`@`)[0]}\nInteresse: ${interest}\n${summary}`;
        await sendMessage(client, TARGET_CHAT_ID, message);
      }
    }

    // Função para obter o último leadCount do arquivo
    function getLastLeadCount(leadsFile: string): number {
      let lastLeadCount = 1; // Valor padrão caso o arquivo não exista ou esteja vazio
      if (fs.existsSync(leadsFile)) {
        const leadsContent = fs.readFileSync(leadsFile, `utf-8`);
        try {
          const existingLeads = JSON.parse(leadsContent);
          if (Array.isArray(existingLeads) && existingLeads.length > 0) {
            lastLeadCount = existingLeads[existingLeads.length - 1].leadCount + 1;
          }
        } catch (error) {
          console.error(`Erro ao analisar o conteúdo do arquivo de leads. Usando o valor padrão.`, error);
        }
      }
      return lastLeadCount;
    }

// Função para enviar mensagem
async function sendMessage(client: wppconnect.Whatsapp, chatId: string, message: string) {
  try {
    await client.sendText(chatId, message); 
    console.log(`Mensagem enviada para ${chatId}: ${message}`);
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${chatId}:`, error);
  }
}

// Exportando a função sendMensagens
export { sendMessage };

// Exportando a função sendMensagens
export { saveMessageToFile };