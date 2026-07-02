import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage) },
  { path: 'editar', loadComponent: () => import('./pages/editor/editor-page').then((m) => m.EditorPage) },
  { path: 'resultado', loadComponent: () => import('./pages/result/result-page').then((m) => m.ResultPage) },
  { path: '**', redirectTo: '' }
];
