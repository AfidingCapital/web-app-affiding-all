/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangePasswordDialogComponent } from 'app/shared/change-password-dialog/change-password-dialog.component';
import { MatDialog } from '@angular/material/dialog';

/** Custom Services. */
import { UserService } from '../user.service';
import { User } from '../user.model';

/**
 * View self service user component.
 */
@Component({
  selector: 'mifosx-view-user',
  templateUrl: './view-user.component.html',
  styleUrls: ['./view-user.component.scss']
})
export class ViewUserComponent implements OnInit {
  /** Self service user (from resolve). */
  user?: User;

  // Nouveau: utilisateur sélectionné via l’API par ID
  selectedUser?: User;
  loadingSelectedUser = false;

  // Debug: activez pour afficher les logs
  debugMode = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Initialisation depuis le resolver si présent
    this.route.data.subscribe((data: { user: User }) => {
      this.user = data.user;
      if (data.user) {
        this.selectedUser = this.normalizeUser(data.user);
        if (this.debugMode) {
          // console.log('ViewUser: initialisé depuis resolver ->', {
          //   user: this.user,
          //   selectedUser: this.selectedUser
          // });
        }
      }
    });

    // Lecture de l'ID dans l'URL et chargement via API si nécessaire
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id) && (!this.selectedUser || this.selectedUser.id !== id)) {
          this.selectUser(id);
        }
      }
    });
  }

  /**
   * Open Dialog to Change Password
   */
  changeUserPassword() {
    // Utilise l’ID sélectionné si disponible
    const targetId = this.selectedUser?.id ?? this.user?.id;
    if (!targetId) return;

    const changeUserPasswordDialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '400px',
      height: '300px'
    });
    changeUserPasswordDialogRef.afterClosed().subscribe((response: any) => {
      if (response?.password && response?.repeatPassword) {
        const payload = { password: response.password, repeatPassword: response.repeatPassword };
        this.userService.changePassword(String(targetId), payload).subscribe(() => {
          this.router.navigate(['../../']);
        });
      }
    });
  }

  // Nouvelle: sélection d’un utilisateur via ID (appel API à chaque clic)
  selectUser(id: number): void {
    if (!id) return;

    this.loadingSelectedUser = true;

    this.userService.getUserById(id).subscribe(
      (u: User) => {
        this.selectedUser = this.normalizeUser(u);
        this.loadingSelectedUser = false;
        if (this.debugMode) {
         // console.log('ViewUser: chargé via selectUser ->', this.selectedUser);
        }
      },
      (err: any) => {
        console.error('Erreur lors de la récupération de l’utilisateur', err);
        this.loadingSelectedUser = false;
      }
    );
  }

  // Helper: normalise les champs pour s’aligner avec le template
  private normalizeUser(u: any): User {
    return {
      id: u?.id,
      username: u?.username ?? '',
      firstname: u?.firstname ?? u?.firstName ?? '',
      lastName: u?.lastName ?? u?.lastname ?? '',
      gender: u?.gender ?? '',
      dateOfBirth: u?.dateOfBirth ?? '',
      email: u?.email ?? '',
      mobile: u?.mobile ?? '',
      office: u?.officeName ?? u?.office ?? '',
      staff: u?.staff ?? {}
    } as User;
  }

  isActive(user?: User): boolean {
    return !!(user?.staff?.isActive);
  }

  activateUser(id?: number): void {
    if (!id) return;
    this.userService.activateUser(id).subscribe(() => {
      if (this.selectedUser?.id === id) {
        const s = { ...(this.selectedUser || {}) } as User;
        (s.staff as any) = { ...(s.staff || {}), isActive: true };
        this.selectedUser = s;
      }
      if (this.debugMode) {
        //console.log('ViewUser: activation complète pour id', id);
      }
    });
  }

  deactivateUser(id?: number): void {
    if (!id) return;
    this.userService.deactivateUser(id).subscribe(() => {
      if (this.selectedUser?.id === id) {
        const s = { ...(this.selectedUser || {}) } as User;
        (s.staff as any) = { ...(s.staff || {}), isActive: false };
        this.selectedUser = s;
      }
      if (this.debugMode) {
        //console.log('ViewUser: désactivation complète pour id', id);
      }
    });
  }

  formatJoiningDate(date?: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }
}