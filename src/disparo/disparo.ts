import fs from 'fs';
import path from 'path';
import { extrairListas } from './extrairListas'; 
import { relatorios } from '../relatorio/relatorios'; 
import { filtrarNumerosFollowUp } from '../followup/checkFollow'; 
import { format, getDay, nextMonday, setHours, isWithinInterval } from 'date-fns';

// Função para extrair um valor numérico de uma string
const extrairValorNumerico = (texto: string): number => {
  const numeros = texto.match(/\d+/g);
  return numeros ? parseInt(numeros[0]) : 0;
};

// Função para salvar mensagens em um arquivo
function saveMessageToFile(client: string, clientePath: string, chatId: string, message: string, type: `User` | `IA`) {
  const chatDir = path.join( clientePath, `Chats`, `Historico`, chatId);
  const fileName = `${chatId}.json`;
  const filePath = path.join(clientePath, `Chats`, `Historico`, `${chatId}`, `${chatId}.json`);

  // Cria o diretório se ele não existir
  if (!fs.existsSync(chatDir)) {
    console.log(`Criando diretório para o chatId:`, chatId);
    fs.mkdirSync(chatDir, { recursive: true });
  }

  // Cria o arquivo Dados.json se ele não existir
  const dadosFilePath = path.join( clientePath, `Chats`, `Historico`, `${chatId}`, `Dados.json`);
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
}

// Função para gerar um tempo aleatório dentro de um intervalo
const gerarTempoAleatorio = (intervaloDe: number, intervaloAte: number): number => {
  return Math.floor(Math.random() * (intervaloAte - intervaloDe + 1) + intervaloDe) * 1000; 
};

