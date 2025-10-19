/** Angular Imports */
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Custom Services */
import { UsersService } from '../users.service';

/** Custom Components */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChangePasswordDialogComponent } from 'app/shared/change-password-dialog/change-password-dialog.component';

/**
 * View user component.
 */
@Component({
  selector: 'mifosx-view-user',
  templateUrl: './view-user.component.html',
  styleUrls: ['./view-user.component.scss']
})
export class ViewUserComponent {
  /** User Data. */
  userData: any;

  /**
   * Retrieves the user data from `resolve`.
   * @param {UsersService} usersService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Dialog reference.
   * @param {MatSnackBar} snackbar Snackbar for messages.
   */
  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {
    this.route.data.subscribe((data: { user: any }) => {
      this.userData = data.user;
    });
  }

  /**
   * Deletes the user and redirects to users.
   */
  delete() {
    const deleteUserDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `user ${this.userData.id}` }
    });
    deleteUserDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.usersService.deleteUser(this.userData.id).subscribe(() => {
          this.router.navigate(['/appusers']);
        });
      }
    });
  }

  /**
   * Change Password of the Users.
   */
  changeUserPassword() {
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
        this.usersService.changePassword(this.userData.id, data).subscribe({
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