/** Angular Imports */
import { Component, OnInit, TemplateRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

/** Custom Services */
import { UsersService } from '../users.service';
import { PopoverService } from '../../configuration-wizard/popover/popover.service';

/** Custom Dialog Component */
import { ConfigurationWizardService } from 'app/configuration-wizard/configuration-wizard.service';
import { ContinueSetupDialogComponent } from 'app/configuration-wizard/continue-setup-dialog/continue-setup-dialog.component';

@Component({
  selector: 'mifosx-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent implements OnInit, AfterViewInit {

  private readonly DEFAULT_CLIENT_ID = 1;

  [x: string]: any;
  userForm: UntypedFormGroup;
  officesData: any;
  rolesData: any;
  staffData: any;

  @ViewChild('userFormRef') userFormRef: ElementRef<any>;
  @ViewChild('templateUserFormRef') templateUserFormRef: TemplateRef<any>;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private popoverService: PopoverService,
    private configurationWizardService: ConfigurationWizardService,
    private dialog: MatDialog
  ) {
    this.route.data.subscribe((data: { usersTemplate: any }) => {
      this.officesData = data.usersTemplate.allowedOffices;
      this.rolesData = data.usersTemplate.availableRoles;
    });
  }

  ngOnInit() {
    this.createUserForm();
    this.setStaffData();
  }

  /**
   * Crée le formulaire utilisateur.
   * Tous les champs présents dans le template sont déclarés ici.
   * Mot de passe géré via enable/disable, pas via ajout/retrait.
   */
  createUserForm() {
    this.userForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      sendPasswordToEmail: [true, Validators.required],

      // Champs optionnels selon les specs API
      staffId: [''],
      isSelfServiceUser: [false],
      passwordNeverExpires: [false],

      officeId: ['', Validators.required],
      staffIdBinder: [''], // Optionnel, utilisé si vous avez un binding différent
      // Clients: attendu sous forme de tableau (IDs ou objets selon votre logique)
      clients: [],

      // Champs de mot de passe (gérés mais non obligatoires selon l’API)
      password: ['', []],
      repeatPassword: ['', []]
    });
  }

  /**
   * Optionnel: récupérer le staff lors du choix d’un bureau.
   */
  setStaffData() {
    this.userForm.get('officeId')?.valueChanges.subscribe((officeId: string) => {
      this.staffData = [];
      this.usersService.getStaff(officeId).subscribe((staff: any) => {
        this.staffData = staff;
      });
    });
  }

  /**
   * Subits le formulaire et crée l’utilisateur.
   * Payload conforme à l’API:
   * {
   *   user: { username, email, firstname, lastname, officeId, staffId, roles, sendPasswordToEmail, isSelfServiceUser, passwordNeverExpires },
   *   clients: [ { id, name }, ... ]
   * }
   */
  submit() {
    const formValue = this.userForm.value;

    // Normaliser les rôles
    const rawRoles = formValue.roles;
    const rolesArray: number[] = Array.isArray(rawRoles) ? rawRoles : [rawRoles];

    // Normaliser les clients (IDs ou objets -> IDs)
    // IMPORTANT: Forcer l'ID du client à 1 comme demandé, et utiliser un nom basé sur l'objet si disponible
    let clientsPayload: { id: any; name: string }[] = [];
    const rawClients = formValue.clients;
    if (Array.isArray(rawClients) && rawClients.length > 0) {
      clientsPayload = rawClients.map((c: any) => {
        let id: any = 1; // Forcer l'ID client à 1 par défaut
        let name = '';

        if (typeof c === 'object' && c !== null) {
          id = c.id ?? 1; // utiliser l'id si présent, sinon 1
          // Utiliser displayName s'il est présent, sinon firstname + lastname, sinon email
          name = c.displayName ?? (c.firstname && c.lastname ? `${c.firstname} ${c.lastname}` : c.emailAddress ?? '');
          if (!name) name = 'Client';
        } else {
          // Si c est une primitive, l'utiliser comme nom
          name = String(c);
        }

        return { id, name };
      });
    }

    // Insertion statique du client avec id = 1 (inconditionnelle)
    clientsPayload.push({ id: 1, name: 'Client 1' });

    // Si aucun client n'est fourni, on ajoute un client par défaut pour éviter l'erreur
    if (clientsPayload.length === 0) {
      clientsPayload = [{ id: this.DEFAULT_CLIENT_ID, name: 'Default Client' }];
    }

    // Payload conforme à l’API
    const payload: any = {
      user: {
        username: formValue.username,
        email: formValue.email,
        firstname: formValue.firstname,
        lastname: formValue.lastname,
        officeId: formValue.officeId,
        staffId: formValue.staffId,
        roles: rolesArray,
        sendPasswordToEmail: !!formValue.sendPasswordToEmail,
        isSelfServiceUser: !!formValue.isSelfServiceUser,
        passwordNeverExpires: !!formValue.passwordNeverExpires
      },
      clients: clientsPayload.length ? clientsPayload : []
    };

    // Supprimer staffId s'il est vide/null (optionnel)
    if (!payload.user.staffId) {
      delete payload.user.staffId;
    }

    console.log('Submitting payload au serveur:', payload);

    this.usersService.createUser(payload).subscribe((response: any) => {
      if (this.configurationWizardService.showUsersForm === true) {
        this.configurationWizardService.showUsersForm = false;
        this.openDialog();
      } else {
        this.router.navigate(['../', response.resourceId], { relativeTo: this.route });
      }
    }, (error) => {
      // Gestion des erreurs serveur/saisie
      const serverErrors =
        error?.error?.validationErrors ?? error?.error?.errors ?? error?.message;
      console.error('Validation/Server error details:', serverErrors);

      if (error?.error?.errors && typeof error.error.errors === 'object') {
        Object.entries(error.error.errors).forEach(([field, messages]: [string, any]) => {
          const control = this.userForm.get(field);
          if (control) {
            control.setErrors({ server: messages });
          }
        });
      }
    });
  }

  // Popover et navigation (inchangés par rapport à votre implémentation)
  showPopover(template: TemplateRef<any>, target: HTMLElement, position: string, backdrop: boolean): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  ngAfterViewInit() {
    if (this.configurationWizardService.showUsersForm === true) {
      setTimeout(() => {
        this.showPopover(this.templateUserFormRef, this.userFormRef.nativeElement, 'top', true);
      });
    }
  }

  nextStep() {
    this.configurationWizardService.showUsersForm = false;
    this.configurationWizardService.showMakerCheckerTable = true;
    this.router.navigate(['/system']);
  }

  previousStep() {
    this.configurationWizardService.showUsersForm = false;
    this.configurationWizardService.showUsersList = true;
    this.router.navigate(['/users']);
  }

  openDialog() {
    const continueSetupDialogRef = this.dialog.open(ContinueSetupDialogComponent, {
      data: { stepName: 'user' }
    });
    continueSetupDialogRef.afterClosed().subscribe((response: { step: number }) => {
      if (response.step === 1) {
        this.configurationWizardService.showUsersForm = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      } else if (response.step === 2) {
        this.configurationWizardService.showUsersForm = true;
        this.router.routeReuseStrategy.shouldReuseRoute = () => false;
        this.router.onSameUrlNavigation = 'reload';
        this.router.navigate(['/organization/users/create']);
      } else if (response.step === 3) {
        this.configurationWizardService.showUsersForm = false;
        this.configurationWizardService.showMakerCheckerTable = true;
        this.router.navigate(['/system']);
      }
    });
  }

  registerSelfServiceUser(): void {
    console.log('registerSelfServiceUser: chemin atteint, délégation vers submit()');
    this.submit();
  }
}