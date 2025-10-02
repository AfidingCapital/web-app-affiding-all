import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'mifosx-preview-multiple-transfers-dialog',
  templateUrl: './preview-multiple-transfers-dialog.component.html',
  styleUrls: ['./preview-multiple-transfers-dialog.component.scss']
})
export class PreviewMultipleTransfersDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<PreviewMultipleTransfersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) { }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close('confirm');
  }
}