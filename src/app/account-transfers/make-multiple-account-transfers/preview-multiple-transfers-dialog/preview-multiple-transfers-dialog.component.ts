import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'mifosx-preview-multiple-transfers-dialog',
  templateUrl: './preview-multiple-transfers-dialog.component.html',
  styleUrls: ['./preview-multiple-transfers-dialog.component.scss']
})
export class PreviewMultipleTransfersDialogComponent {

  // Données injectées via MAT_DIALOG_DATA
  constructor(
    public dialogRef: MatDialogRef<PreviewMultipleTransfersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) { }

  /**
   * Annuler = fermer sans action
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Confirmer = retourner une valeur au parent pour continuer le flux
   */
  onConfirm(): void {
    this.dialogRef.close('confirm');
  }
}