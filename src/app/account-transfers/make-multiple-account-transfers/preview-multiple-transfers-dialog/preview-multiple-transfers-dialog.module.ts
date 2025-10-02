import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { PreviewMultipleTransfersDialogComponent } from './preview-multiple-transfers-dialog.component';

@NgModule({
  declarations: [PreviewMultipleTransfersDialogComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatCardModule
  ],
  exports: [PreviewMultipleTransfersDialogComponent]
})
export class PreviewMultipleTransfersDialogModule { }