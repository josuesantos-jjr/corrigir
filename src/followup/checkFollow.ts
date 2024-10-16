import fs from 'fs';
import path from 'path';
import { processNivel1 } from '../followup/follow1';
import { processNivel2 } from '../followup/follow2';


interface LeadData {
  Nome?: string; // Optional property for 'Nome'
  [key: string]: any; // Allow other properties with any type
}


// Função para extrair dados do arquivo Dados.json
const getLeadData = (chatId: string, clientePath: string): LeadData | undefined => {
  const dadosFilePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, 'Dados.json');
  let dadosJson: LeadData = {}; // Initialize with the LeadData type

  try {
    if (fs.existsSync(dadosFilePath)) {
      const data = fs.readFileSync(dadosFilePath, 'utf-8');
      dadosJson = JSON.parse(data) as LeadData; // Type assertion for JSON.parse
    }

    // Se o nome não estiver definido no Dados.json, procure na lista de disparo
    if (!dadosJson.hasOwnProperty('Nome')) {
      const numeroTelefone = chatId.replace('@c.us', ''); // Remove o "@c.us" do chatId
      const listaDisparoDirPath = path.join(clientePath, 'listas', 'disparar');
      const listaArquivos = fs.readdirSync(listaDisparoDirPath);

      for (const arquivo of listaArquivos) {
        const listaPath = path.join(listaDisparoDirPath, arquivo);
        if (fs.statSync(listaPath).isFile() && path.extname(listaPath) === '.json') {
          const listaData = JSON.parse(fs.readFileSync(listaPath, 'utf-8'));
          const leadNaLista = listaData.find((item: any) => item.Telefone === numeroTelefone);

          if (leadNaLista && leadNaLista.hasOwnProperty('Nome')) {
            dadosJson['Nome'] = leadNaLista.Nome; // Define o nome encontrado na lista
            break; // Sai do loop após encontrar o nome
          }
        }
      }
    }

    // Cria um novo objeto para armazenar os dados formatados
    let formattedData: { [key: string]: string } = {};

    // Itera sobre cada chave e valor no objeto dadosJson
    for (const [key, value] of Object.entries(dadosJson)) {
      formattedData[key] = `${key}: ${value}`;
    }

    return formattedData;

  } catch (error) {
    console.error(`Erro ao ler dados do arquivo Dados.json para ${chatId}:`, error);
    return undefined;
  }
};

// Função para organizar os dados
const compareDates = (date1: string, date2: string): number => {
  const [dia1, mes1, ano1] = date1.split('/').map(Number); // Extract day, month, year as numbers
  const [dia2, mes2, ano2] = date2.split('/').map(Number);

  const dateObj1 = new Date(ano1, mes1 - 1, dia1); // Create Date objects (month is 0-indexed)
  const dateObj2 = new Date(ano2, mes2 - 1, dia2);

  return dateObj1.getTime() - dateObj2.getTime(); // Compare timestamps
};



// Função para extrair dados do arquivo Dados.json
const filtrarLead = (chatId: string, clientePath: string, key: string): string | undefined => {
  const dadosFilePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, 'Dados.json');

  if (!fs.existsSync(dadosFilePath)) {
    return undefined;
  }

  try {
    const data = fs.readFileSync(dadosFilePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData[key];
  } catch (error) {
    console.error(`Erro ao ler dados do arquivo Dados.json para ${chatId}:`, error);
    return undefined;
  }
};

// Função para ler a data da última mensagem do arquivo do chat
const getLastMessageDate = (chatId: string, clientePath: string): string | undefined => {
    const filePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, `${chatId}.json`);
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) { // Check if file exists and is not empty
        const data = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(data);
        const lastMessage = jsonData.length > 0 ? jsonData[jsonData.length - 1] : undefined;


        // 1. Combinar data e hora
        if (lastMessage) {
        const [dia, mes, ano] = lastMessage?.date.split('/');
        const dataHoraString = `${ano}-${mes}-${dia}T${lastMessage?.time}`;
  
        // 2. Criar um objeto Date
        const dataHora = new Date(dataHoraString);
  
        // 3. Retornar a data formatada
        return dataHora.toLocaleDateString('pt-BR'); 
              } else {
        return undefined;
      }}
    } catch (error) {
      console.error(`Erro ao ler a data da última mensagem para ${chatId}:`, error);
    }
    return undefined;
  };

// Função para processar um número individual
const disparoFollow = async (chatId: string, clientePath: string, client: any) => {

  const intervalo_aleatorio = Math.random() * (20 - 15) + 15;

  try {

    await processNivel1(client, clientePath);

    console.log(`Aguardando ${intervalo_aleatorio} minutos para próximo nível`);
    await new Promise(resolve => setTimeout(resolve, intervalo_aleatorio * 1000 * 60));

    await processNivel2(client, clientePath);

    
  } catch (error) {
    console.error(`Erro ao processar o número ${chatId}:`, error);
  }
}

