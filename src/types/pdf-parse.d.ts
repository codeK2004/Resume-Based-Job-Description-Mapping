declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PDFData>;
  
  export = PDFParse;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: {
    max?: number;
    version?: string;
  }): Promise<PDFData>;
  
  export default PDFParse;
} 