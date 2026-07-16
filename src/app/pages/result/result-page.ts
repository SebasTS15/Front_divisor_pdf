import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PdfStateService, ResultFileItem } from '../../services/pdf-state.service';

@Component({
  selector: 'app-result-page',
  imports: [DecimalPipe],
  templateUrl: './result-page.html',
  styleUrl: './result-page.css'
})
export class ResultPage implements OnInit {
  private readonly pdfState = inject(PdfStateService);
  private readonly router = inject(Router);
  readonly visibleItems = signal(8);
  readonly result = this.pdfState.result;

  ngOnInit(): void {
    if (!this.result()) {
      void this.router.navigate(['/']);
    }
  }

  startOver(): void {
    this.pdfState.clearDocument();
    this.pdfState.clearResult();
    void this.router.navigate(['/']);
  }

  async download(item: ResultFileItem) {

    const blob = await item.file.async("blob");

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = item.name;

    a.click();

    URL.revokeObjectURL(url);
}

showMore(): void {
  this.visibleItems.update(value => value + 8);
}

}
