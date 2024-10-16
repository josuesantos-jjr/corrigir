import fs from 'fs';
import path from 'path';
import { mainGoogleChat } from '../service/FollowUp/googleFollow';


// Função para enviar a mensagem usando o Zap correto ou sendMessage como fallback
const enviarMensagemPorZapOuPadrao = async (client: any, chatId: string, mensagem: string, zapDisparo: string | undefined): Promise<boolean> => {
  try {
    const zapNumero = parseInt(zapDisparo || '0', 10); // 0 indica que não há ZapDisparo

    switch (zapNumero) {
      case 1:
        await client.sendText(chatId, mensagem);
        return true;
      default: // Caso não tenha ZapDisparo ou seja inválido
        console.log(`Nenhum ZapDisparo válido encontrado para ${chatId}. Usando sendMessage como fallback.`);
        await client.sendText(chatId, mensagem);
        return true;
    }
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${chatId}:`, error);
    return false;
  }
};

// Função para obter a data da última mensagem do arquivo do chat
const getLastMessageDate = (chatId: string, clientePath: string, listaNome: string): Date | undefined => {
  const filePath = path.join(clientePath, 'listas', 'followup', 'listas', `${listaNome}.json`);
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(data);

      // Encontra o item correspondente ao chatId
      const lead = jsonData.find((item: any) => item.Telefone + '@c.us' === chatId);

      if (lead && lead['Ultima mensagem']) {
        const [dia, mes, ano] = lead['Ultima mensagem'].split('/');
        const dataHoraString = `${ano}-${mes}-${dia}`; // Define a hora como 00:00:00
        return new Date(dataHoraString);
      } else {
        return undefined;
      }
    } else {
      console.warn(`Arquivo ${listaNome}.json não encontrado ou vazio.`);
      return undefined;
    }
  } catch (error) {
    console.error(`Erro ao ler a data da última mensagem para ${chatId}:`, error);
    return undefined;
  }
};


// Função para verificar se está dentro do horário permitido
const isWithinAllowedTime = (clientePath: string): boolean => {
  const now = new Date();
  const regrasDisparoPath = path.join(clientePath, 'config', '.regrasdisparo');
  const regrasDisparoRaw = fs.readFileSync(regrasDisparoPath, 'utf-8');
  const regrasDisparo = regrasDisparoRaw.split('\n').map(linha => linha.trim());

  // Encontrando os valores de HORARIO_INICIAL e HORARIO_FINAL
  const horarioInicial = regrasDisparo.find(linha => linha.startsWith('HORARIO_INICIAL='))?.split('=')[1] || '00:00';
  const horarioFinal = regrasDisparo.find(linha => linha.startsWith('HORARIO_FINAL='))?.split('=')[1] || '23:59';

  // Convertendo os horários para números
  const [horaInicio, minutoInicio] = horarioInicial.split(':').map(Number);
  const [horaFim, minutoFim] = horarioFinal.split(':').map(Number);

  const horaAtual = now.getHours();
  const minutoAtual = now.getMinutes();

  // Verificando se o horário atual está dentro do intervalo permitido
  const result =
    horaAtual > horaInicio || (horaAtual === horaInicio && minutoAtual >= minutoInicio) &&
    horaAtual < horaFim || (horaAtual === horaFim && minutoAtual <= minutoFim);

  return result;
};

// Função para aguardar até o horário inicial
const aguardarHorarioInicial = async (horarioInicial: string) => {
  const agora = new Date();
  const [hora, minuto] = horarioInicial.split(':').map(Number);

  // Define a data de início para hoje, com o horário especificado
  const dataInicio = new Date(agora);
  dataInicio.setHours(hora, minuto, 0, 0);

  // Se já passou do horário inicial hoje, define para amanhã
  if (agora > dataInicio) {
    dataInicio.setDate(dataInicio.getDate() + 1);
  }

  const tempoEspera = dataInicio.getTime() - agora.getTime();

  console.log(`Aguardando até o horário inicial: ${horarioInicial}`);
  await new Promise(resolve => setTimeout(resolve, tempoEspera));
  console.log('Horário inicial atingido!');
};

// Função para obter as regras de disparo do arquivo .regrasDisparo
const getRegrasDisparo = (clientePath: string): { [key: string]: any } => {
  const filePath = path.join(clientePath, 'config', '.regrasdisparo');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const linhas = data.split('\n'); // Divide o conteúdo em linhas
    const regrasDisparo: { [key: string]: any } = {};

    // Função auxiliar para extrair valor numérico de uma string
    const extrairValorNumerico = (valor: string | undefined): number => {
      return parseInt(valor || '0', 10) || 0;
    };

    // Itera pelas linhas e extrai os valores
    linhas.forEach(linha => {
      if (linha.trim() !== '') { // Ignora linhas vazias
        const [chave, valor] = linha.split('=');
        regrasDisparo[chave.trim()] = valor?.trim();
      }
    });

    // Converte valores numéricos
    regrasDisparo.INTERVALO_DE = extrairValorNumerico(regrasDisparo.INTERVALO_DE);
    regrasDisparo.INTERVALO_ATE = extrairValorNumerico(regrasDisparo.INTERVALO_ATE);
    regrasDisparo.QUANTIDADE_INICIAL = extrairValorNumerico(regrasDisparo.QUANTIDADE_INICIAL);
    regrasDisparo.DIAS_AQUECIMENTO = extrairValorNumerico(regrasDisparo.DIAS_AQUECIMENTO);
    regrasDisparo.QUANTIDADE_LIMITE = extrairValorNumerico(regrasDisparo.LIMITE_FOLLOW);
    regrasDisparo.QUANTIDADE_SEQUENCIA = extrairValorNumerico(regrasDisparo.QUANTIDADE_SEQUENCIA);

    return regrasDisparo;
  } catch (error) {
    console.error(`Erro ao ler o arquivo .regrasDisparo:`, error);
    return {};
  }
};

// Função para obter o prompt do arquivo .promptfollow
const getPrompt = (nivel: string, clientePath: string): string => {
  console.log(`Obtendo prompt para o nível ${nivel}...`);
  const filePath = path.join(clientePath, 'config', '.promptFollow');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const prompts = data.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim().replace(/`/g, '');
      }
      return acc;
    }, {} as { [key: string]: string });

    return prompts[nivel] || ''; 
  } catch (error) {
    console.error(`Erro ao ler o prompt para o nível ${nivel}:`, error);
    if (error === 'ENOENT') {
      console.error('Arquivo .promptfollow não encontrado!');
    }
    return ''; 
  }
};

