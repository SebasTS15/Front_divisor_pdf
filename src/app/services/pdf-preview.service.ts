import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { takeUntil } from 'rxjs';
import { errorContext } from 'rxjs/internal/util/errorContext';

const workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type RenderTask = {
  pageNumber: number
  canvas: HTMLCanvasElement 
};

@Injectable({ providedIn: 'root' })
export class PdfPreviewService {

  private pdf?: PDFDocumentProxy;
  private currentFile: File | null = null;
  private currentData: ArrayBuffer | null = null;

  private queue: RenderTask[] = [];

  private isProcessing = false;

  private readonly previewScale = 1.2;

  private async ensureData(file: File): Promise<ArrayBuffer> {
    if (this.currentFile === file && this.currentData) {
      return this.currentData;
    }

    const data = await file.arrayBuffer();
    this.currentFile = file;
    this.currentData = data;
    return data;
  }

  async loadPdf(file: File): Promise<PDFDocumentProxy> {
    if (this.currentFile === file && this.pdf) {
      return this.pdf;
    }

    const data = await this.ensureData(file);

    if (this.pdf) {
      await this.pdf.cleanup();
    }

    const pdfLoad = await pdfjsLib.getDocument({ data }).promise;
    this.pdf = pdfLoad;
    return pdfLoad;
  }

  async getPageCount(file: File): Promise<number> {
    if (this.currentFile === file && this.pdf) {
      return this.pdf.numPages;
    }

    const data = await this.ensureData(file);

    if (this.pdf) {
      await this.pdf.cleanup();
    }

    const pdfLoad = await pdfjsLib.getDocument({ data }).promise;
    this.pdf = pdfLoad;
    return pdfLoad.numPages;
  }

  async renderPage(pageNumber: number, canvas: HTMLCanvasElement): Promise<void>  {

    if (!this.pdf){
      throw new Error('No hay ningún PDF cargado')
    }
    const page = await this.pdf?.getPage(pageNumber);
    
    const viewport = page.getViewport({ scale: this.previewScale });

    const context = canvas.getContext('2d') ;
     
    if (!context){
      throw new Error("No fue posible obtener el contexto del canvas");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvas: canvas, canvasContext: context  , viewport }).promise;
  }

  enqueue(pageNumber: number, canvas: HTMLCanvasElement): void {
    const newQueue: RenderTask = {
      pageNumber,
      canvas
    };

    this.queue.push(newQueue);

    if (!this.isProcessing) {
      void this.ProcessQueue();
    }
  }

  private async ProcessQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) continue;

        try {
          await this.renderPage(task.pageNumber, task.canvas);
        } catch (error) {
          console.error(`Error al renderizar la pagina ${task.pageNumber}`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

}