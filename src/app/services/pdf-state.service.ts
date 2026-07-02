import { Injectable, signal } from '@angular/core';

export interface PdfDocumentState {
  file: File;
  objectUrl: string;
  totalPages: number;
}

export interface ResultFileItem {
  name: string;
  size: number;
  url: string;
}

export interface PdfResultState {
  blob: Blob;
  fileName: string;
  type: 'zip' | 'pdf';
  objectUrl: string;
  items: ResultFileItem[];
}

@Injectable({ providedIn: 'root' })
export class PdfStateService {
  readonly document = signal<PdfDocumentState | null>(null);
  readonly result = signal<PdfResultState | null>(null);

  setDocument(file: File, totalPages: number): void {
    this.clearDocument();
    this.document.set({
      file,
      objectUrl: URL.createObjectURL(file),
      totalPages
    });
    this.clearResult();
  }

  setResult(result: Omit<PdfResultState, 'objectUrl'>): void {
    this.clearResult();
    this.result.set({
      ...result,
      objectUrl: URL.createObjectURL(result.blob)
    });
  }

  clearDocument(): void {
    const current = this.document();
    if (current) {
      URL.revokeObjectURL(current.objectUrl);
    }
    this.document.set(null);
  }

  clearResult(): void {
    const current = this.result();
    if (current) {
      URL.revokeObjectURL(current.objectUrl);
      current.items.forEach((item) => URL.revokeObjectURL(item.url));
    }
    this.result.set(null);
  }
}
