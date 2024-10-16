import fs from 'fs';
import path, { resolve } from 'path';

export function getPasta(cliente: string) {
  return path.join(process.cwd(), `clientes`, cliente);
}


