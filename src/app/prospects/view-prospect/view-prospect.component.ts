import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/** Custom Services */
import { ProspectsService } from '../prospects.service';
import { ClientsService } from '../../clients/clients.service';

/** Custom Components */
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { TranslateService } from '@ngx-translate/core';

export interface ConfirmationDialogData {
  heading: string;
  dialogContext: string;
  type: string;
}

@Component({
  selector: 'mifosx-view-user',
  templateUrl: './view-prospect.component.html',
  styleUrls: ['./view-prospect.component.scss']
})
export class ViewProspectComponent implements OnInit  {
  /** User Data. */
  prospectData: any;
  clientData: any;
  prospectImage: SafeUrl | null = null;
  isImageLoading: boolean = false;
  public defaultPlaceholder = '/assets/user_placeholder.png';
  id: number;
  picturePath: string;
  cintentType: string;
  private prospectId: string = '';
  translate: any;

  // genre description
  genderDescriptionLabel: string | null = null;

  // date of birth formatée
  dateOfBirthLabel: string | null = null;

  // createdAt formatée
  createdAtLabel: string | null = null;

  // acceptedAt formatée
  acceptedAtLabel: string | null = null;

  // status label affiché dans le template
  statusLabel: string | null = null;

  constructor(
    private clientsService: ClientsService,
    private _sanitizer: DomSanitizer,
    private prospectsService: ProspectsService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private translateService: TranslateService
  ) {
    this.translate = this.translateService;

    // Chargement des données via la route (data: { user: any })
    this.route.data.subscribe((data: { user: any }) => {
      this.prospectData = data.user;
      this.clientData = data.user;
      // Autres formatages
      this.dateOfBirthLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth);
      this.createdAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt);
      this.acceptedAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.prospectId = params.get('id') || '';
      if (this.prospectId) {
        this.loadProspectProfil();
      }
    });
  }

  loadProspectProfil() {
    this.isImageLoading = true;
    this.prospectsService.getProspectProfileImage(this.prospectId).subscribe(
      (response: any) => {
        let imageSrc: string | null = null;

        if (typeof response === 'string') {
          imageSrc = response;
        } else {
          const candidate =
            response?.picturePath ?? response?.image ?? response?.data ?? '';
          imageSrc = candidate;
        }

        if (!imageSrc) {
          this.prospectImage = this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
        } else {
          this.prospectImage = this.mapImageResponse(imageSrc);
        }

        this.isImageLoading = false;
        this.loadGenderDescriptionIfNeeded();

        // Mettre à jour les labels formatés après chargement
        this.dateOfBirthLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth);

        this.createdAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt);

        this.acceptedAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt);

        // Calcul du statusLabel centralisé via le service
        const statusRaw = this.prospectData?.statusValue ?? this.prospectData?.status;
        this.statusLabel = this.prospectsService.mapStatus(statusRaw);

      },
      (error: any) => {
        console.error('Erreur chargement image prospect', error);
        this.prospectImage = this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
        this.isImageLoading = false;

        this.loadGenderDescriptionIfNeeded();

        this.dateOfBirthLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.dateOfBirth)
          ?? '';
        
        this.createdAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.createdAt)
          ?? '';

        this.acceptedAtLabel = this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt)
          ?? this.prospectsService.formatDateNeeded?.(this.prospectData?.acceptedAt)
          ?? '';

        // Garder le statusLabel cohérent même en erreur parfois
        const statusRaw = this.prospectData?.statusValue ?? this.prospectData?.status;
        this.statusLabel = this.prospectsService.mapStatus(statusRaw);
      }
    );
  }

  private mapImageResponse(src: string): SafeUrl {
    if (!src) {
      return this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
    }

    let url = src;
    if (src.startsWith('http') || src.startsWith('data:')) {
      url = src;
    } else {
      url = `${window.location.origin}${src}`;
    }
    return this._sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private loadGenderDescriptionIfNeeded() {
    const genderValue = this.prospectData?.genderValue;
    if (!genderValue) {
      this.genderDescriptionLabel = null;
      return;
    }

    this.prospectsService.getGenderDescription().subscribe(
      (resp: any) => {
        const list = resp?.genderList || [];
        const match = list.find((g: any) => g?.value === genderValue);
        this.genderDescriptionLabel = match?.description ?? null;
      },
      (err) => {
        console.error('Erreur lors de getGenderDescription', err);
        this.genderDescriptionLabel = null;
      }
    );
  }

  // Utilitaire pour transformer l'image brute en SafeUrl
  // (inchangé par rapport à votre version, inchangé ici)

  // ------------- Dialogs --------------
  reject() {
    const translatedHeading = this.translate.instant('labels.buttons.Reject') || 'Reject';

    const rejectDialogData: ConfirmationDialogData = {
      heading: translatedHeading,
      dialogContext: `Êtes-vous sûr de vouloir rejeter le prospect "${this.prospectData?.displayName ?? ''}"`,
      type: 'delete'
    };

    const rejectProspectDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: rejectDialogData
    });

    rejectProspectDialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.confirm) {
        this.prospectsService.rejectProspect(this.prospectData?.id).subscribe(() => {
          this.router.navigate(['/prospects']);
        });
      }
    });
  }

  get clientPath(): string {
  const id = this.prospectData?.clientId;
  return id ? `/clients/${id}` : '/clients';
}

  accept() {
    const translatedHeading = this.translate.instant('labels.buttons.Accept') || 'Accept';
    const acceptDialogData: ConfirmationDialogData = {
      heading: translatedHeading,
      dialogContext: `Êtes-vous sûr de vouloir accepter le prospect "${this.prospectData.displayName ?? ''}"`,
      type: 'confirm'
    };

    const acceptProspectDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: acceptDialogData
    });

    acceptProspectDialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.confirm) {
        this.prospectsService.acceptProspect(this.prospectData?.id).subscribe((resp: any) => {
          const clientIdFromResponse = typeof resp?.clientId === 'number' ? resp.clientId : null;
          if (clientIdFromResponse != null) {
            const targetId = String(clientIdFromResponse);
            // Optionnel: navigation automatique (à dé-commenter si souhaité)
            this.router.navigate(['/clients', targetId]);
            // Mise à jour du statut côté client si disponible dans la réponse
            if (typeof resp?.statusValue !== 'undefined') {
              this.prospectData.statusValue = resp.statusValue;
              // Optionnel: mapper au status standard si nécessaire
              this.statusLabel = this.prospectsService.mapStatus(resp.statusValue);
            }
          } else {
            console.warn('clientId manquant dans la réponse de l’API après acceptance');
          }
        }, (err) => {
          console.error('Erreur lors duings de l’acceptation du prospect', err);
        });
      }
    });
  }

  change() {
    const dummy = true;
    if (dummy) {
      this.snackbar.open('Change password dialog would open here.', 'Fermer', { duration: 3000 });
    }
  }
}