declare module "*.css";

declare module "kordoc" {
  export function parseHwp(buffer: Buffer): Promise<{ text: string } | string>;
  const kordoc: { parseHwp: typeof parseHwp };
  export default kordoc;
}

declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}

declare module "kordoc" {
  export function parseHwp(buffer: Buffer): Promise<{ text: string } | string>;
  const kordoc: { parseHwp: typeof parseHwp };
  export default kordoc;
}

declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}
