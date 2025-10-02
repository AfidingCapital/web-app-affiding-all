import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { AccountTransfersService } from '../account-transfers.service';
import { SettingsService } from 'app/settings/settings.service';
import { ClientsService } from 'app/clients/clients.service';
import { Dates } from 'app/core/utils/dates';

import { AddClientTransferDialogComponent } from './add-client-transfer-dialog/add-client-transfer-dialog.component';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { PreviewMultipleTransfersDialogComponent } from './preview-multiple-transfers-dialog/preview-multiple-transfers-dialog.component';

@Component({
  selector: 'mifosx-make-multiple-account-transfers',
  templateUrl: './make-multiple-account-transfers.component.html',
  styleUrls: ['./make-multiple-account-transfers.component.scss']
})
export class MakeMultipleAccountTransfersComponent implements OnInit, AfterViewInit {
  // Make Multiple Account Transfers form.
  makeMultipleAccountTransfersForm: UntypedFormGroup;
  // Account Transfers Template data.
  accountTransfersTemplateData: any;
  // Data for selects
  toOfficeTypeData: any;
  toClientTypeData: any;
  toAccountTypeData: any;
  toAccountData: any;
  // Context
  accountTypeId: any;
  accountType: any;
  id: any;
  // Clients
  clientsData: any;
  transferClients: any[] = [];

