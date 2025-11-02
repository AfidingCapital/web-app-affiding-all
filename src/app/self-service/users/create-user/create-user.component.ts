/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientsService } from 'app/clients/clients.service';
import { SettingsService } from 'app/settings/settings.service';
import { SelfRegistrationPayload, UserService } from 'app/self-service/users/user.service';

/** Create self service user component. */
@Component({
  selector: 'mifosx-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent implements OnInit {
  private debugMode = true;
  private log(...args: any[]) {
    if (this.debugMode) {
     // console.log(...args);
    }
  }

  activeClients: any[] = [];
  filteredActiveClients: any[] = [];
  clientNameControl: UntypedFormControl = new UntypedFormControl('');

  /** Selected client object (stocké lors de la sélection dans l'autocomplete) */
  selectedClient: any = null;

  /** Create Client Form */
  createUserForm: UntypedFormGroup;

  /** Message de notification UI */
  creationMessage: string | null = null;

  /** Denotes type of user. */
  userTypes = [
    'Existing User',
    //'New User'
  ];
  /** Radio button group form control for type of user. */
  userType = new UntypedFormControl(this.userTypes[0]);
  /** Placeholder for office data. */
  offices: any[] = [];
  /** Placeholder for staff data. */
  staffOptions: any[] = [];
  /** Placeholder for staff data. */
  genderOptions: any[] = [];
  /** Placeholder for client data. */
  clientData: any[] = [];
  /** Placeholder for gender data. */
  genderData = [
    'Male',
    'Female'
  ];
  /** Minimum date of birth of user allowed. */
  minDate = new Date(1900, 0, 1);
  /** Maximum date of birth of user allowed. */
  maxDate = new Date();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private clientService: ClientsService,
    private settingsService: SettingsService,
    private userService: UserService,
  ) {
    this.route.data.subscribe((data: { offices: any }) => {
      this.offices = data.offices;
    });
  }

  loadActiveClients(filterName?: string): void {
    // filterName est supposé être une string; sinon on passe ''
    const q = typeof filterName === 'string' ? filterName : '';
    this.clientService.getActiveClients(q).subscribe({
      next: (data: any) => {
        // Adapter selon la forme exacte de ta réponse:
        const items: any[] = Array.isArray(data) ? data : (data?.pageItems ?? []);
        this.activeClients = items.map(it => ({
          id: it.id,
          displayName: it.displayName ?? '',
          emailAddress: it.emailAddress ?? '',
          firstname: it.firstname ?? '',
          lastname: it.lastname ?? ''
        }));
        // Liste utilisable par l'autocomplete
        this.filteredActiveClients = this.activeClients;
        this.log('Active clients loaded', this.activeClients);
      },
      error: (err) => this.log('Erreur lors du chargement des clients actifs', err)
    });
  }

  ngOnInit() {
    this.minDate = this.settingsService.minAllowedDate;
    this.maxDate = this.settingsService.businessDate;
    this.setClientForm();
    this.buildDependencies();

    // Charger les clients actifs et prépare l'autocomplete
    this.loadActiveClients();

    // Filtrage live par nom
    this.clientNameControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(val => {
        const q = typeof val === 'string' ? val : '';
        this.loadActiveClients(q);
      });

    this.log('CreateUserComponent: initial existingUserForm value', this.createUserForm?.value);
    if (this.createUserForm) {
      this.createUserForm.valueChanges.subscribe(v => {
        const sanitized = {
          username: v.username,
          firstname: v.firstname,
          lastname: v.lastname,
          email: v.email,
          officeId: v.officeId,
          roles: v.roles,
          sendPasswordToEmail: v.sendPasswordToEmail,
          staffId: v.staffId,
          isSelfServiceUser: v.isSelfServiceUser,
          passwordProvided: !!v.password,
        };
        this.log('CreateUserForm valueChanges (sanitized):', sanitized);
      });
    }
  }

  // Utilitaire d'affichage du nom du client
  displayClientName = (client?: any) => {
    if (!client) return '';
    return client.displayName;
  };

  // Utilitaire d'affichage du mail
  displayClientMail = (client?: any) => {
    if (!client) return '';
    return client.emailAddress;
  };

  // Utilitaire d'affichage du firstname
  displayClientFirstname = (client?: any) => {
    if (!client) return '';
    return client.firstname;
  };

  // Utilitaire d'affichage du lastname
  displayClientLastname = (client?: any) => {
    if (!client) return '';
    return client.lastname;
  };

  // Lorsqu'une option est sélectionnée dans l'autocomplete
  onClientSelected(event: MatAutocompleteSelectedEvent) {
    const selected = event.option.value;
    this.selectedClient = typeof selected === 'object' ? selected : null;

    const id = this.selectedClient?.id ?? (typeof selected === 'object' ? selected.id : undefined);
    const emailFromClient = this.displayClientMail(selected);
    const firstnameFromClient = this.displayClientName(selected);
    const lastnameFromClient = this.displayClientName(selected);
    const usernameCandidate = this.displayClientName(selected);

    this.createUserForm.patchValue({
      clients: id != null ? [id] : [],
      firstname: firstnameFromClient ?? '',
      lastname: lastnameFromClient ?? '',
      username: usernameCandidate ?? '',
      email: emailFromClient ?? ''
    });

    this.clientNameControl.setValue(usernameCandidate, { emitEvent: false });

    this.log('Client sélectionné – id:', id, 'firstnameFromClient:', firstnameFromClient, 'lastnameFromClient:', lastnameFromClient, 'username:', usernameCandidate, 'emailClient:', emailFromClient);
  }


  /**
   * Creates the client form.
   */
  setClientForm() {
    this.createUserForm = this.formBuilder.group({
      username: ['', Validators.required],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      // On utilise email comme champ de secours; emailAddress est pris depuis le client sélectionné
      email: ['', [Validators.required, Validators.email]],
      officeId: ['', Validators.required],
      // Roles est un tableau; valeur par défaut [2] pour aligner avec l’exemple
      roles: [[2], Validators.required],
      sendPasswordToEmail: [false, Validators.required],
      staffId: [''],
      isSelfServiceUser: [true],
      // Remplacement de clientId par clients, avec valeur par défaut [1]
      clients: [[1]] // NA: tableau de clients sélectionnés (valeur par défaut 1)
    });

    this.log('setClientForm: createUserForm created', this.createUserForm.value);
    this.createUserForm.valueChanges.subscribe(v => {
      const sanitized = {
        username: v.username,
        firstname: v.firstname,
        lastname: v.lastname,
        email: v.email,
        officeId: v.officeId,
        staffId: v.staffId,
        isSelfServiceUser: v.isSelfServiceUser,
        passwordProvided: !!v.password
      };
      this.log('setClientForm valueChanges (sanitized):', sanitized);
    });
  }

  registerSelfServiceUser() {
    const username = this.createUserForm.get('username')?.value;
    const firstnameUI = this.createUserForm.get('firstname')?.value;
    const lastnameUI = this.createUserForm.get('lastname')?.value;

    // Email: priorité sur emailAddress du client sélectionné, sinon fallback sur le champ email
    const emailFromSelectedClient = this.selectedClient?.emailAddress ?? null;
    const emailFromForm = this.createUserForm.get('email')?.value ?? '';
    const emailValue = emailFromSelectedClient ?? emailFromForm;

    const payload: SelfRegistrationPayload = {
      username: username,
      firstname: firstnameUI,
      lastname: lastnameUI,
      email: emailValue, // emailValue est rempli depuis emailAddress du client sélectionné
      officeId: this.createUserForm.get('officeId')?.value,
      roles: this.createUserForm.get('roles')?.value,
      sendPasswordToEmail: !!this.createUserForm.get('sendPasswordToEmail')?.value,
      staffId: this.createUserForm.get('staffId')?.value,
      isSelfServiceUser: this.createUserForm.get('isSelfServiceUser')?.value,
      passwordNeverExpires: false,
      clients: this.createUserForm.get('clients')?.value
    };

    const sanitizedPayload = {
      username: payload.username,
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
      officeId: payload.officeId,
      roles: payload.roles,
      sendPasswordToEmail: payload.sendPasswordToEmail,
      staffId: payload.staffId,
      isSelfServiceUser: payload.isSelfServiceUser,
      passwordNeverExpires: payload.passwordNeverExpires,
      clients: payload.clients
    };

    this.log('Payload prepared (sanitized):', sanitizedPayload);
    // Reset le message avant nouvelle création
    this.creationMessage = null;

    this.userService.registerSelfServiceUser(payload).subscribe(
      resp => {
        this.log('Utilisateur créé avec succès', resp);
        // Afficher le message à l'UI
        this.creationMessage = 'Utilisateur créé avec succès';
        // Optionnel: réinitialiser le formulaire après succès
        // this.createUserForm.reset({ isSelfServiceUser: true, clients: [1], roles: [2], sendPasswordToEmail: false });
      },
      err => {
        this.log('Erreur lors de la création', err);
        // Afficher un message d'erreur générique ou plus précis si dispo
        this.creationMessage = 'Erreur lors de la création de l’utilisateur';
      }
    );
  }

  logAction(action: string) {
    this.log('Action actionLogger:', action);
  }

  buildDependencies() {
    this.createUserForm.get('officeId')?.valueChanges.subscribe((officeId: number) => {
      this.log('officeId changed ->', officeId);
      this.clientService.getClientWithOfficeTemplate(officeId).subscribe((clientTemplate: any) => {
        this.staffOptions = clientTemplate.staffOptions;
        this.genderOptions = clientTemplate.genderOptions;
        this.log('clientTemplate loaded', clientTemplate);
      });
    });
  }
}