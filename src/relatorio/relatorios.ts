import { dispararRelatorioDiario } from '../relatorio/relatorioDiario'; 


async function relatorios(client: any, clientePath: string) { // Modifique para aceitar client como parâmetro
    // Lê o horário do relatório do arquivo .regrasdisparo
      await dispararRelatorioDiario(client, clientePath)
     .catch((error) => console.error('Erro ao enviar relatorio:', error));
    }




export { relatorios }