// Função para extrair a mensagem do arquivo JSON
const extrairMensagem = (listaNome: string, clientePath: string, nome: string): string => {
  const filePath = path.join( clientePath , 'abordagens', `${listaNome}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data); 

    if (jsonData.hasOwnProperty('ATUAL')) { 
      const mensagem = jsonData.ATUAL.replace("{nome}", nome); 
      console.log('Mensagem extraída do arquivo JSON:', mensagem); 
      return mensagem;
    } else {
      throw new Error(`A chave "ATUAL" não existe no arquivo JSON: ${filePath}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Disparo - Erro ao ler o arquivo ${filePath}: ${error.message}`);
    } else {
      console.error(`Disparo - Erro ao ler o arquivo ${filePath}: ${error}`);
    }
    return "Disparo - Erro ao encontrar a mensagem no arquivo."; 
  }
};

// Função para filtrar números existentes no arquivo JSON e adicionar informações
const filtrarNumerosExistentes = async (listaNome: string, clientePath: string, numerosExtraidos: string[], nome: string) => {
  const arquivoDisparo = path.join( clientePath, 'listas', 'disparar', `${listaNome}.json`);
  const nomecontato = getContactName;

  try {
    let lista: any[] = []; // Inicializa a lista como um array vazio
    if (fs.existsSync(arquivoDisparo)) {
      const data = fs.readFileSync(arquivoDisparo, 'utf8');
      lista = JSON.parse(data);
    }

    // Adicionando informações de disparo
    numerosExtraidos.forEach(telefone => {
      lista.push({ Telefone: telefone, Nome: nomecontato, Disparo: "Não", Data: "" });
    });

    // Removendo duplicatas e mantendo apenas um registro com "Disparo: Sim"
    const uniqueList = lista.reduce((acc: any[], current: any) => {
      const existingIndex = acc.findIndex(item => item.Telefone === current.Telefone);
      if (existingIndex !== -1) {
        // Se o número já existe, verifica se o registro atual tem "Disparo: Sim"
        if (current.Disparo === "Sim") {
          // Se o registro atual tem "Disparo: Sim", substitui o registro existente
          acc[existingIndex] = current;
        }
      } else {
        // Se o número não existe, adiciona o registro atual
        acc.push(current);
      }
      return acc;
    }, []);

    // Escrevendo os dados no arquivo JSON
    fs.writeFileSync(arquivoDisparo, JSON.stringify(uniqueList, null, 2));

    return numerosExtraidos;
  } catch (error) {
    console.error(`Disparo - Erro ao filtrar números existentes e adicionar informações no arquivo ${arquivoDisparo}: ${error instanceof Error ? error.message : error}`);
    return [];
  }
};

// Função para ler e criar o arquivo de dados
const LCFdados = async (listaNome: string, clientePath: string, numerosExtraidos: string[], nome: string) => {
  const arquivoDisparo = path.join( clientePath, 'listas', 'disparar', `${listaNome}.json`);
  const arquivoDownload = path.join( clientePath, 'listas', 'download', `${listaNome}.json`);
  const nomecontato = getContactName;

  try {
    let lista: any[] = []; // Inicializa a lista como um array vazio
    if (fs.existsSync(arquivoDisparo)) {
      const data = fs.readFileSync(arquivoDisparo, 'utf8');
      lista = JSON.parse(data);
    }

    // Se o arquivo de download existir, lê os dados
    if (fs.existsSync(arquivoDownload)) {
      const dataDownload = fs.readFileSync(arquivoDownload, 'utf8');
      const listaDownload = JSON.parse(dataDownload);

      // Filtra os números que não estão na lista de disparo
      const novosNumeros = listaDownload.filter((item: { Telefone: string }) => !lista.some((item2: { Telefone: string }) => item2.Telefone === item.Telefone));

      // Adiciona os novos números à lista de disparo
      novosNumeros.forEach((item: { Telefone: string }) => {
        lista.push({ Telefone: item.Telefone, Nome: nomecontato, Disparo: "Não", Data: "" });
      });
    }

    // Escreve os dados no arquivo JSON
    fs.writeFileSync(arquivoDisparo, JSON.stringify(lista, null, 2));

    return numerosExtraidos;
  } catch (error) {
    console.error(`Disparo - Erro ao ler e criar o arquivo de dados: ${error instanceof Error ? error.message : error}`);
    return [];
  }
};

// Função para atualizar a lista com informações de disparo
const atualizarListaComDisparo = async (listaNome: string, clientePath: string, numeroExtraido: string, dataDisparo: string, sucesso: boolean, client: string) => {
  const arquivoDisparo = path.join( clientePath, 'listas', 'disparar', `${listaNome}.json`);
  
  try {
    let lista: any[] = []; // Inicializa a lista como um array vazio
    if (fs.existsSync(arquivoDisparo)) {
      const data = fs.readFileSync(arquivoDisparo, 'utf8');
      lista = JSON.parse(data);
    }

    // Encontra o índice do número na lista
    const indice = lista.findIndex(item => item.Telefone === numeroExtraido);

    // Se o número for encontrado, atualiza as informações de disparo
    if (indice !== -1) {
      // Get the contact name from the download folder
      const nome = getContactName(numeroExtraido, listaNome, clientePath);

      lista[indice].Disparo = sucesso ? "Sim" : "Não"; // Atualiza o status do disparo
      lista[indice].Data = dataDisparo;
      lista[indice].Whats = client;
      lista[indice].Nome = nome; // Update the name in the list with the contact's name
      fs.writeFileSync(arquivoDisparo, JSON.stringify(lista, null, 2));
      console.log(`Número ${numeroExtraido} atualizado na lista ${listaNome} com Disparo: ${sucesso ? "Sim" : "Não"} e Data: ${dataDisparo}`);
    } else {
      console.error(`Número ${numeroExtraido} não encontrado na lista ${listaNome}`);
    }

    return numeroExtraido;
  } catch (error) {
    console.error(`Erro ao atualizar a lista com informações de disparo: ${error instanceof Error ? error.message : error}`);
    return "";
  }
};


// Função para verificar se o número tem conta no WhatsApp
const verificarContaWhatsApp = async (client: any, telefone: string): Promise<boolean> => {
  try {
    const contactId = `${telefone}@c.us`;
    const profile = await client.checkNumberStatus(contactId); 

    // Check if the number is a valid WhatsApp number
    if (profile.status === 'notRegistered') {
      console.log(`O número ${telefone} não está registrado no WhatsApp.`);
      return false; // Not a valid WhatsApp number
    } else {
      console.log(`O número ${telefone} está registrado no WhatsApp.`);
      return true; // Valid WhatsApp number 
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Disparo - Erro ao verificar conta do WhatsApp para ${telefone}: ${error.message}`);
    } else {
      console.error(`Disparo - Erro ao verificar conta do WhatsApp para ${telefone}: ${String(error)}`);
    }
    return false; // Return false if there's an error
  }
};

