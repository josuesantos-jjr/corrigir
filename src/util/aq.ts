import { type Whatsapp } from '@wppconnect-team/wppconnect';

export function splitMessages(text: string): string[] {
  // Retorna o texto original como um único elemento do array
  return [text];
}

export async function sendMessagesWithDelay({
  messages,
  client,
  targetNumber,
}: {
  messages: string[];
  client: Whatsapp;
  targetNumber: string;
}): Promise<void> {
  for (const [, msg] of messages.entries()) {
    const dynamicDelay = msg.length * 51;
    await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
    client
      .sendText(targetNumber, msg.trimStart())
      .then((result) => {
        console.log('Mensagem enviada:', result.body);
      })
      .catch((erro) => {
        console.error('Erro ao enviar mensagem:', erro);
      });
  }
}
