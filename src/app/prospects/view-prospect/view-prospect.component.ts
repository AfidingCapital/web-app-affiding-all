/** Angular Imports */
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { OnInit } from '@angular/core';

/** Custom Services */
import { ProspectsService } from '../prospects.service';
import { ClientsService } from '../../clients/clients.service';

/** Custom Components */
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChangePasswordDialogComponent } from 'app/shared/change-password-dialog/change-password-dialog.component';

/**
 * View user component.
 */
@Component({
  selector: 'mifosx-view-user',
  templateUrl: './view-prospect.component.html',
  styleUrls: ['./view-prospect.component.scss']
})
export class ViewProspectComponent implements OnInit  {
  /** User Data. */
  userData: any;
  prospectImage: SafeUrl | null = null;
  isImageLoading: boolean = false;
  private defaultPlaceholder = '/assets/user_placeholder.png';
  id : number;
  picturePath:string;
  cintentType:string;
  private prospectId: string = '';

  ngOnInit(): void {
   // Récupération de l'ID depuis la route et appel du chargement d'image
    this.route.paramMap.subscribe(params => {
      this.prospectId = params.get('id') || '';
      // Assure-toi que loadProspectProfil est appelé uniquement après que l'ID soit défini
      if (this.prospectId) {
        this.loadProspectProfil();
      }
    });
  }
  /**
   * Retrieves the user data from `resolve`.
   * @param {ProspectsService} prospectsService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Dialog reference.
   * @param {MatSnackBar} snackbar Snackbar for messages.
   */
  constructor(
    private clientsService: ClientsService,
    private _sanitizer: DomSanitizer,
    private prospectsService: ProspectsService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
    this.route.data.subscribe((data: { user: any }) => {
      this.userData = data.user;
      // console.log('ViewProspectComponent: userData chargé via resolve', this.userData);
    });
  }

  /**
   * Reject the prospect and redirects to prospects.
   */

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
        // pas d'image fournie => placeholder utilisateur
        this.prospectImage = this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
      } else {
        this.prospectImage = this.mapImageResponse(imageSrc);
      }

      this.isImageLoading = false;
    },
    (error: any) => {
      console.error('Erreur chargement image prospect', error);
      this.prospectImage = this._sanitizer.bypassSecurityTrustResourceUrl(this.defaultPlaceholder);
      this.isImageLoading = false;
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

  reject() {
    const rejectProspectDialogRef = this.dialog.open(ConfirmationDialogComponent, {
	  data: {
	    heading: 'labels.buttons.Reject',
	    dialogContext: `Êtes-vous sûr de vouloir rejeter le prospect "${this.userData.displayName}"`,
	    type: 'delete'
	  }
    });

	rejectProspectDialogRef.afterClosed().subscribe((result: any) => {
	  if (result && result.confirm) {
		this.prospectsService.rejectProspect(this.userData.id).subscribe(() => {
			this.router.navigate(['/prospects']);
		});
	  }
	});
  }

  /**
   * Accept the prospect and redirects to clients.
   */
  accept() {
    const acceptProspectDialogRef = this.dialog.open(ConfirmationDialogComponent, {
    data: {
      heading: 'labels.buttons.Reject',
      dialogContext: `Êtes-vous sûr de vouloir accepter le prospect "${this.userData.displayName}"`,
      type: 'confirm'
    }
    });

  acceptProspectDialogRef.afterClosed().subscribe((result: any) => {
    if (result && result.confirm) {
  	this.prospectsService.acceptProspect(this.userData.id).subscribe(() => {
  		this.router.navigate(['/clients']);
  	});
    }
  });
  }
  
    /**
   * Change Password of the Users.
   */
  change() {
    const changeUserPasswordDialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '400px',
      height: '300px'
    });

    changeUserPasswordDialogRef.afterClosed().subscribe((response: any) => {
      try {
        if (!response || !response.password || !response.repeatPassword) {
          return; // rien à faire si les champs manquent
        }

        const password = response.password;
        const repeatPassword = response.repeatPassword;

        // Validation simple côté client
        if (password !== repeatPassword) {
          this.snackbar.open('Les mots de passe ne correspondent pas.', 'Fermer', { duration: 3000 });
          return;
        }

        // Payload: adaptez selon votre API si nécessaire
        const data = { password: password, repeatPassword: repeatPassword };
        this.prospectsService.rejectProspect(this.userData.id/*, data*/).subscribe({
          next: () => {
            this.snackbar.open('Mot de passe mis à jour avec succès.', 'Fermer', { duration: 2000 });
            this.router.navigate(['/appusers']);
          },
          error: (err) => {
            const msg = err?.error?.message || 'Échec de la mise à jour du mot de passe';
            this.snackbar.open(msg, 'Fermer', { duration: 5000 });
          }
        });

      } catch (e) {
        this.snackbar.open('Une erreur est survenue lors de la mise à jour du mot de passe.', 'Fermer', { duration: 5000 });
      }
    });
  }
}