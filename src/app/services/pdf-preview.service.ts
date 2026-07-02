import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

const workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

@Injectable({ providedIn: 'root' })
export class PdfPreviewService {
  async getPageCount(file: File): Promise<number> {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    return pdf.numPages;
  }

  async renderPages(file: File, canvases: HTMLCanvasElement[]): Promise<void>  {

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.3 });

        const canvas = canvases[i-1];
        
        if(!canvas) continue;
        
        const context = canvas.getContext('2d');
        
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvas, viewport }).promise;
    }
  }
}