// Função para salvar a mensagem no arquivo JSON do histórico
const saveMessageToFile = (chatId: string, clientePath: string, message: string, type: 'User' | 'IA'): void => {
  console.log(`Salvando mensagem para ${chatId}...`);
  const filePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, `${chatId}.json`);
  try {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const messageData = { date, time, type, message };

    let existingMessages: any[] = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingMessages = JSON.parse(fileContent);
    }
    existingMessages.push(messageData);
    fs.writeFileSync(filePath, JSON.stringify(existingMessages, null, 2));
    console.log('Mensagem salva com sucesso!');
  } catch (error) {
    console.error(`Erro ao salvar mensagem no arquivo JSON do histórico para ${chatId}:`, error);
  }
};

// Função para atualizar os dados do lead no arquivo JSON da lista de follow-up
const updateLeadData = (listaNome: string, clientePath: string, chatId: string, field: string, value: string): void => {
  console.log(`Atualizando dados do lead para ${chatId} na lista ${listaNome}...`);
  const filePath = path.join(clientePath, 'listas', 'followup', 'listas', `${listaNome}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const index = data.findIndex((item: any) => item.Telefone + '@c.us' === chatId);
    if (index !== -1) {
      data[index][field] = value;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } else {
      console.warn(`Chat ID ${chatId} não encontrado na lista ${listaNome}.json`);
    }
  } catch (error) {
    console.error(`Erro ao atualizar os dados do lead no arquivo da lista de follow-up para ${chatId}:`, error);
  }
};

// Função para extrair dados do arquivo Dados.json
const getLeadData = (chatId: string, clientePath: string): { [key: string]: string } | undefined => {
  const dadosFilePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, 'Dados.json');
  try {
    if (fs.existsSync(dadosFilePath)) {
      const data = fs.readFileSync(dadosFilePath, 'utf-8');
      const result = JSON.parse(data);
      return result;
    } else {
      return undefined;
    }
  } catch (error) {
    console.error(`Erro ao ler dados do arquivo Dados.json para ${chatId}:`, error);
    return undefined;
  }
};

// Função para obter o histórico da conversa do arquivo JSON
function getConversationHistory(chatId: string, clientePath: string): string {
  console.log(`Obtendo histórico da conversa para ${chatId}...`);
  try {
    const filePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, `${chatId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return ''; // Retorna uma string vazia se o arquivo não existir
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(data);

    // Extrai mensagens do arquivo JSON e formata para a IA
    const conversationHistory = jsonData.map((message: any) => {
      return `${message.type === 'User' ? 'User' : 'IA'}: ${message.message}`;
    }).join('\n');

    return conversationHistory;
  } catch (error) {
    console.error(`Erro ao ler o histórico da conversa para ${chatId}:`, error);
    return ''; // Retorna uma string vazia em caso de erro
  }
}

// Função para verificar se a data está dentro de 15 dias
const isWithinFifteenDays = (date: Date): boolean => {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  return date >= fifteenDaysAgo;
};


// Função principal para processar as listas de follow-up
const processNivel1 = async (client: any, clientePath: string): Promise<void> => {
  console.log('Iniciando processamento do nível 1...');
  const listasDirPath = path.join(clientePath, 'listas', 'followup', 'listas');
  console.log('Caminho da pasta de listas:', listasDirPath);
  const listaArquivos = fs.readdirSync(listasDirPath);
  console.log('Arquivos de lista encontrados:', listaArquivos);
  const regrasDisparo = getRegrasDisparo(clientePath);
  let messagesSent = 0;

  for (const arquivo of listaArquivos) {
    const listaPath = path.join(listasDirPath, arquivo);
    if (fs.statSync(listaPath).isFile() && path.extname(listaPath) === '.json') {
      const listaNome = path.parse(arquivo).name;
      console.log('Nome da lista:', listaNome);
      const listaData = JSON.parse(fs.readFileSync(listaPath, 'utf-8'));

      // Filtra os números com "Nivel FollowUp": "1" e exclui os que têm "interest: não"
      const numerosFiltrados = listaData.filter((item: any) => {
        const chatId = item.Telefone + '@c.us';
        const dados = getLeadData(chatId, clientePath);
        return item['Nivel FollowUp'] === '1' && (!dados || dados.interest !== 'Não');
      });
      console.log('Números filtrados:', numerosFiltrados);
      for (const item of numerosFiltrados) {
        console.log(`Processando número:`, item);
        const chatId = item.Telefone + '@c.us';

        // Obtém a data da última mensagem
        const lastMessageDate = getLastMessageDate(chatId, clientePath, listaNome);
        const regrasDisparo = getRegrasDisparo(clientePath);
        const horarioInicial = regrasDisparo.HORARIO_INICIAL; // Access using uppercase key

        // *** Aguarda o horário inicial antes de verificar se está dentro do horário permitido ***
        await aguardarHorarioInicial(horarioInicial); // Assume que você já extraiu horarioInicial de .regrasdisparo

        // Verifica se a última mensagem foi há mais de 15 dias
        if (lastMessageDate && !isWithinFifteenDays(lastMessageDate)) {
          console.log(`Enviando mensagem de follow-up para ${chatId} (última mensagem há mais de 15 dias)`);

          // *** Verifica se está dentro do horário permitido antes de enviar ***
          if (isWithinAllowedTime(clientePath)) {
            const conversationHistory = getConversationHistory(chatId, clientePath);
            const promptNivel2 = getPrompt('NIVEL2', clientePath);
            const envPath1 = path.join(clientePath, './config/.env'); 
            const envRaw1 = fs.readFileSync(envPath1, 'utf-8');
            const env1 = envRaw1.split('\n').map(linha => linha.trim());
            const promptEnv = env1.find(linha => linha.startsWith('GEMINI_PROMPT='))?.split('=')[1] || '';    
            
            // **Obter informações do arquivo JSON do checklist**
            const infoCliente = getLeadData(chatId, clientePath); 
            const informações = item; // Formata o JSON
    
            // **Incluir informações do cliente no prompt**
            const prompt = `${promptEnv}\n\n${promptNivel2}\n\n${conversationHistory}\n\nInformações do cliente:\n${JSON.stringify(informações, null, 2)}`; 
    
        try {
          const mensagem = await mainGoogleChat({
            currentMessageChat: prompt,
            chatId: chatId,
            clearHistory: false,
          });
          console.log('Mensagem da IA:', mensagem);

          // Obter o ZapDisparo do arquivo Dados.json
          const dadosCliente = getLeadData(chatId, clientePath);
          const zapDisparo = dadosCliente?.ZapDisparo;


          // Verifica se o Whats no arquivo JSON corresponde ao client atual
          if (dadosCliente && dadosCliente.Whats && dadosCliente.Whats === client) {

            // Enviar a mensagem usando o Zap correto
            const envioSucesso = await enviarMensagemPorZapOuPadrao (client, chatId, mensagem, zapDisparo);

            if (envioSucesso) {
              console.log('Mensagem enviada com sucesso!');
              saveMessageToFile(chatId, clientePath, mensagem, 'IA');
              console.log('Mensagem salva no histórico.');
              updateLeadData(listaNome, clientePath, chatId, 'Nivel FollowUp', '2');
              console.log('Nível de follow-up atualizado para 2.');
              messagesSent++;
              console.log(`Total de mensagens FollowUp Nivel1 enviadas:`, messagesSent);

                // Aguarda um tempo aleatório entre os envios
                const randomDelay = Math.floor(Math.random() * (regrasDisparo.INTERVALO_ATE - regrasDisparo.INTERVALO_DE + 1)) + regrasDisparo.INTERVALO_DE;
                console.log(`Aguardando ${randomDelay} segundos...`);
                await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));

                // Faz uma pausa de 1 hora após enviar uma certa quantidade de mensagens
                if (messagesSent >= regrasDisparo.QUANTIDADE_SEQUENCIA) {
                  console.log(`Pausa de 1 hora após enviar ${regrasDisparo.QUANTIDADE_SEQUENCIA} mensagens.`);
                  await new Promise((resolve) => setTimeout(resolve, 3600 * 1000));
                  messagesSent = 0;
                  console.log('Reiniciando contagem de mensagens enviadas.');
                } else {
                  console.log('Erro ao enviar mensagem por Zap.');
                  }
                }
              } else {
              console.log('Erro ao verificar o client.');
              }
            } catch (error) {
              console.error(`Erro ao processar o número ${chatId}:`, error);
            }
          } else {
          console.log(`Fora do horário permitido. Mensagem para ${chatId} não enviada.`);
          }
        } else {
        console.log(`Ignorando ${chatId} (última mensagem dentro de 15 dias ou não encontrada)`);
        }
      }
    }
  }
  console.log('Processamento do nível 1 finalizado.');
};
  


export { processNivel1 };
