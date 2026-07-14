// @types/pdf-parse só tipa o entrypoint "pdf-parse" (index.js). Importamos o
// módulo interno "pdf-parse/lib/pdf-parse.js" para pular o branch de debug do
// index.js (ver xpglobal-pdf-parser.ts). Declaração ambiente abreviada só para
// satisfazer o noImplicitAny do subpath; o parser faz o cast do tipo real.
declare module "pdf-parse/lib/pdf-parse.js";
