import wppconnect from '@wppconnect-team/wppconnect';
import dotenv from 'dotenv';
import fs from 'fs';
import path, { resolve } from 'path';
import readline from 'readline';


 



dotenv.config();

const messageBufferPerChatId = new Map<string, string[]>();
const messageTimeouts = new Map<string, NodeJS.Timeout>();


// Função para iniciar uma sessão do wppconnect e aguardar por "inChat"
async function iniciarSessao(session: string, browserArgs: string[]): Promise<wppconnect.Whatsapp> {
  return new Promise((resolve, reject) => {
    let client: wppconnect.Whatsapp;

    wppconnect
      .create({
        session,
        catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
          console.log(`Terminal qrcode: `, asciiQR);
        },
        statusFind: (statusSession, session) => {
          console.log(`Status Session: `, statusSession);
          console.log(`Session name: `, session);
          if (statusSession === 'inChat') {
            // Atualiza o arquivo de detalhes da sessão
            updateSessionDetails(session, client, 'inChat');
          } else if (statusSession === 'desconnectedMobile') {
            // Atualiza o arquivo de detalhes da sessão
            updateSessionDetails(session, client, 'disconnected');
          }
        },

        headless: true, // Desativa o modo headless para abrir o navegador
        // browserArgs, // Remove esta linha para usar o navegador padrão
        puppeteerOptions: { 
          args: ['--no-sandbox', '--disable-setuid-sandbox'] // Adiciona argumentos para evitar problemas de permissões
        }
      })
      .then((clientInstance) => {
        client = clientInstance;
        resolve(client);
        // ... (seu código para lidar com a sessão conectada)
      })
      .catch((erro) => {
        console.log(erro);
        reject(erro);
      });
  });
}


// Função para atualizar o arquivo de detalhes da sessão
function updateSessionDetails(session: string, client: wppconnect.Whatsapp, status: 'inChat' | 'disconnected') {
  const sessionDetailsPath = path.join(process.cwd(), 'src', 'sessions.json');

  // Lê o conteúdo do arquivo
  let sessionDetails: any = {};
  if (fs.existsSync(sessionDetailsPath)) {
    const fileContent = fs.readFileSync(sessionDetailsPath, 'utf-8');
    sessionDetails = JSON.parse(fileContent);
  }

  // Atualiza os detalhes da sessão
  sessionDetails[session] = {
    client: client ? 'client1' : 'client2',
    status: status,
    phoneNumber: client ? client : null,
  };

  // Escreve o conteúdo atualizado no arquivo
  fs.writeFileSync(sessionDetailsPath, JSON.stringify(sessionDetails, null, 2), 'utf-8');
}


// Função para ler entrada do usuário no console
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Função nomeada para iniciar as sessões
export async function iniciarSessoes() {
  try {
    // Pergunta ao usuário quantas sessões ele deseja iniciar
    const numSessoes = parseInt(await askQuestion('Quantas sessões de aquecimento você deseja iniciar? '), 10);

    // Inicia as sessões de acordo com a resposta do usuário
    for (let i = 1; i <= numSessoes; i++) {
      const client = await iniciarSessao(`aq${i}`, [`src/tokens/aq${i}`]);
      start(client);
    }

    console.log('Todas as sessões iniciadas com sucesso!');
  } catch (erro) {
    console.error('Ocorreu um erro ao iniciar as sessões:', erro);
  }
}

// Chamando a função para iniciar as sessões
iniciarSessoes();



async function start(client1: wppconnect.Whatsapp): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));


    
    client1.onMessage((message) => {
    console.log(`Mensagem recebida:`, message.type); // Log para verificar o tipo de mensagem recebida
      (async () => {
        if (
          message.type === `chat` &&
          message.isGroupMsg && // Apenas grupos
          message.chatId !== `status@broadcast`
        ) {

          const chatId: string = message.chatId as string; 
          console.log(`Mensagem recebida:`, message.body);
          if (!messageBufferPerChatId.has(chatId)) {
            messageBufferPerChatId.set(chatId, []);
          }
          messageBufferPerChatId.set(chatId, [
            ...(messageBufferPerChatId.get(chatId) || []),
            message.body ? message.body : ``, // Adiciona uma string vazia se message.body for undefined
          ]);


          if (messageTimeouts.has(chatId)) {
            clearTimeout(messageTimeouts.get(chatId));
          }

          // Configura o timeout para as próximas mensagens
          const intervalo_aleatorio = Math.random() * (60 - 1) + 1;

          console.log(`Aguardando novas mensagens do cliente (${intervalo_aleatorio})...`);

          messageTimeouts.set(
            chatId,
            setTimeout(() => {
              (async () => {
                // Mostrar typing na conversa pelo tempo do intervalo aletorio
                const messages = messageBufferPerChatId.get(chatId) || [];
                if (messages.length > 0) {
                  console.log(`Gerando resposta para: `,messages.join(` \n `));

                  // Faz a requisição com retentativas
                  const answer = await makeRequestWithRetry();
                  if (answer === `` || answer === undefined) return;

                  await client1.sendText(chatId, answer);

                  // Salva a resposta da IA no arquivo
                  messageBufferPerChatId.delete(chatId);
                  messageTimeouts.delete(chatId);
                
                } else {
                  await client1.sendText(message.from, `Oi`);
                }
              })();
            }, intervalo_aleatorio * intervalo_aleatorio * 1000)
          );
        }
      })();
    });
}





async function makeRequestWithRetry(): Promise<string | undefined> {
   
  console.log(`Fazendo requisição para a IA no Chat...`);
  const promptParts = (process.env.AQ_PROMPT ?? 'Comece a história').split(/[.!?]/); // Divide o prompt em frases
  const randomIndex = Math.floor(Math.random() * promptParts.length); // Gera um índice aleatório
  const text = promptParts[randomIndex].trim(); // Retorna a frase aleatória
  return text;                    
  }