// Função para filtrar os números e salvar na pasta followup/listas
const filtrarNumerosFollowUp = async (clientePath: string, client: any) => {
  console.log('Executanto checkFollow.ts');
  try {
    const dispararDirPath = path.join(clientePath, 'listas', 'disparar');
    const followupDirPath = path.join(clientePath, 'listas', 'followup', 'listas');

    // Cria a pasta followup/listas se não existir
    if (!fs.existsSync(followupDirPath)) {
      fs.mkdirSync(followupDirPath, { recursive: true });
    }

    // Lê todas as listas na pasta disparar
    const listaArquivos = fs.readdirSync(dispararDirPath);

    for (const arquivo of listaArquivos) {
      const listaPath = path.join(dispararDirPath, arquivo);
      if (fs.statSync(listaPath).isFile() && path.extname(listaPath) === '.json') {
        const listaNome = path.parse(arquivo).name;
        const listaData = JSON.parse(fs.readFileSync(listaPath, 'utf-8'));

        // Lê o arquivo da lista de follow-up se ele existir, caso contrário, cria um array vazio
        const followupFilePath = path.join(followupDirPath, `${listaNome}.json`);
        let numerosFollowUp: any[] = [];
        if (fs.existsSync(followupFilePath)) {
          numerosFollowUp = JSON.parse(fs.readFileSync(followupFilePath, 'utf-8'));
        }

        // Cria um conjunto para armazenar os números que já estão na lista de follow-up
        const numerosExistentes = new Set(numerosFollowUp.map((item: any) => item.Telefone));

        // Filtra os números da lista de disparo, excluindo os que já estão na lista de follow-up
        const novosNumerosFollowUp: any[] = listaData
          .filter((item: { Telefone: string }) => {
            const chatId = item.Telefone + `@c.us`;

            // Verifica se o arquivo JSON do histórico existe
            const historicoFilePath = path.join(clientePath, 'Chats', 'Historico', `${chatId}`, `${chatId}.json`);
            if (!fs.existsSync(historicoFilePath)) {
              return false; // Pula este número
            }

            const interesse = filtrarLead(chatId, clientePath, 'interest');
            return interesse !== 'Não' && !numerosExistentes.has(item.Telefone); // Verifica se o número já existe na lista de follow-up
          })
          .map((item: { Telefone: string }) => {
            let dadosJson;
            try {
              const dadosFilePath = path.join(clientePath, 'Chats', 'Historico', `${item.Telefone}`, 'Dados.json');
              dadosJson = JSON.parse(fs.readFileSync(dadosFilePath, 'utf-8'));
            } catch (error) {
              const chatId = item.Telefone + `@c.us`;
              const ultimaMensagem = getLastMessageDate(chatId, clientePath);
              const dadosDoLead = getLeadData(chatId, clientePath) || {}; // Garante que dadosDoLead não seja undefined

              // Procura o nome no Dados.json primeiro
              let nome = dadosDoLead?.Nome ? dadosDoLead.Nome.split(': ')[1] : ''; 

              // Se o nome ainda estiver vazio, procure nas listas de disparo
              if (nome === '') {
                const numeroTelefone = chatId.replace('@c.us', '');
                const listaDisparoDirPath = path.join(clientePath, 'listas', 'disparar');
                const listaArquivos = fs.readdirSync(listaDisparoDirPath);

                for (const arquivo of listaArquivos) {
                  const listaPath = path.join(listaDisparoDirPath, arquivo);
                  if (fs.statSync(listaPath).isFile() && path.extname(listaPath) === '.json') {
                    const listaData = JSON.parse(fs.readFileSync(listaPath, 'utf-8'));
                    const leadNaLista = listaData.find((item: any) => item.Telefone === numeroTelefone);

                    if (leadNaLista && leadNaLista.hasOwnProperty('Nome')) {
                      nome = leadNaLista.Nome; // Define o nome encontrado na lista
                      break; // Sai do loop após encontrar o nome
                    }
                  }
                }
              }
            
            const orçamento = dadosDoLead?.orçamento ? dadosDoLead.orçamento.split(': ')[1] : ''; // Extrai o nome após ": "
            const orçamentoData = dadosDoLead?.orçamentoData ? dadosDoLead.orçamentoData.split(': ')[1] : '';
            const tags = dadosDoLead?.tags ? dadosDoLead.tags.split(': ')[1] : '';

            // Mapeia as strings do Dados.json
            let dadosFormatados: { [key: string]: string } = {};
            for (const chave in dadosJson) {
              if (dadosJson.hasOwnProperty(chave)) {
                dadosFormatados[chave] = dadosJson[chave];
              }
            }
  
  
            return {
              Telefone: item.Telefone,
              'Ultima mensagem': ultimaMensagem || '',
              'Mensagens sem retorno': '',
              'Agendamento marcado': '',
              Nome: nome,
              'Nivel FollowUp': '1',
              'Já pediu orçamento': orçamento,
              'Data do ultimo orçamento': orçamentoData,
              'Tags': tags,
            };
          }
        });

        // Adiciona os novos números à lista de follow-up
        numerosFollowUp = [...numerosFollowUp, ...novosNumerosFollowUp];

        // Ordena os números por data da última mensagem em ordem crescente
        numerosFollowUp.sort((a, b) => {
          const dateA = a['Ultima mensagem'];
          const dateB = b['Ultima mensagem'];
          return compareDates(dateA, dateB);
        });

        // Salva a lista de follow-up atualizada
        fs.writeFileSync(followupFilePath, JSON.stringify(numerosFollowUp, null, 2));
        console.log(`Lista ${listaNome} filtrada e salva em followup/listas.`);
        await disparoFollow(listaNome, clientePath, client);
      }
    }
  } catch (error) {
    console.error('Erro ao filtrar números para follow-up:', error);
  }
};


export { filtrarNumerosFollowUp };