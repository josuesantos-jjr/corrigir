import fs from 'fs';
import path from 'path';
import { mainOpenAI } from '../service/openai';
import { mainGoogleTags } from '../service/Relatorios/googleTags';

async function analisarConversasAtivas(cliente: any) {
  const hoje = new Date().toLocaleDateString('pt-BR'); // Formato: "dia/mes/ano"
  const pastaHistorico = path.join(process.cwd(), 'src', 'Chats', 'Historico');
  let quantidadeEncontrada = 0;

  try {
    const chatIds = await fs.promises.readdir(pastaHistorico);

    for (const chatId of chatIds) {
      const caminhoChatId = path.join(pastaHistorico, chatId);

      if (fs.statSync(caminhoChatId).isDirectory()) {
        const arquivos = await fs.promises.readdir(caminhoChatId);

        for (const arquivo of arquivos) {
          if (path.extname(arquivo) === '.json' && arquivo.includes('@c.us')) {
            const caminhoArquivo = path.join(caminhoChatId, arquivo);
            try {
              const conteudoArquivo = await fs.promises.readFile(caminhoArquivo, 'utf-8');
              const conversas = JSON.parse(conteudoArquivo);

              // Formata a data do JSON para "dia/mes/ano"
              const conversaEncontrada = conversas.some(
                (conversa: { message: string; date: string; type: string }) => {
                  const [dia, mes, ano] = conversa.date.split('/');
                  const type = conversa.type.toLowerCase().includes('user');
                  const dataFormatada = `${dia}/${mes}/${ano}`;
                  return conversa.message.includes('') && type && dataFormatada === hoje;
                }
              );

              if (conversaEncontrada) {
                quantidadeEncontrada++;

                // Envia a conversa para a IA e obtém as tags
                const tags = await analisarConversaEObterTags(conversas);

                // Salva as tags no arquivo Dados.json
                await salvarTagsNoArquivoDados(caminhoChatId, tags);

                // Aguarda um tempo aleatório entre 1 e 2 segundos
                await new Promise(resolve => setTimeout(resolve, gerarTempoAleatorio(1, 2)));
              }
            } catch (erro) {
              console.error(`Erro ao ler o arquivo ${caminhoArquivo}: ${erro}`);
            }
          }
        }
      }
    }

    console.log(`Quantidade de arquivos JSON com "user" e data de hoje: ${quantidadeEncontrada}`);
  } catch (erro) {
    console.error(`Erro ao ler a pasta ${pastaHistorico}: ${erro}`);
  }
}

// Função para analisar a conversa e obter as tags da IA
async function analisarConversaEObterTags(conversas: any[]): Promise<string> {
  // Carrega o prompt de análise de tags
  const promptsPath = path.join(process.cwd(), 'src', 'relatorio', '.promptsRelatorios');
  const promptsRaw = fs.readFileSync(promptsPath, 'utf-8');
  const prompts = promptsRaw.split('\n').map(linha => linha.trim());
  const promptAnalisarTags = prompts.find(linha => linha.startsWith('ANALISAR_TAGS='))?.split('=')[1] || '';

  // Formata a conversa para enviar para a IA
  const conversaFormatada = conversas.map(conversa => `${conversa.type}: ${conversa.message}`).join('\n');

  // Faz a requisição para a IA
  const response = await makeRequestWithRetry(promptAnalisarTags + conversaFormatada);

  // Extrai as tags da resposta da IA
  const tags = extrairTagsDaResposta(response);

  return tags;
}

// Função para extrair as tags da resposta da IA (implemente a lógica de acordo com a resposta da IA)
function extrairTagsDaResposta(respostaIA: string): string {
  // Implemente a lógica para extrair as tags da resposta da IA
  // Exemplo: se a IA retorna as tags em uma linha separada por vírgulas:
  return respostaIA.split('\n').filter(linha => linha.startsWith('Tags: '))[0].split('Tags: ')[1];
}

// Função para salvar as tags no arquivo Dados.json
async function salvarTagsNoArquivoDados(caminhoChatId: string, tags: string) {
  const caminhoArquivoDados = path.join(caminhoChatId, 'Dados.json');

  try {
    let dados: any = {};
    if (fs.existsSync(caminhoArquivoDados)) {
      const conteudoArquivo = await fs.promises.readFile(caminhoArquivoDados, 'utf-8');
      dados = JSON.parse(conteudoArquivo);
    }

    dados.tags = tags;

    await fs.promises.writeFile(caminhoArquivoDados, JSON.stringify(dados, null, 2));
    console.log(`Tags salvas no arquivo Dados.json para o chatId: ${caminhoChatId}`);
  } catch (erro) {
    console.error(`Erro ao salvar as tags no arquivo Dados.json: ${erro}`);
  }
}

// Função para gerar um tempo aleatório dentro de um intervalo (em segundos)
function gerarTempoAleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Função para fazer a requisição com retentativas (reutilize a função makeRequestWithRetry do relatorioMensal.ts)
async function makeRequestWithRetry(prompt: string, retries = 0): Promise<string> {
  try {
    console.log(`Fazendo requisição para a IA com o prompt: ${prompt}`);
    const response =
      process.env.AI_SELECTED === 'GPT'
        ? await mainOpenAI({
            currentMessage: prompt,
            chatId: 'your_chat_id',
          })
        : await mainGoogleTags({
            currentMessageTags: prompt,
            chatId: 'your_chat_id',
            clearHistory: true,
          });
    console.log(`Resposta da IA: ${response}`);
    return response;
  } catch (error: any) {
    console.error(`Erro ao obter resposta da IA: ${error}`);
    if (
      (error.message.includes('429 Too Many Requests') ||
        error.message.includes('503 Service Unavailable') ||
        error.message.includes('messageBufferPerChatId.get is not a function') ||
        error.message.includes('[500 Internal Server Error]')) &&
      retries < 100
    ) {
      const backoffTime = 1000 * Math.random() * (20 - 1) + 5;
      console.log(`Muitas requisições, tentando novamente em ${backoffTime} segundos...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return await makeRequestWithRetry(prompt, retries + 1);
    } else {
      throw error;
    }
  }
}


export { analisarConversasAtivas };
