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

  async renderFirstPage(file: File, canvas: HTMLCanvasElement): Promise<void> {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.3 });
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
  }
}
