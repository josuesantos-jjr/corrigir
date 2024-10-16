import fs from 'fs';
import path from 'path';


// Conta as conversas ativas
async function encontrarConversasAtivas(cliente: any, clientePath: string) {
  const hoje = new Date().toLocaleDateString('pt-BR'); // Formato: "dia/mes/ano"
  const pastaHistorico = path.join(clientePath, 'Chats', 'Historico');
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
  };
  return quantidadeEncontrada
}

// Função para gerar o relatório diário
async function gerarRelatorioDiario(client: any, clientePath: string) {
  try {
    console.log('Iniciando a geração do relatório diário...');
    const hoje = new Date();
    const dataRelatorio = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long' });

    console.log('Carregando os prompts...');
    const promptsPath = path.join(clientePath, 'relatorio', '.promptsRelatorios');
    const promptsRaw = fs.readFileSync(promptsPath, 'utf-8');
    const prompts = promptsRaw.split('\n').map(linha => linha.trim());

    const promptRelatorioDiario = prompts.find(linha => linha.startsWith('RELATORIO_DIARIO='))?.split('=')[1] || '';
    const promptAnalisarConversas = prompts.find(linha => linha.startsWith('ANALISAR_CONVERSAS='))?.split('=')[1] || '';

    console.log('Analisando os arquivos de disparo...');
    let disparoHoje = 0;
    const arquivosDisparo = fs.readdirSync(path.join(clientePath, 'listas', 'disparar'));
    for (const arquivo of arquivosDisparo) {
      console.log(`Analisando arquivo de disparo: ${arquivo}`);
      if (path.extname(arquivo) === '.json') {
        const filePath = path.join(clientePath, 'listas', 'disparar', arquivo);
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

    console.log('Analisando os arquivos de disparo...');
    let disparoTotal = 0;
    for (const arquivo of arquivosDisparo) {
      console.log(`Analisando arquivo de disparo: ${arquivo}`);
      if (path.extname(arquivo) === '.json') {
        const filePath = path.join(clientePath, 'listas', 'disparar', arquivo);
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const lista = JSON.parse(data);
          disparoTotal += lista.filter((item: { Data: string; Disparo: string; }) => item.Disparo === 'Sim').length;
          console.log(`Disparos encontrados no arquivo: ${disparoHoje}`);
        } catch (error) {
          console.error(`Erro ao analisar o arquivo de disparo: ${error}`);
        }
      }
    }

    console.log('Analisando as conversas ativas...');
    let quantidadeEncontrada = 0;
    quantidadeEncontrada = 
      await encontrarConversasAtivas(client, clientePath);

    console.log(`Quantidade de conversas ativas: ${quantidadeEncontrada}`);

    console.log('Fazendo a requisição para a IA para gerar o relatório diário...');


    // Cria a mensagem do relatório sem enviar para a IA
    const relatorioDoDia = 
      `Relatório diário: ${dataRelatorio}\n` +
      `Quantidade de disparos= ${disparoHoje}\n` +
      `Disparos totais= ${disparoTotal}\n` +
      `Conversas ativas= ${quantidadeEncontrada}\n`; // Inclui o número de conversas ativas

    console.log('Salvando o relatório no arquivo JSON...');
    const relatorioPath = path.join(clientePath, 'relatorio', 'salvos', 'diario');
    const semanaFile = path.join(relatorioPath, `${mesAtual}.json`);

    // Lê o relatório mensal
    let relatorioMensal: any = {};
    if (fs.existsSync(semanaFile)) {
      try {
        const data = fs.readFileSync(semanaFile, 'utf8');
        relatorioMensal = JSON.parse(data);
        console.log(`Relatório mensal carregado do arquivo: ${semanaFile}`);
      } catch (error) {
        console.error(`Erro ao carregar o relatório mensal do arquivo: ${error}`);
      }
    }

    // Calcula a semana do mês
    const semanaAtual = getSemanaDoMes(hoje);

    // Adiciona o relatório do dia ao relatório mensal
    relatorioMensal[`Semana ${semanaAtual}`] = relatorioMensal[`Semana ${semanaAtual}`] || {};
    relatorioMensal[`Semana ${semanaAtual}`][dataRelatorio] = relatorioDoDia;

    // Salva o relatório mensal
    try {
      fs.writeFileSync(semanaFile, JSON.stringify(relatorioMensal, null, 2));
      console.log(`Relatório diário salvo no arquivo: ${semanaFile}`);
    } catch (error) {
      console.error(`Erro ao salvar o relatório diário no arquivo: ${error}`);
    }

    console.log('Enviando o relatório para o chatId de destino...');
    const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || '';
    try {
      await client.sendText(TARGET_CHAT_ID, relatorioDoDia);
      console.log(`Relatório enviado para o chatId: ${TARGET_CHAT_ID}`);
    } catch (error) {
      console.error(`Erro ao enviar o relatório para o chatId: ${error}`);
    }

    console.log('Relatório diário gerado e enviado com sucesso!');
  } catch (error) {
    console.error(`Erro ao gerar relatório diário: ${error}`);
  }
}

// Função para calcular a semana do mês atual
function getSemanaDoMes(data: Date): number {
  const primeiroDiaDoMes = new Date(data.getFullYear(), data.getMonth(), 1);
  const diasDecorridos = Math.floor((data.getTime() - primeiroDiaDoMes.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((diasDecorridos + primeiroDiaDoMes.getDay()) / 7);
}


// Exportando a função para ser executada pelo arquivo disparo.ts
export { gerarRelatorioDiario };

// Função para ler o horário do relatório do arquivo .regrasdisparo
function lerHorarioRelatorio(clientePath: string): string {
  const regrasDisparoPath = path.join(clientePath, 'config', '.regrasdisparo');
  const regrasDisparoRaw = fs.readFileSync(regrasDisparoPath, 'utf-8');
  const regrasDisparo = regrasDisparoRaw.split('\n').map(linha => linha.trim());

  const horarioRelatorio = regrasDisparo.find(linha => linha.startsWith('HORARIO_RELATORIO='))?.split('=')[1];

  // Se o horário do relatório estiver vazio, usa o horário atual
  if (!horarioRelatorio) {
    const now = new Date();
    const horaAtual = now.getHours().toString().padStart(2, '0');
    const minutoAtual = now.getMinutes().toString().padStart(2, '0');
    return `${horaAtual}:${minutoAtual}`;
  }

  return horarioRelatorio || 'null'; // Retorna 'null' como padrão se não encontrar
}

// Função para verificar se houve disparo de mensagens hoje
function houveDisparoHoje(clientePath: string): boolean {
  const pastaDisparo = path.join(clientePath, 'listas', 'disparar');
  const arquivos = fs.readdirSync(pastaDisparo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Define a data para meia-noite

  return arquivos.some(arquivo => {
    const filePath = path.join(pastaDisparo, arquivo);
    const stats = fs.statSync(filePath);
    const dataModificacao = new Date(stats.mtime);
    return dataModificacao >= hoje; // Verifica se o arquivo foi modificado hoje
  });
}

// Verifica se é hora de executar o relatório
function horaDeExecutarRelatorio(horarioRelatorio: string): boolean {
  const [horaRelatorio, minutoRelatorio] = horarioRelatorio.split(':').map(Number);
  const agora = new Date();
  return agora.getHours() === horaRelatorio && agora.getMinutes() === minutoRelatorio;
}

// No final da função dispararMensagens, adicione a lógica para executar o relatório
let client: any; // Declare client globally

async function dispararRelatorioDiario(client: any, clientePath: string) {
  const horarioRelatorio = lerHorarioRelatorio(clientePath);
  if (houveDisparoHoje(clientePath) && horaDeExecutarRelatorio(horarioRelatorio)) {
    console.log('Executando relatório diário...');
    await gerarRelatorioDiario(client, clientePath);
  }
};

export { dispararRelatorioDiario };