// Function to get the contact name from the download folder
const getContactName = (telefone: string, clientePath: string, listaNome: string): string => {
  const filePath = path.join( clientePath, 'listas', 'download', `${listaNome}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    const contact = jsonData.find((item: { Telefone: string; Nome: string }) => item.Telefone === telefone);
    return contact ? contact.Nome : ""; // Return the contact's name if found, otherwise return an empty string
  } catch (error) {
    console.error(`Disparo - Erro ao ler o arquivo ${filePath}: ${error instanceof Error ? error.message : error}`);
    return ""; // Return an empty string if there's an error
  }
};

// Função para verificar se dentro do horário permitido
const dentroDoHorario = (horarioInicial: string, horarioFinal: string): boolean => {
  const agora = new Date();
  const inicio = new Date(agora);
  const fim = new Date(agora);

  const [horaInicial, minutoInicial] = horarioInicial.split(':').map(Number);
  const [horaFinal, minutoFinal] = horarioFinal.split(':').map(Number);

  inicio.setHours(horaInicial, minutoInicial, 0);
  fim.setHours(horaFinal, minutoFinal, 0);

  return agora >= inicio && agora <= fim;
};
  

// Função para verificar se o dia da semana está do intervalo permitido
const diaDaSemanaValido = (diaInicial: string, diaFinal: string): boolean => {
  const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const hoje = getDay(new Date()); // Usando date-fns para obter o dia da semana (0 - Domingo, 6 - Sábado)

  const indexDiaInicial = diasDaSemana.indexOf(diaInicial);
  const indexDiaFinal = diasDaSemana.indexOf(diaFinal);

  // Ajustando a lógica para considerar que o intervalo pode começar no final da semana e terminar no início
  if (indexDiaInicial > indexDiaFinal) {
    return hoje >= indexDiaInicial || hoje <= indexDiaFinal;
  } else {
    return hoje >= indexDiaInicial && hoje <= indexDiaFinal;
  }
};

// Função para salvar logs em um arquivo
const salvarLog = (mensagem: string, clientePath: string) => {
  const logPath = path.join( clientePath, 'erros', 'log.txt');
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${mensagem}\n`;
  fs.appendFileSync(logPath, logMessage);
  console.log(mensagem);
};

// Função para registrar o estado do bot
const registrarEstado = (estado: any, clientePath: string ) => {
  const estadoLog = `Estado do bot:\n
    Último dia de disparo: ${estado.ultimoDiaDisparo}\n
    Dias restantes de aquecimento: ${estado.diasRestantesAquecimento}\n
    Quantidade de mensagens do dia: ${estado.quantidadeMensagensDia}\n
    Lista atual: ${estado.listaAtual}\n
    Telefone atual: ${estado.indiceTelefoneAtual}\n`;
  salvarLog(estadoLog, clientePath);
};

// Função para salvar o estado atual
const salvarEstado = (estado: any, clientePath: string) => {
  const estadoPath = path.join( clientePath, 'erros', 'estado.json');
  fs.writeFileSync(estadoPath, JSON.stringify(estado, null, 2));
};

// Função para carregar o estado salvo
const carregarEstado = ( clientePath: string): any => {
  const estadoPath = path.join( clientePath, 'Erros', 'estado.json');
  if (fs.existsSync(estadoPath)) {
    const data = fs.readFileSync(estadoPath, 'utf8');
    return JSON.parse(data);
  }
  return null;
};

let disparoHoje = 0;



// Função para verificar se o número já foi disparado
const numeroJaDisparado = async (listaNome: string, clientePath: string, telefone: string): Promise<boolean> => {
  const arquivoDisparo = path.join( clientePath, 'listas', 'disparar', `${listaNome}.json`);

  try {
    if (!fs.existsSync(arquivoDisparo)) {
      return false; // O arquivo não existe, então o número não foi disparado
    }

    const data = fs.readFileSync(arquivoDisparo, 'utf8');
    const lista = JSON.parse(data);

    // Procura pelo número na lista e verifica se Disparo === "Sim"
    const numeroEncontrado = lista.find((item: { Telefone: string; Disparo: string }) => item.Telefone === telefone && item.Disparo === "Sim");

    return !!numeroEncontrado; // Retorna true se o número foi encontrado com Disparo: "Sim"
  } catch (error) {
    console.error(`Disparo - Erro ao verificar se o número já foi disparado: ${error instanceof Error ? error.message : error}`);
    return false; // Em caso de erro, assume que o número não foi disparado
  }
};

const diaspassados = 0;

export function getPasta(cliente: string) {
  return path.join(process.cwd(), `clientes`, cliente); //ATENÇÃO essse é o unico que não pode mexer no process.cwd
}


// Função principal para disparar
const dispararMensagens = async (client: any, clientePath: any) => {

  let estado = carregarEstado(clientePath) || {
    ultimoDiaDisparo: '',
    diasRestantesAquecimento: 0,
    quantidadeMensagensDia: disparoHoje,
    diaspassados: diaspassados,
    listaAtual: '',
    indiceTelefoneAtual: ''
  };


  // Função para verificar o disparo de hoje
  const arquivosDisparo = fs.readdirSync(path.join( clientePath, 'listas', 'disparar'));
  const hoje = new Date();
  const dataRelatorio = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  for (const arquivo of arquivosDisparo) {
    console.log(`Analisando arquivo de disparo: ${arquivo}`);
    if (path.extname(arquivo) === '.json') {
      const filePath = path.join( clientePath, 'listas', 'disparar', arquivo);
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const lista = JSON.parse(data);
        disparoHoje += lista.filter((item: { Data: string; Disparo: string; }) => item.Data.includes(`${dataRelatorio}`) && item.Disparo === 'Sim').length;
        console.log(`Disparos encontrados no arquivo: ${disparoHoje}`);
      } catch (error) {
        console.error(`Erro ao analisar o arquivo de disparo: ${error}`);
      }
    }
  }

  console.log(`iniciando disparo.ts`);
  
  try {
  
    // Carregando as regras de disparo
    const regrasDisparoPath = path.join(clientePath, 'config', '.regrasdisparo');
    const regrasDisparoRaw = fs.readFileSync(regrasDisparoPath, 'utf-8');
    const regrasDisparo = regrasDisparoRaw.split('\n').map(linha => linha.trim());

    // Encontrando os valores de INTERVALO_DE e INTERVALO_ATE
    const horarioInicial = regrasDisparo.find(linha => linha.startsWith('HORARIO_INICIAL='))?.split('=')[1] || '00:00';
    const horarioFinal = regrasDisparo.find(linha => linha.startsWith('HORARIO_FINAL='))?.split('=')[1] || '23:59';
    const diaInicial = regrasDisparo.find(linha => linha.startsWith('DIA_INICIAL='))?.split('=')[1] || 'segunda';
    const diaFinal = regrasDisparo.find(linha => linha.startsWith('DIA_FINAL='))?.split('=')[1] || 'sábado';

    const intervaloDe = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('INTERVALO_DE='))?.split('=')[1] || '0');
    const intervaloAte = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('INTERVALO_ATE='))?.split('=')[1] || '0');

    // Carregando as regras de aquecimento
    const quantidadeInicial = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('QUANTIDADE_INICIAL='))?.split('=')[1] || '0');
    const diasAquecimento = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('DIAS_AQUECIMENTO='))?.split('=')[1] || '0');
    const quantidadeLimite = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('QUANTIDADE_LIMITE='))?.split('=')[1] || '0');
    const quantidadeSequencia = extrairValorNumerico(regrasDisparo.find(linha => linha.startsWith('QUANTIDADE_SEQUENCIA='))?.split('=')[1] || '0');

    // Verifica se a linha MIDIA= está preenchida
    const linhaMidia = regrasDisparo.find(linha => linha.startsWith('MIDIA='));
    let imagem = '';
    if (linhaMidia) {
      imagem = linhaMidia.split('=')[1].trim();
    }

    // Carregando as listas de contatos
    const arquivoListas = path.join( clientePath, '.listas');
    const listas = await extrairListas(arquivoListas, clientePath);
    const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    // Iterando sobre os dias da semana
    for (const diaDaSemana of diasDaSemana) { 
      const estadoPath = path.join( clientePath, 'Erros', 'estado.json');
      estado.ultimoDiaDisparo = new Date().toDateString();
      estado.diasRestantesAquecimento = diasAquecimento;
      estado.quantidadeMensagensDia = disparoHoje;
      estado.listaAtual = '';
      estado.indiceTelefoneAtual = '';
      fs.writeFileSync(estadoPath, JSON.stringify(estado, null, 2));
    } 

    function salvarLog(mensagem: string) {
      const logPath = path.join( clientePath, 'Erros', 'log.txt');
      fs.appendFileSync(logPath, `${new Date().toLocaleString()} - ${mensagem}\n`);
    }

    
    // Calcula a quantidade de mensagens a serem enviadas por dia
    let quantidadeMensagensDia = quantidadeInicial;
    let diasRestantesAquecimento = diasAquecimento;

    // Incrementa a quantidade de mensagens do dia se estiver no período de aquecimento
     if (diaspassados <= diasAquecimento) {
      // Calcula a quantidade de mensagens para o dia de aquecimento
      quantidadeMensagensDia = Math.min(
      quantidadeInicial + Math.floor(((quantidadeLimite - quantidadeInicial) / diasAquecimento) * diaspassados),
      quantidadeLimite
    );
    } else {
      // Quantidade limite após o período de aquecimento
      quantidadeMensagensDia = quantidadeLimite;
    }
    

    // Iterando sobre os dias
    while (true) {
      const hoje = new Date().toDateString();

      // Verifica se é um novo dia
      if (hoje !== estado.ultimoDiaDisparo) {
        estado.contadorMensagens = 0; // Reinicia o contador a cada novo dia
        estado.ultimoDiaDisparo = hoje; // Atualiza a data do último disparo
        estado.diaspassados++; // Incrementa o contador de dias passados
        salvarLog(`Novo dia iniciado: ${hoje}`);

        // Reinicia o índice do telefone se for um novo dia
        estado.indiceTelefoneAtual = 0; 
      }

      // Incrementa a quantidade de mensagens do dia se estiver no período de aquecimento
      if (diaspassados <= diasAquecimento) {
        // Calcula a quantidade de mensagens para o dia de aquecimento
        quantidadeMensagensDia = Math.min(
        quantidadeInicial + Math.floor(((quantidadeLimite - quantidadeInicial) / diasAquecimento) * diaspassados),
        quantidadeLimite
      );
      } else {
        // Quantidade limite após o período de aquecimento
        quantidadeMensagensDia = quantidadeLimite;
      }
      
            
      // Iterando sobre as listas
      for (const lista of listas) {
        estado.listaAtual = lista.nome;
        salvarLog(`Processando lista: ${lista.nome}`);


      // Pega a mensagem da função extrairMensagem
      let contadorMensagens = 0;
      

      // Carrega os números extraídos
      const numerosExtraidos = lista.telefones;

      // Filtra os números existentes
      const numerosFiltrados = await LCFdados(lista.nome, clientePath, numerosExtraidos, lista.nome);
      
      await filtrarNumerosExistentes(lista.nome, clientePath, numerosExtraidos, lista.nome);


      // Disparando mensagens
      for (let i = estado.indiceTelefoneAtual; i < numerosFiltrados.length; i++) {
        const telefone = numerosFiltrados[i];
        
        const chatId = telefone + `@c.us`;
        const dataDisparo = new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }); // Formata a data e hora

        // Verifica se o número já foi disparado
        const jaFoiDisparado = await numeroJaDisparado(lista.nome, clientePath, telefone);

        if (jaFoiDisparado) {
          console.log(`Número ${telefone} já foi disparado, pulando para o próximo.`);
          salvarLog(`Número ${telefone} já foi disparado, pulando para o próximo.`);
          continue; // Pula para o próximo número
        }

        // Verifica se está dentro do intervalo de dias
        if (!diaDaSemanaValido(diaInicial, diaFinal)) {
          console.log(`Fora do intervalo de dias permitido. Aguardando o próximo dia útil...`);
          salvarLog(`Fora do intervalo de dias permitido. Aguardando o próximo dia útil...`);

          // Calcula o tempo de espera até o próximo dia válido
          let proximoDiaUtil = nextMonday(new Date()); // Começa a busca a partir da próxima segunda
          while (!diaDaSemanaValido(diaInicial, diaFinal)) {
            proximoDiaUtil = new Date(proximoDiaUtil.getTime() + 24 * 60 * 60 * 1000); // Avança um dia
          }
          
          const [horaInicialNum, minutoInicialNum] = horarioInicial.split(':').map(Number);
          proximoDiaUtil.setHours(horaInicialNum, minutoInicialNum, 0, 0);
          
          const tempoEspera = proximoDiaUtil.getTime() - 1 - new Date().getTime();
          console.log(`Aguardando até ${proximoDiaUtil.toLocaleString('pt-BR')} (${tempoEspera / 1000 / 60 / 60} horas)...`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
          continue; // Volta para o início do loop para verificar o dia novamente
        }

        // Verifica se está dentro do horário permitido usando date-fns
        const agora = new Date();
        const [horaInicialNum, minutoInicialNum] = horarioInicial.split(':').map(Number);
        const [horaFinalNum, minutoFinalNum] = horarioFinal.split(':').map(Number);
        let inicioHorario = setHours(agora, horaInicialNum);
        let fimHorario = setHours(agora, horaFinalNum);
        
        if (!isWithinInterval(agora, { start: inicioHorario, end: fimHorario })) {
          console.log(`Fora do horário permitido. Aguardando até ${horarioInicial}...`);
          salvarLog(`Fora do horário permitido. Aguardando até ${horarioInicial}`);

          // Calcula o tempo de espera até o próximo horário válido
          const proximoHorario = new Date(agora);
          proximoHorario.setHours(horaInicialNum, minutoInicialNum, 0, 0);
          if (proximoHorario < agora) {
            proximoHorario.setDate(proximoHorario.getDate() + 1); // Avança para o próximo dia
          }
          const tempoEspera = proximoHorario.getTime() - agora.getTime();
          console.log(`Aguardando ${tempoEspera / 1000 / 60 / 60} horas até ${format(proximoHorario, 'dd/MM/yyyy HH:mm:ss')}...`);
          salvarLog(`Aguardando ${tempoEspera / 1000 / 60 / 60} horas até ${format(proximoHorario, 'dd/MM/yyyy HH:mm:ss')}...`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
          continue; // Volta para o início do loop para verificar o horário novamente
        }

  
        // **Check if the current time is within the valid hours**
        if (!dentroDoHorario(horarioInicial, horarioFinal)) {
          
          await relatorios(client, clientePath)
          .then(() => console.log('Relatórios enviados!'))
          .catch((error) => console.error('Disparo - Erro ao enviar relatorio:', error));

          // Calcula a quantidade de mensagens a serem enviadas por dia
          diasRestantesAquecimento--;
          console.log(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);
          salvarLog(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);

          console.log(`Fora do horário permitido. Aguardando até ${horarioInicial}...`);
          salvarLog(`Fora do horário permitido. Aguardando até ${horarioInicial}`);

         
          // Calculate the time to wait until the next valid hour
          const agora = new Date();
          const fim = new Date(agora); // Use horário final como base
          const [horaFinal, minutoFinal] = horarioFinal.split(':').map(Number);
          fim.setHours(horaFinal, minutoFinal, 0);

          // Se o horário final já passou hoje, calcula o tempo de espera até o horário inicial de amanhã
          if (fim < agora) {
            const [horaInicial, minutoInicial] = horarioInicial.split(':').map(Number);
            fim.setDate(fim.getDate() + 1); // Avança para o próximo dia
            fim.setHours(horaInicial, minutoInicial, 0); // Define o horário para o início do próximo dia
            // Chamar a função filtrarNumerosFollowUp após o término do disparo
            console.log('Disparo do dia finalizado. Iniciando filtragem para follow-up...');
            filtrarNumerosFollowUp(clientePath, client)
              .then(() => {
                console.log('Filtragem para follow-up concluída.');
              })
              .catch((error) => {
                console.error('Erro durante a filtragem para follow-up:', error);
              });
          }

          const tempoEspera = fim.getTime() - agora.getTime();
          console.log(`Aguardando ${tempoEspera / 1000 / 60 / 60} horas até ${fim.toLocaleString('pt-BR')}...`);
          salvarLog(`Aguardando ${tempoEspera / 1000 / 60 / 60} horas até ${fim.toLocaleString('pt-BR')}...`);

          estado.contadorMensagens = 0; // Reinicia o contador a cada novo dia


          // Aguarda o tempo de espera
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
        } else {
            // Calculate the time to wait until the next valid schedule
          const now = new Date();
          let nextValidTime = new Date(now);
    
          // Adjust the time to the next valid day if necessary
          if (!diaDaSemanaValido(diaInicial, diaFinal)) {
            nextValidTime.setDate(nextValidTime.getDate() + 1); // Move to the next day
            while (!diaDaSemanaValido(diaInicial, diaFinal)) {
              nextValidTime.setDate(nextValidTime.getDate() + 1); // Keep moving until a valid day is found
            }
          }
    
          // Adjust the time to the next valid hour if necessary
          if (!dentroDoHorario(horarioInicial, horarioFinal)) {
            const [horaInicial, minutoInicial] = horarioInicial.split(':').map(Number);
            nextValidTime.setHours(horaInicial, minutoInicial, 0); // Set to the next valid hour
            if (nextValidTime < now) {
              nextValidTime.setDate(nextValidTime.getDate() + 1); // Move to the next day if the hour has already passed
              // **Check if the next day is a valid day of the week**
              if (!diaDaSemanaValido(diaInicial, diaFinal)) {
                nextValidTime.setDate(nextValidTime.getDate() + 1); // Move to the next valid day
                while (!diaDaSemanaValido(diaInicial, diaFinal)) {
                  nextValidTime.setDate(nextValidTime.getDate() + 1); // Keep moving until a valid day is found
                }
              }
            }
          }
    
          const waitTime = nextValidTime.getTime() - now.getTime();
          console.log(`Waiting for ${waitTime / 1000} seconds until the next valid schedule...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        
        // Se o número já foi disparado, pula para o próximo
        if (typeof jaFoiDisparado === 'number' && jaFoiDisparado === 0) {
          console.log(`Número ${telefone} já foi disparado, pulando para o próximo.`);
          continue; // Pula para o próximo número
        }

        const temWhatsApp = await verificarContaWhatsApp(client, telefone); // Verifica se o número tem WhatsApp

        if (!temWhatsApp) {
          console.log(`O número ${telefone} não tem WhatsApp.`);
          continue; // Pula para o próximo número
        }

        // Verifica se a quantidade de mensagens do dia foi atingida
        if (contadorMensagens >= quantidadeMensagensDia) {      
        
          // Verifica se a quantidade de mensagens do dia foi atingida
          if (disparoHoje >= quantidadeMensagensDia) {
            registrarEstado(estado, clientePath);
            console.log(`Quantidade de mensagens do dia atingida ${contadorMensagens}. Aguardando o próximo ciclo de disparo...`);
            salvarLog(`Quantidade de mensagens do dia atingida ${contadorMensagens}. Aguardando o próximo ciclo de disparo...`);
            
            // Calcula a quantidade de mensagens a serem enviadas por dia
            diasRestantesAquecimento--;
            console.log(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);
            salvarLog(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);

          
              // Chamar a função filtrarNumerosFollowUp após o término do disparo
            console.log('Disparo do dia finalizado. Iniciando filtragem para follow-up...');
            filtrarNumerosFollowUp(clientePath, client)
              .then(() => {
                console.log('Filtragem para follow-up concluída.');
              })
              .catch((error) => {
                console.error('Erro durante a filtragem para follow-up:', error);
              });
            break; // Sai do loop de disparo e aguarda o próximo ciclo
          }

          // Envia o relatório                
          await relatorios(client, clientePath)
          .then(() => console.log('Relatórios enviados!'))
          .catch((error) => console.error('Disparo - Erro ao enviar relatorio:', error));

          // Chamar a função filtrarNumerosFollowUp após o término do disparo
          console.log('Disparo do dia finalizado. Iniciando filtragem para follow-up...');
          filtrarNumerosFollowUp(clientePath, client)
            .then(() => {
              console.log('Filtragem para follow-up concluída.');
            })
            .catch((error) => {
              console.error('Erro durante a filtragem para follow-up:', error);
            });

          registrarEstado(estado, clientePath);      
          console.log(`Quantidade de mensagens do dia atingida ${contadorMensagens}. Aguardando o próximo dia...`);
          salvarLog(`Quantidade de mensagens do dia atingida ${contadorMensagens}. Aguardando o próximo dia...`);
          
          // Calcula a quantidade de mensagens a serem enviadas por dia
          diasRestantesAquecimento--;
          console.log(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);
          salvarLog(`limite de mensagem aumenttado para: ${quantidadeMensagensDia} | dias restante do aquecimento: ${diasRestantesAquecimento}`);


            // Chamar a função filtrarNumerosFollowUp após o término do disparo
          console.log('Disparo do dia finalizado. Iniciando filtragem para follow-up...');
          filtrarNumerosFollowUp(clientePath, client)
            .then(() => {
              console.log('Filtragem para follow-up concluída.');
            })
            .catch((error) => {
              console.error('Erro durante a filtragem para follow-up:', error);
            });

          
          // Calcula o tempo de espera até o próximo dia
          const agora = new Date();
          const proximoDia = new Date(agora);
          proximoDia.setDate(proximoDia.getDate() + 1); // Adiciona um dia
          const tempoEspera = proximoDia.getTime() - agora.getTime();
          await new Promise(resolve => setTimeout(resolve, tempoEspera));

          // Reinicia o contador de mensagens do dia
          contadorMensagens = 0;
          
          // Incrementa a quantidade de mensagens do dia se estiver no período de aquecimento
          if (diaspassados <= diasAquecimento) {
            // Calcula a quantidade de mensagens para o dia de aquecimento
            const aumentoDeMensagem = Math.floor(((quantidadeLimite - quantidadeInicial) / diasAquecimento) * diaspassados);
            
            quantidadeMensagensDia =  quantidadeInicial + aumentoDeMensagem

          } else {
            // Quantidade limite após o período de aquecimento
            quantidadeMensagensDia = quantidadeLimite;
          }
        }
                
          // Incrementa o contador de mensagens enviadas
          contadorMensagens++;
          

        // Enviando a mensagem
        try {
          // Get the contact name from the download folder
          const nome = getContactName(telefone, clientePath, lista.nome);

          const mensagem = extrairMensagem(lista.nome, clientePath, nome); // Pass the contact name to the extrairMensagem function

          await client.sendText(chatId, mensagem);

          const sucessoDisparo = true;

          console.log(`Mensagem enviada para ${telefone} | ${contadorMensagens} de ${quantidadeMensagensDia} | ${sucessoDisparo ? 'sucesso' : 'falha'}`);

     
          // Corrigindo a formatação da data e hora para incluir mês, dia, ano, hora, minuto e segundo
          const dataDisparo = new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }); // Formata a data e hora
          await atualizarListaComDisparo(lista.nome, clientePath, telefone, dataDisparo, !!sucessoDisparo, client.id); // Atualiza a lista com o status do disparo
          salvarEstado(estado, clientePath);
          salvarLog(`Mensagem enviada para ${telefone} | ${contadorMensagens} de ${quantidadeMensagensDia}`);
        } catch (error) {
          console.error(`Disparo - Erro ao enviar mensagem para ${telefone}:`, error);
          salvarLog(`Disparo - Erro ao enviar mensagem para ${telefone}: ${error}`);
          await atualizarListaComDisparo(lista.nome, clientePath, telefone, "Não", false, client);
        }
        //Salvar historico chatid
        const nome = getContactName(telefone, clientePath, lista.nome);
        const mesage = extrairMensagem(lista.nome, clientePath, nome);
        await saveMessageToFile(client, clientePath, chatId, mesage, 'IA');  

        // Aguarda um tempo aleatório entre INTERVALO_DE e INTERVALO_ATE
        const tempoEspera = gerarTempoAleatorio(intervaloDe, intervaloAte);
        console.log(`Aguardando ${tempoEspera / 1000} segundos...`);
        salvarLog(`Aguardando ${tempoEspera / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, tempoEspera)); 

        // Aguarda uma hora após enviar 50 mensagens
        if (contadorMensagens % quantidadeSequencia === 0) {
            registrarEstado(estado, clientePath); // Log the state before the hourly pause
            console.log('Pausa de 1 hora...');
            salvarLog('Pausa de 1 hora...');
            await new Promise(resolve => setTimeout(resolve, 3600000)); // Aguarda 1 hora (3600000 milissegundos)
        }
            
      }
    }
      // Aguarda antes de iniciar o próximo ciclo
      registrarEstado(estado, clientePath); // Log the state before the daily pause
      salvarLog('Ciclo de disparo concluído. Aguardando próximo ciclo...');
      

      // Calcula o tempo restante até o próximo HORARIO_INICIAL
      const agora = new Date();
      const proximoDisparo = new Date(agora);
      const [horaInicialNum, minutoInicialNum] = horarioInicial.split(':').map(Number);
      
      // Define a hora para HORARIO_INICIAL
      proximoDisparo.setHours(horaInicialNum, minutoInicialNum, 0, 0);
      
      // Ajusta para o próximo dia válido (considerando diaInicial, diaFinal e horário atual)
      while (proximoDisparo < agora || !diaDaSemanaValido(diaInicial, diaFinal)) {
        proximoDisparo.setDate(proximoDisparo.getDate() + 1);
      
        // Se for domingo, volta para o dia inicial da semana
        if (proximoDisparo.getDay() === 0) {
          proximoDisparo.setDate(proximoDisparo.getDate() + (diasDaSemana.indexOf(diaInicial) + 1));
        }
      
        // Define a hora para HORARIO_INICIAL após avançar o dia
        proximoDisparo.setHours(horaInicialNum, minutoInicialNum, 0, 0);
      }
      
      const tempoEspera = proximoDisparo.getTime() - agora.getTime();
      console.log(`Aguardando até ${proximoDisparo.toLocaleString('pt-BR')} (${tempoEspera / 1000 / 60 / 60} horas)...`);
      salvarLog(`Aguardando até ${proximoDisparo.toLocaleString('pt-BR')} (${tempoEspera / 1000 / 60 / 60} horas)...`);
            
      // Chamar a função filtrarNumerosFollowUp após o término do disparo
      console.log('Disparo do dia finalizado. Iniciando filtragem para follow-up...');
        filtrarNumerosFollowUp(clientePath, client)
          .then(() => {
            console.log('Filtragem para follow-up concluída.');
          })
          .catch((error) => {
            console.error('Erro durante a filtragem para follow-up:', error);
          });
      await new Promise(resolve => setTimeout(resolve, tempoEspera));
    }

  } catch (error) {
    console.error(`Disparo - Erro ao disparar mensagens: ${error}`);
    await iniciarDisparoComRecuperacao(client, clientePath); 
    salvarLog(`Disparo - Erro ao disparar mensagens: ${error}`, clientePath); 
  };
};

// Função para iniciar o processo de disparo com recuperação de erros
const iniciarDisparoComRecuperacao = async (client: any, clientePath: any) => {
  while (true) {
    try {
      await dispararMensagens(client, clientePath);
    } catch (error) {
      salvarLog(`Disparo - Erro ao disparar mensagens: ${error}`, clientePath);
      console.error(`Erro no processo de disparo. Tentando recuperar...`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Espera 1 minuto antes de tentar novamente
    }
  }
};

export { dispararMensagens };