  // Date bounds
  minDate = new Date(2000, 0, 1);
  maxDate = new Date();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private accountTransfersService: AccountTransfersService,
    private route: ActivatedRoute,
    private router: Router,
    private dateUtils: Dates,
    private settingsService: SettingsService,
    private clientsService: ClientsService,
    public dialog: MatDialog
  ) {
    this.route.data.subscribe((data: { accountTransfersTemplateData: any }) => {
      this.accountTransfersTemplateData = data.accountTransfersTemplateData;
      this.setParams();
      this.setOptions();
    });
  }

  /** Sets the value from the URL */
  setParams() {
    this.accountType = this.route.snapshot.queryParams['accountType'];
    switch (this.accountType) {
      case 'fromloans':
        this.accountTypeId = '1';
        this.id = this.route.snapshot.queryParams['loanId'];
        break;
      case 'fromsavings':
        this.accountTypeId = '2';
        this.id = this.route.snapshot.queryParams['savingsId'];
        break;
      default:
        this.accountTypeId = '0';
    }
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;

    // Debug
    console.log('Business date:', this.settingsService.businessDate);
    console.log('Max date:', this.maxDate);
    console.log('Business date type:', typeof this.settingsService.businessDate);

    this.setMakeMultiAccountTransfersForm();

    // Debug after form init
    console.log('Form date value after init:', this.makeMultipleAccountTransfersForm.value.transferDate);
    console.log('Form date control valid:', this.makeMultipleAccountTransfersForm.controls.transferDate?.valid);
    console.log('Form date control errors:', this.makeMultipleAccountTransfersForm.controls.transferDate?.errors);

    // Ensure date is set
    this.ensureTransferDateIsSet();
  }

  /** Sets the make multiple account transfers form. */
  setMakeMultiAccountTransfersForm() {
    const defaultDate = this.settingsService.businessDate || new Date();
    console.log('Default date for form:', defaultDate);
    console.log('Default date type:', typeof defaultDate);

    // Garantir une instance Date pour le champ par défaut
    const initialDate = defaultDate instanceof Date ? defaultDate : new Date(defaultDate);

    this.makeMultipleAccountTransfersForm = this.formBuilder.group({
      //toOfficeId: ['', Validators.required],
      transferDate: [initialDate, Validators.required],
      transferDescription: ['', Validators.required]
    });

    console.log('Form created with values:', this.makeMultipleAccountTransfersForm.value);
  }

  /** Ensures that the transfer date is properly set */
  ensureTransferDateIsSet() {
    const currentDate = this.makeMultipleAccountTransfersForm.value.transferDate;
    console.log('Checking transfer date:', currentDate);

    if (!currentDate) {
      console.log('Transfer date is missing, setting default date');
      const defaultDate = this.settingsService.businessDate || new Date();
      this.makeMultipleAccountTransfersForm.patchValue({
        transferDate: defaultDate
      });
      console.log('Transfer date set to:', defaultDate);
    }
  }

  /** Sets options value */
  setOptions() {
    this.toOfficeTypeData = this.accountTransfersTemplateData.toOfficeOptions;
    this.toAccountTypeData = this.accountTransfersTemplateData.toAccountTypeOptions;
    this.toAccountData = this.accountTransfersTemplateData.toAccountOptions;
  }

  /** Executes on change of various select options */
  changeEvent() {
    const formValue = this.refineObject(this.makeMultipleAccountTransfersForm.value);
    this.accountTransfersService
      .newAccountTranferResource(this.id, this.accountTypeId, formValue)
      .subscribe((response: any) => {
        this.accountTransfersTemplateData = response;
        this.toClientTypeData = response.toClientOptions;
        this.setOptions();
      });
  }

  /** Refine Object: Removes null/'' values and maps client id if present */
  refineObject(dataObj: { [x: string]: any; transferDate: any }) {
    delete dataObj.transferDate;
    if (dataObj.toClientId) {
      dataObj.toClientId = dataObj.toClientId.id;
    }
    const propNames = Object.getOwnPropertyNames(dataObj);
    for (let i = 0; i < propNames.length; i++) {
      const propName = propNames[i];
      if (dataObj[propName] === null || dataObj[propName] === undefined || dataObj[propName] === '') {
        delete dataObj[propName];
      }
    }
    return dataObj;
  }

  ngAfterViewInit() {
    console.log('Multiple transfers component view initialized');
  }

  /**
   * Opens dialog to add a new client transfer
   */
  addClientTransfer() {
    const formValue = this.refineObject(this.makeMultipleAccountTransfersForm.value);
    this.accountTransfersService
      .newAccountTranferResource(this.id, this.accountTypeId, formValue)
      .subscribe((response: any) => {
        this.accountTransfersTemplateData = response;
        this.toClientTypeData = response.toClientOptions;
        this.setOptions();

        const dialogRef = this.dialog.open(AddClientTransferDialogComponent, {
          data: {
            toOfficeTypeData: this.toOfficeTypeData,
            toAccountTypeData: this.toAccountTypeData,
            toAccountData: this.toAccountData,
            clientsData: this.clientsData,
            toOfficeId: this.makeMultipleAccountTransfersForm.value.toOfficeId,
            accountTypeId: this.accountTypeId,
            id: this.id,
            initialAccountTransfersTemplateData: this.accountTransfersTemplateData
          }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
          if (result) {
            const newItem = { id: Date.now(), ...result };
            // Immutable update
            this.transferClients = [...this.transferClients, newItem];
          }
        });
      });
  }

  /** Opens dialog to edit an existing client transfer */
  editClientTransfer(client: any) {
    const dialogRef = this.dialog.open(AddClientTransferDialogComponent, {
      data: {
        client: client,
        toOfficeTypeData: this.toOfficeTypeData,
        toAccountTypeData: this.toAccountTypeData,
        toAccountData: this.toAccountData,
        clientsData: this.clientsData,
        toOfficeId: this.makeMultipleAccountTransfersForm.value.toOfficeId,
        accountTypeId: this.accountTypeId,
        id: this.id,
        // Passer aussi les données initiales du resolver
        initialAccountTransfersTemplateData: this.accountTransfersTemplateData
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Immutable update: remplacer l'item correspondant par une version mise à jour
        this.transferClients = this.transferClients.map((c) =>
          c.id === client.id ? { ...c, ...result } : c
        );
      }
    });
  }

  /**
   * Calculs le total des transferts
   */
  getTotalAmount(): number {
    return this.transferClients.reduce((total, client) => {
      return total + (parseFloat(client.transferAmount) || 0);
    }, 0);
  }

  /**
   * Get office name by id
   */
  getOfficeName(officeId: any): string {
    const office = this.toOfficeTypeData?.find((o: any) => o.id === officeId);
    return office ? office.name : officeId;
  }

  /**
   * Remove a client transfer
   */
  removeClientTransfer(client: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        heading: 'labels.buttons.Confirm Delete',
        dialogContext: `Êtes-vous sûr de vouloir supprimer le transfert pour le client "${client.toClientName || client.toClientId}"`,
        type: 'delete'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.confirm) {
        // Immutable removal
        this.transferClients = this.transferClients.filter((c) => c.id !== client.id);
      }
    });
  }

  /**
   * Opens the preview dialog and handles confirmation.
   */
  openPreviewDialog(): void {
    // Normalisation simple des données à envoyer au dialog
    const formValue: any = { ...this.makeMultipleAccountTransfersForm.value };

    // Normaliser transferDate si nécessaire
    if (formValue?.transferDate && !(formValue.transferDate instanceof Date)) {
      const d = new Date(formValue.transferDate);
      formValue.transferDate = isNaN(d.getTime()) ? formValue.transferDate : d.toISOString();
    }

    // Ouverture du dialog (une seule ouverture)
    const dialogRef = this.dialog.open(PreviewMultipleTransfersDialogComponent, {
      data: {
        transferClients: this.transferClients,
        formData: formValue,
        totalAmount: this.getTotalAmount(),
        currencyCode: this.accountTransfersTemplateData?.currency?.code
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result === 'confirm') {
        this.confirmSubmit();
      }
    });
  }

  /**
   * Submits the transfers - now uses the dialog for preview
   */
  submit(): void {
    if (this.transferClients.length === 0) {
      alert('Veuillez ajouter au moins un client pour le transfert');
      return;
    }

    // Ouvre le dialog d’aperçu
    this.openPreviewDialog();
  }

  /**
   * Confirme et soumet les transferts.
   */
  confirmSubmit() {
    // Forcer la validation du formulaire
    this.makeMultipleAccountTransfersForm.markAllAsTouched();

    if (!this.makeMultipleAccountTransfersForm.valid) {
      console.error('Formulaire invalide:', this.makeMultipleAccountTransfersForm.errors);
      console.error(
        'Erreurs par contrôle:',
        Object.keys(this.makeMultipleAccountTransfersForm.controls).map(key => ({
          control: key,
          errors: this.makeMultipleAccountTransfersForm.controls[key].errors,
          value: this.makeMultipleAccountTransfersForm.controls[key].value
        }))
      );
      alert('Veuillez corriger les erreurs dans le formulaire avant de continuer.');
      return;
    }

    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;

    const rawTransferDate = this.makeMultipleAccountTransfersForm.value.transferDate;
    console.log('=== DEBUG DATE TRANSFER (trim extract) ===');
    console.log('Raw transfer date:', rawTransferDate);
    console.log('Raw transfer date type:', typeof rawTransferDate);
    console.log('Date format:', dateFormat);
    console.log('Form valid:', this.makeMultipleAccountTransfersForm.valid);

    // Build formatted date
    let formattedTransferDate: string;
    const rawDate = this.makeMultipleAccountTransfersForm.value.transferDate;
    if (!rawDate) {
      this.ensureTransferDateIsSet();
      const correctedDate = this.makeMultipleAccountTransfersForm.value.transferDate;
      if (!correctedDate) {
        alert('La date de transfert est requise. Veuillez sélectionner une date valide.');
        return;
      } else {
        formattedTransferDate = this.dateUtils.formatDate(correctedDate, dateFormat);
      }
    } else {
      formattedTransferDate = this.dateUtils.formatDate(rawDate, dateFormat);
    }

    if (!formattedTransferDate) {
      alert('Erreur lors du formatage de la date de transfert');
      return;
    }

    const multipleTransfersData = {
      transferDate: formattedTransferDate,
      transferDescription: this.makeMultipleAccountTransfersForm.value.transferDescription,
      dateFormat,
      locale,
      fromAccountId: this.id,
      fromAccountType: this.accountTypeId,
      fromClientId: this.accountTransfersTemplateData.fromClient.id,
      fromOfficeId: this.accountTransfersTemplateData.fromClient.officeId,
      toAccounts: this.transferClients.map(client => ({
        toClientId: client.toClientId,
        toAccountType: client.toAccountType,
        toAccountId: client.toAccountId,
        transferAmount: client.transferAmount,
        toOfficeId: client.toOfficeId
      }))
    };

    console.log('Multiple transfers data:', multipleTransfersData);

    this.accountTransfersService.createMultiTransfer(multipleTransfersData).subscribe(
      (response: any) => {
        console.log('Transferts multiples enregistrés avec succès:', response);
        alert('Tous les transferts ont été enregistrés avec succès.');
        this.transferClients = [];
      },
      (error: any) => {
        console.error("Erreur lors de l'enregistrement des transferts multiples:", error);
        alert('Une erreur est survenue lors de l\'enregistrement des transferts multiples.');
      }
    );
  }
}