import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PdfApiService } from '../../services/pdf-api.service';
import { PdfPreviewService } from '../../services/pdf-preview.service';
import { PdfStateService, ResultFileItem } from '../../services/pdf-state.service';
import { form } from '@angular/forms/signals';
import {MatIconModule} from '@angular/material/icon'
import { waitForAngularReady } from '@angular/cdk/testing/selenium-webdriver';
import { file } from 'jszip';

type OperationMode = 'split' | 'extract';



@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.css'
})
export class EditorPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewPanel') previewPanel?: ElementRef<HTMLDivElement>;
  @ViewChildren('previewCanvas') previewCanvas!: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly api = inject(PdfApiService);
  private readonly pdfPreview = inject(PdfPreviewService);
  private readonly pdfState = inject(PdfStateService);
  private readonly router = inject(Router);

  private previewObserver?: IntersectionObserver;
  private renderedPages = new Set<number>();

  readonly document = this.pdfState.document;
  readonly mode = signal<OperationMode>('split');
  readonly isSubmitting = signal(false);
  readonly error = signal('');

  processingMessage(): string {
    return this.mode() === 'split' ? 'Dividiendo PDF...' : 'Extrayendo PDF...';
  }

  outputName = '';
  pagesPerPdf = 1;
  pagesToExtract = '';
  pages: number[] = [];

  splitPreviewTotal(): number{
    const totalPages = this.document()?.totalPages?? 0;
    const size = Number(this.pagesPerPdf) || 0;
    const total = size > 0 ? Math.ceil(totalPages / size) : 0;
    return (total)
  }

  splitPreview(): number[] {
    const totalPages = this.document()?.totalPages ?? 0;
    const size = Number(this.pagesPerPdf) || 0;
    const total = size > 0 ? Math.ceil(totalPages / size) : 0;

    if (total >26){
        return Array.from({ length: 26 }, (_, index) => index + 1);
      }

    return Array.from({ length: total }, (_, index) => index + 1);
  }

  ngOnInit(): void {
    const current = this.document();

    if (!current) {
      void this.router.navigate(['/']);
      return;
    }

    this.pages = Array.from({ length: current.totalPages }, (_, i) => i + 1);
    this.outputName = this.cleanName(current.file.name.replace(/\.pdf$/i, '')) || 'documento';
  }

  ngAfterViewInit(): void {
    this.initializePreviewObserver();
    queueMicrotask(() => void this.renderPreview());
  }

  ngOnDestroy(): void {
    this.previewObserver?.disconnect();
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
        console.log(blob.size);
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

  
  private async preparePreview(): Promise<void> {
    
    const current = this.document();
    
    if (!current) return;
    
    await this.pdfPreview.loadPdf(current.file);
  }

  private initializePreviewObserver(): void {
    const root = this.previewPanel?.nativeElement ?? null;

    this.previewObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const canvas = entry.target as HTMLCanvasElement;
          const pageNumber = Number(canvas.dataset['pageIndex']);

          if (!pageNumber || this.renderedPages.has(pageNumber)) {
            continue;
          }

          this.renderedPages.add(pageNumber);
          this.pdfPreview.enqueue(pageNumber, canvas);
          this.previewObserver?.unobserve(canvas);
        }
      },
      {
        root,
        rootMargin: '400px',
        threshold: 0.1
      }
    );
  }

  private enqueuePages(): void {
    const canvases = this.previewCanvas.toArray().map(c => c.nativeElement);

    canvases.forEach((canvas, index) => {
      canvas.dataset['pageIndex'] = String(index + 1);
      if (this.previewObserver) {
        this.previewObserver.observe(canvas);
      } else {
        this.renderedPages.add(index + 1);
        this.pdfPreview.enqueue(index + 1, canvas);
      }
    });
  }

  private async renderPreview(): Promise<void> {
    await this.preparePreview();
    this.enqueuePages();
  }

  private async getZipItems(blob: Blob): Promise<ResultFileItem[]> {

    const JSZip = (await import('jszip')).default;

    const zip = await JSZip.loadAsync(blob);

    return Object.values(zip.files)
        .filter(file => !file.dir)
        .map(file => ({
            name: file.name,
            size: 0,
            file
        }));
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
