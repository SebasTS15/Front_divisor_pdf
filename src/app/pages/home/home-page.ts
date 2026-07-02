import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PdfPreviewService } from '../../services/pdf-preview.service';
import { PdfStateService } from '../../services/pdf-state.service';
import {MatIconModule} from '@angular/material/icon'

@Component({
  selector: 'app-home-page',
  imports: [MatIconModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePage {
  readonly isDragging = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal('');

  constructor(
    private readonly pdfPreview: PdfPreviewService,
    private readonly pdfState: PdfStateService,
    private readonly router: Router
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    void this.handleFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.handleFile(input.files?.[0]);
    input.value = '';
  }

  private async handleFile(file: File | undefined): Promise<void> {
    this.error.set('');

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      this.error.set('Selecciona un archivo PDF valido.');
      return;
    }

    this.isLoading.set(true);

    try {
      const totalPages = await this.pdfPreview.getPageCount(file);
      this.pdfState.setDocument(file, totalPages);
      await this.router.navigate(['/editar']);
    } catch {
      this.error.set('No fue posible leer el PDF. Intenta con otro archivo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
