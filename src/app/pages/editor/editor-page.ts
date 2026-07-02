import { Component, ElementRef, OnInit, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PdfApiService } from '../../services/pdf-api.service';
import { PdfPreviewService } from '../../services/pdf-preview.service';
import { PdfStateService, ResultFileItem } from '../../services/pdf-state.service';
import { form } from '@angular/forms/signals';
import {MatIconModule} from '@angular/material/icon'

type OperationMode = 'split' | 'extract';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.css'
})
export class EditorPage implements OnInit {
  @ViewChildren('previewCanvas') previewCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly api = inject(PdfApiService);
  private readonly pdfPreview = inject(PdfPreviewService);
  private readonly pdfState = inject(PdfStateService);
  private readonly router = inject(Router);

  readonly document = this.pdfState.document;
  readonly mode = signal<OperationMode>('split');
  readonly isSubmitting = signal(false);
  readonly error = signal('');


  outputName = '';
  pagesPerPdf = 1;
  pagesToExtract = '';
  pages: number[] = [];

  splitPreview(): number[] {
    const totalPages = this.document()?.totalPages ?? 0;
    const size = Number(this.pagesPerPdf) || 0;
    const total = size > 0 ? Math.ceil(totalPages / size) : 0;
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  ngOnInit(): void {
    const current = this.document();
    if (!current) {
      void this.router.navigate(['/']);
      return;
    }
    this.pages = Array.from(
    { length: current.totalPages },
    (_, i) => i + 1
    );

    this.outputName = this.cleanName(current.file.name.replace(/\.pdf$/i, '')) || 'documento';
    queueMicrotask(() => void this.renderPreview());
  }

  setMode(mode: OperationMode): void {
    this.mode.set(mode);
    this.error.set('');
  }

  cancel(): void {
    this.pdfState.clearDocument();
    void this.router.navigate(['/']);
  }

  async submit(): Promise<void> {
    const current = this.document();
    const name = this.cleanName(this.outputName);

    if (!current) {
      await this.router.navigate(['/']);
      return;
    }

    if (!name) {
      this.error.set('Escribe un nombre para el archivo de salida.');
      return;
    }

    this.error.set('');
    this.isSubmitting.set(true);

    const request =
      this.mode() === 'split'
        ? this.api.splitPdf(current.file, name, Number(this.pagesPerPdf))
        : this.api.extractPdf(current.file, name, this.pagesToExtract);

    request.subscribe({
      next: async ({ blob, fileName }) => {
        try {
          const type = this.mode() === 'split' ? 'zip' : 'pdf';
          const items = type === 'zip' ? await this.getZipItems(blob) : [];
          this.pdfState.setResult({ blob, fileName, type, items });
          await this.router.navigate(['/resultado']);
        } catch {
          this.error.set('La API respondio, pero no fue posible preparar la descarga.');
        }
      },
      error: (response) => {
        this.error.set(response?.error?.detail || 'No fue posible procesar el PDF.');
        this.isSubmitting.set(false);
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  private async renderPreview(): Promise<void> {
    const current = this.document();
    if (!current) {
      return;
    }
    const canvas = this.previewCanvas.toArray().map(m => m.nativeElement);

    await this.pdfPreview.renderPages(current.file, canvas);
  }

  private async getZipItems(blob: Blob): Promise<ResultFileItem[]> {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const files = Object.values(zip.files).filter((file) => !file.dir);
    const items = await Promise.all(
      files.map(async (file) => {
        const itemBlob = await file.async('blob');
        return {
          name: file.name,
          size: itemBlob.size,
          url: URL.createObjectURL(itemBlob)
        };
      })
    );

    return items;
  }

  private cleanName(value: string): string {
    return value.trim().replace(/[\\/:*?"<>|]/g, '-');
  }

  validateNumberPage(event: any){
    const maxi = this.document()?.totalPages!;
    if ( this.pagesPerPdf > maxi ) {
      this.pagesPerPdf = maxi;
      event.target.value = maxi;
    }
    if ( this.pagesPerPdf < 1 && this.pagesPerPdf !== null ) {
      this.pagesPerPdf = 1;
      event.target.value = 1;
    }
  }
}
