const puppeteer = require('puppeteer');
const fs = require('fs');
const dotenv = require('dotenv');

require('dotenv').config();
const GEMINI_LINK = process.env.GEMINI_LINK;

async function getPromptText() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navegando até o link do prompt
  
  await page.goto(GEMINI_LINK);

  // Extraindo o texto do prompt
  const promptText = await page.evaluate(() => {
    return document.querySelector('body').innerText.replace('Published by Google Sheets–Report Abuse–Updated automatically every 5 minutes', '');
  });

  // Aumente o tempo limite para 60 segundos
  page.setDefaultTimeout(6000);

  await browser.close();

  return promptText;
}

// Definindo a função `updatePromptText`
async function updatePromptText() {
  const promptText = await getPromptText();

  // Salvando o texto do prompt no arquivo .env
  let envConfig = fs.readFileSync('.env', { encoding: 'utf8' });
   
  if (envConfig.includes('GEMINI_PROMPT=')) {
    envConfig = envConfig.replace(/GEMINI_PROMPT=.*/, `GEMINI_PROMPT=${promptText.replace(/\n/g, '.')}`);
  } else {
    envConfig += `GEMINI_PROMPT=${promptText}`;
  }

  fs.writeFileSync('.env', envConfig, { encoding: 'utf8' });

  console.log('Configuração para GEMINI salva com sucesso! 🎉');
}

(async () => {
  const promptText = await getPromptText();
  console.log(promptText.replace(/\n/g, '.')); // Substitui quebras de linha por pontos finais

  // Chamando a função `updatePromptText` a cada 10 segundos
setInterval(updatePromptText, 6000);
})();

