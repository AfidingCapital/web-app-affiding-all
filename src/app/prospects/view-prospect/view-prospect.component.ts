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
  private defaultPlaceholder = '/assets/user_placeholder.png';
  id: number;
  picturePath: string;
  cintentType: string;
  private prospectId: string = '';
  translate: any;

  // genre description
  genderDescriptionLabel: string | null = null;

  // date of birth formatée
  dateOfBirthLabel: string | null = null;

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

    this.route.data.subscribe((data: { user: any }) => {
      this.prospectData = data.user;
      this.clientData = data.user;
      // formatage immédiatement si dateOfBirth est présente
      this.dateOfBirthLabel = this.prospectsService.formatDateNeeded(this.prospectData?.dateOfBirth);
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

        // Mettre à jour la date de naissance formatée après chargement
        this.dateOfBirthLabel = this.prospectsService.formatDateNeeded(this.prospectData?.dateOfBirth);
      },
      (error: any) => {
        console.error('Erreur chargement image prospect', error);
        this.prospectImage = this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
        this.isImageLoading = false;

        this.loadGenderDescriptionIfNeeded();

        this.dateOfBirthLabel = this.prospectsService.formatDateNeeded(this.prospectData?.dateOfBirth);
      }
    );
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

  // ------------- Dialogs --------------
  // ... (reste inchangé: reject, accept, change)
}