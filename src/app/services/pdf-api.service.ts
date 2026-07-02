import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface ApiBlobResult {
  blob: Blob;
  fileName: string;
}

@Injectable({ providedIn: 'root' })
export class PdfApiService {
  private readonly apiUrl = 'http://localhost:8000/api';

  constructor(private readonly http: HttpClient) {}

  splitPdf(file: File, newName: string, pagesPerPdf: number): Observable<ApiBlobResult> {
    const form = new FormData();
    form.append('nuevo_nombre_pdf', newName);
    form.append('paginas_dividir', String(pagesPerPdf));
    form.append('archivo', file);

    return this.postBlob(`${this.apiUrl}/splitter_pdf`, form, `${newName}.zip`);
  }

  extractPdf(file: File, newName: string, pages: string): Observable<ApiBlobResult> {
    const form = new FormData();
    form.append('nuevo_nombre_pdf', newName);
    form.append('paginas_estraer', pages);
    form.append('archivo', file);

    return this.postBlob(`${this.apiUrl}/estrac_pdf`, form, `${newName}.pdf`);
  }

  private postBlob(url: string, body: FormData, fallbackName: string): Observable<ApiBlobResult> {
    return this.http.post(url, body, { observe: 'response', responseType: 'blob' }).pipe(
      map((response: HttpResponse<Blob>) => ({
        blob: response.body ?? new Blob(),
        fileName: this.getFileName(response) || fallbackName
      }))
    );
  }

  private getFileName(response: HttpResponse<Blob>): string | null {
    const contentDisposition = response.headers.get('content-disposition');
    const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return match?.[1] ?? null;
  }
}
