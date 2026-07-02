import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PdfStateService } from '../../services/pdf-state.service';

@Component({
  selector: 'app-result-page',
  imports: [DecimalPipe],
  templateUrl: './result-page.html',
  styleUrl: './result-page.css'
})
export class ResultPage implements OnInit {
  private readonly pdfState = inject(PdfStateService);
  private readonly router = inject(Router);

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
}
