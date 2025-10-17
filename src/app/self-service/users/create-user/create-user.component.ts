/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientsService } from 'app/clients/clients.service';
import { SettingsService } from 'app/settings/settings.service';
import { SelfRegistrationPayload, UserService } from 'app/self-service/users/user.service';

/**
 * Create self service user component.
 *
 * TODO: Complete functionality once API is available.
 */
@Component({
  selector: 'mifosx-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent implements OnInit {
  
  //Ajouter un mode debug et un logger sûr
  private debugMode = true;
  private log(...args: any[]) {
    if (this.debugMode) {
      console.log(...args);
    }
  }

  activeClients: any[] = [];          // clients Actifs retournés par l’API
  filteredActiveClients: any[] = [];   // liste filtrée côté UI
  clientNameControl: UntypedFormControl = new UntypedFormControl(''); // champ de saisie



  /** Create Client Form */

  createUserForm: UntypedFormGroup;

  /** Denotes type of user. */
  userTypes = [
    'Existing User',
    'New User'
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

  /**
   * @param {SettingsService} settingsService Settings Service
   */
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
      // data peut être un tableau ou { pageItems: [...] }
      const items: any[] = Array.isArray(data)
        ? data
        : (data?.pageItems ?? []);

      // Mapper chaque item pour assurer les champs utilisés par l'UI
      this.activeClients = items.map(it => ({
        id: it.id,
        displayName: it.displayName ?? it.name ?? it.fullname ?? it.accountNo ?? ''
      }));

      // Liste utilisable par l'autocomplete
      this.filteredActiveClients = this.activeClients;
      this.log('Active clients loaded', this.activeClients);
    },
    error: (err) => this.log('Erreur lors du chargement des clients actifs', err)
  });
}

  //Appeler ce logger pour les valeurs initiales  et les changements de formulaire
  ngOnInit() {
    this.minDate = this.settingsService.minAllowedDate;
    this.maxDate = this.settingsService.businessDate;
    this.setClientForm();
    this.buildDependencies();

    // Charger les clients actifs et prépare l'autocomplete
  this.loadActiveClients();

  // Filtrage live par nom (serveur si supporté)
  this.clientNameControl.valueChanges
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe(val => {
      // Toujours passer une string ou ''
      const q = typeof val === 'string' ? val : '';
      this.loadActiveClients(q);
    });


    //Logs de débogage initiaux
    this.log('CreateUserComponent: initial existingUserForm value', this.createUserForm?.value);
  // Abonnements aux changements de valeurs (pour tous les champs existants)
  if (this.createUserForm) {
    this.createUserForm.valueChanges.subscribe(v => {
      // Logez les valeurs, mais ne logguez pas les mots de passe bruts
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



//Afficher le nom du client dans le champ autocomplete
displayClientName = (client?: any) => {
  if (!client) return '';
  // Le paramètre 'client' sera soit une string (après typing) ou un object
  // Ici on gère l’objet retourné par loadActiveClients
  //Si on reçoit l’objet directement, on prend le displayName/name
  return client.displayName ?? client.name ?? client.fullname ?? client.accountNo ?? '';
};

//Lorsqu'une option est sélectionnée dans l'autocomplete
onClientSelected(event: MatAutocompleteSelectedEvent) {
  const selected = event.option.value;//devrait être l'objet client
  let id: number | undefined;

// Si c'est un objet, prendre directement l'id
  if (selected && typeof selected === 'object') {
    id = selected.id;
  } else if (typeof selected === 'string') {
    // Si c'est une string, tenter de match avec notre liste
    const found = this.activeClients.find(a =>
      (a.displayName ?? a.name ?? a.fullname ?? a.accountNo ?? '') === selected
    );
    id = found?.id;
  }

  // Mettre à jour le champ réel du formulaire (nouveau champ: clients)
  this.createUserForm.get('clients')?.setValue(id != null ? [id] : []);
  // Mettre à jour l'affichage du champ d'autocomplétion sans émettre un nouvel état inutile
  const label = this.displayClientName(selected);
  this.clientNameControl.setValue(label, { emitEvent: false });

this.log('Client sélectionné – id:', id, 'label:', label);

}

  /**
   * Creates the client form.
   */
  setClientForm() {
  this.createUserForm = this.formBuilder.group({
    username: ['', Validators.required],
    firstname: ['', Validators.required],
    lastname: ['', Validators.required],
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

   // Logs après création
  this.log('setClientForm: createUserForm created', this.createUserForm.value);
  // Logs des changements (déjà dans ngOnInit si setClientForm appelé avant)
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
  // Log du démarrage de l’action et du payload (payload affiché sans password)
  const payload: SelfRegistrationPayload = {
    username: this.createUserForm.get('username').value,
    firstname: this.createUserForm.get('firstname').value,
    lastname: this.createUserForm.get('lastname').value,
    email: this.createUserForm.get('email').value,
    officeId: this.createUserForm.get('officeId').value,
    // roles est un tableau
    roles: this.createUserForm.get('roles').value,
    sendPasswordToEmail: !!this.createUserForm.get('sendPasswordToEmail').value,
    staffId: this.createUserForm.get('staffId')?.value,
    isSelfServiceUser: this.createUserForm.get('isSelfServiceUser')?.value,
    // Password never expires est statique
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

  this.userService.registerSelfServiceUser(payload).subscribe(
    resp => {
      this.log('Utilisateur créé avec succès', resp);
      // éventuellement rediriger ou afficher un message
    },
    err => {
      this.log('Erreur lors de la création', err);
      // afficher une alerte ou message utilisateur
    }
  );

}


logAction(action: string) {
  this.log('Action actionLogger:', action);
  // vous pouvez ajouter des informations supplémentaires si nécessaire
}


  /**
   * Adds controls conditionally.
   */
  buildDependencies() {
    this.createUserForm.get('officeId').valueChanges.subscribe((officeId: number) => {
      this.log('officeId changed ->', officeId);
      this.clientService.getClientWithOfficeTemplate(officeId).subscribe((clientTemplate: any) => {
        this.staffOptions = clientTemplate.staffOptions;
        this.genderOptions = clientTemplate.genderOptions;
        this.log('clientTemplate loaded', clientTemplate);
      });
    });
  }
}