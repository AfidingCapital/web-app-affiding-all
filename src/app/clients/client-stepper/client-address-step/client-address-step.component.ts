/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

/** Custom Models */
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { SelectBase } from 'app/shared/form-dialog/formfield/model/select-base';

/** Custom Components */
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';

/** Custom Services */
import { TranslateService } from '@ngx-translate/core';
import { ClientsService } from '../../clients.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Client Address Step Component
 */
@Component({
  selector: 'mifosx-client-address-step',
  templateUrl: './client-address-step.component.html',
  styleUrls: ['./client-address-step.component.scss']
})
export class ClientAddressStepComponent implements OnInit {
  /** Client Address Data */
  clientAddressData: any = [];
  /** Client Address Field Config */
  clientAddressFieldConfig: any;
  /** Client Address Template */
  clientAddressTemplate: any;
  /** Code Values Template */
  codeValuesTemplate: any = {};
  /** Client Id */
  clientId: string;

  /**
   * @param {MatDialog} dialog Mat Dialog
   * @param {TranslateService} translateService Translate Service.
   * @param {ActivatedRoute} route Activated Route
   * @param {ClientsService} clientService Clients Service
   */
  constructor(
    private dialog: MatDialog,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private clientService: ClientsService
  ) {}

  ngOnInit() {
    // Chargement des données via route
    this.route.data.subscribe(
      (data: { clientAddressData: any; clientAddressFieldConfig: any; clientAddressTemplateData: any }) => {
        this.clientAddressData = data.clientAddressData || [];
        this.clientAddressFieldConfig = data.clientAddressFieldConfig;
        this.clientAddressTemplate = data.clientAddressTemplateData;
        this.clientId = this.route.parent!.snapshot.paramMap.get('clientId');
        
        // Traduction des options de type d'adresse
        this.translateAddressTypeOptions();
        
        // DEBUG: Afficher les données pour comprendre la structure
        console.log('clientAddressData:', this.clientAddressData);
        console.log('clientAddressTemplate:', this.clientAddressTemplate);
      }
    );

    // Chargement en parallèle des codes 27, 28, 42, 45, 44, 47
    this.loadAllCodeValues();
  }

  /**
   * Traduit les options de type d'adresse
   */
  private translateAddressTypeOptions() {
    if (this.clientAddressTemplate?.addressTypeIdOptions) {
      for (let index = 0; index < this.clientAddressTemplate.addressTypeIdOptions.length; index++) {
        this.clientAddressTemplate.addressTypeIdOptions[index].name = this.translateService.instant(
          `labels.catalogs.${this.clientAddressTemplate.addressTypeIdOptions[index].name}`
        );
      }
    }
  }

  /**
   * Charge toutes les valeurs de code nécessaires
   */
  private loadAllCodeValues() {
    const obs27 = this.clientService.getCodeValues(27).pipe(catchError(() => of([]))); // Provinces
    const obs28 = this.clientService.getCodeValues(28).pipe(catchError(() => of([]))); // Country
    const obs42 = this.clientService.getCodeValues(42).pipe(catchError(() => of([]))); // District/Town 
    const obs45 = this.clientService.getCodeValues(45).pipe(catchError(() => of([]))); // Sector
    const obs44 = this.clientService.getCodeValues(44).pipe(catchError(() => of([]))); // Neighborhood
    const obs47 = this.clientService.getCodeValues(47).pipe(catchError(() => of([]))); // Postal Code 

    forkJoin([obs27, obs28, obs42, obs45, obs44, obs47]).subscribe(
      (results: any[]) => {
        const provinces = results[0] as any[];
        const country = results[1] as any[];
        const districts = results[2] as any[];
        const sectors = results[3] as any[];
        const neighborhoods = results[4] as any[];
        const postalCodes = results[5] as any[];

        this.codeValuesTemplate = {
          provinceIdOptions: provinces,
          countryIdOptions: country,
          districtTownOptions: districts,
          sectorOptions: sectors,
          neighborhoodOptions: neighborhoods,
          postalCodeOptions: postalCodes
        };

        // Province affichée
        this.codeValuesTemplate.provinceIdOptions = provinces.map((p: any) => ({
          id: p.id,
          name: p.name,
          position: p.position
        }));

        // Country
        this.codeValuesTemplate.countryIdOptions = country.map((c: any) => ({
          id: c.id,
          name: c.name,
          position: c.position
        }));

        // District/Town affichage 
        this.codeValuesTemplate.districtTownOptions = districts.map((d: any) => ({
          id: d.id,
          name: d.name,
          position: d.position
        }));

        // Sectors 
        this.codeValuesTemplate.sectorOptions = sectors
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            position: s.position
          }));

        // Neighborhoods
        this.codeValuesTemplate.neighborhoodOptions = neighborhoods
          .map((n: any) => ({
            id: n.id,
            name: n.name,
            position: n.position
          }));

        // Codes postaux
        this.codeValuesTemplate.postalCodeOptions = postalCodes
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position
          }));
      },
      (err) => {
        console.error('Erreur lors du chargement des codes', err);
      }
    );
  }

  /**
   * Adds a client address.
   */
  addAddress() {
    const data = {
      title: this.translateService.instant('labels.buttons.Add') + ' ' + this.translateService.instant('labels.heading.Address'),
      formfields: this.getAddressFormFields('add'),
      codeValuesTemplate: this.codeValuesTemplate,
      enableDistrictFiltering: true
    };
    
    const addAddressDialogRef = this.dialog.open(FormDialogComponent, { data, width: '50rem' });
    
    addAddressDialogRef.afterClosed().subscribe((response: any) => {
      if (response && response.data) {
        const payload = response.data.value;
        // Comme dans le Fichier 2, on appelle le service pour créer l'adresse
        this.clientService.createClientAddress(this.clientId, payload.addressType, payload).subscribe((res: any) => {
          const newAddress = { ...payload };
          newAddress.addressId = res.resourceId;
          
          // Conversion ID -> Nom pour l'affichage dans le tableau
          const typeObj = this.clientAddressTemplate.addressTypeIdOptions.find((o: any) => o.id == payload.addressType);
          newAddress.addressTypeId =  payload.addressType;

          const options = this.clientAddressTemplate.addressTypeIdOptions;
        const selectedOption = options.find((o: any) => o.id == payload.addressType);
        newAddress.addressType = selectedOption ? selectedOption.name : payload.addressType;
          
          
          this.clientAddressData.push(newAddress);
        });
      }
    });
  }

  /**
   * Edits an existing address.
   * @param {any} address Client address
   * @param {number} index address index
   */
  editAddress(address: any, index: number) {
    // Pour l'édition, nous devons trouver l'ID correspondant au nom
    const addressForForm = { ...address };
    
    // Si address.addressType est un nom, trouver l'ID correspondant
    if (addressForForm.addressType && this.clientAddressTemplate?.addressTypeIdOptions) {
      const addressTypeObj = this.clientAddressTemplate.addressTypeIdOptions.find(
        (option: any) => option.name === addressForForm.addressType
      );
      if (addressTypeObj) {
        addressForForm.addressTypeId = addressTypeObj.id;
      }
    }
    
    const data = {
      title:
        this.translateService.instant('labels.buttons.Edit') +
        ' ' +
        this.translateService.instant('labels.catalogs.Client') +
        ' ' +
        this.translateService.instant('labels.heading.Address'),
      formfields: this.getAddressFormFields('edit', addressForForm),
      layout: { addButtonText: 'Edit' },
      // Passer les données pour le filtrage
      codeValuesTemplate: this.codeValuesTemplate,
      enableDistrictFiltering: true
    };
    
    const editAddressDialogRef = this.dialog.open(FormDialogComponent, { data, width: '50rem' });
    
    editAddressDialogRef.afterClosed().subscribe((response: any) => {
      if (response && response.data) {
        const addressData = response.data.value;
        addressData.addressId = address.addressId;
        addressData.isActive = address.isActive;
        
        // Convertir l'ID en nom pour l'affichage
        if (addressData.addressType && this.clientAddressTemplate?.addressTypeIdOptions) {
          const addressTypeObj = this.clientAddressTemplate.addressTypeIdOptions.find(
            (option: any) => option.id == addressData.addressType
          );
          if (addressTypeObj) {
            addressData.addressType = addressTypeObj.name;
          }
        }
        
        // Mettre à jour l'adresse dans la liste
        this.clientAddressData[index] = addressData;
      }
    });
  }

  /**
   * Toggles address activity.
   * @param {any} address Client Address
   */
  toggleAddress(address: any) {
    address.isActive = !address.isActive;
  }

  /**
   * Checks if field is enabled in address config.
   * @param {any} fieldName Field Name
   */
  isFieldEnabled(fieldName: string): boolean {
    if (!this.clientAddressFieldConfig) return false;
    return this.clientAddressFieldConfig.find((f: any) => f.field === fieldName)?.isEnabled;
  }

  /**
   * Find Pipe doesn't work with accordian
   * @param {any} fieldName Field Name
   * @param {any} fieldId Field Id
   */
  getSelectedValue(fieldName: any, fieldId: any) {
    if (!this.clientAddressTemplate || !this.clientAddressTemplate[fieldName]) return null;
    return this.clientAddressTemplate[fieldName].find((fieldObj: any) => fieldObj.id === fieldId);
  }

  /**
   * Find Pipe doesn't work with accordian
   * @param {any} fieldName Field Name
   * @param {any} fieldId Field Id
   */
  getSelectedCodeValue(fieldName: any, fieldId: any) {
    if (!this.codeValuesTemplate || !this.codeValuesTemplate[fieldName]) return null;
    return this.codeValuesTemplate[fieldName].find((fieldObj: any) => fieldObj.id == fieldId);
  }

  /**
   * Returns address form fields for form dialog.
   * @param {string} formType Form Type
   * @param {any} address Address
   */
  getAddressFormFields(formType?: string, address?: any) {
    let formfields: FormfieldBase[] = [];

    // DEBUG: Afficher les données du formulaire
    console.log('getAddressFormFields appelé avec:', { formType, address });

    // 1. RÉCUPÉRATION SÉCURISÉE DES OPTIONS
    // On vérifie le nom exact des options dans le template
    const addressTypeOptions = this.clientAddressTemplate?.addressTypeIdOptions || [];

    // 2. TRADUCTION (comme dans le fichier 2)
    addressTypeOptions.forEach((option: any) => {
      // Si le nom n'est pas déjà traduit (ne contient pas d'espace ou est une clé)
      if (option.name && !option.name.includes(' ')) {
        option.name = this.translateService.instant(`labels.catalogs.${option.name}`);
      }
    });
    

    // Type d'adresse (seulement pour l'ajout)
   if (this.isFieldEnabled('addressType')) {
      formfields.push(
        new SelectBase({
          controlName: 'addressTypeId', // CHANGEMENT : On utilise addressTypeId pour matcher votre JSON
          label: this.translateService.instant('labels.inputs.Address Type'),
          // On prend l'ID (33) si disponible, sinon on cherche dans addressType
          value: address ? (address.addressTypeId || address.addressType) : '',
          options: { 
            label: 'name', 
            value: 'id', 
            data: addressTypeOptions 
          },
          order: 1,
          required: true
        })
      );
    }
    // Country
    formfields.push(
      this.isFieldEnabled('countryId')
        ? new SelectBase({
            controlName: 'countryId',
            label: this.translateService.instant('labels.inputs.Country'),
            value: address ? address.countryId : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.countryIdOptions || [] 
            },
            order: 2
          })
        : null
    );

    // Province
    formfields.push(
      this.isFieldEnabled('stateProvinceId')
        ? new SelectBase({
            controlName: 'stateProvinceId',
            label: this.translateService.instant('labels.inputs.Province'),
            value: address ? address.stateProvinceId : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.provinceIdOptions || [] 
            },
            order: 3
          })
        : null
    );

    // District/Town
    formfields.push(
      this.isFieldEnabled('addressLine2')
        ? new SelectBase({
            controlName: 'addressLine2',
            label: this.translateService.instant('labels.inputs.District/Town'),
            value: address ? address.addressLine2 : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.districtTownOptions || [] 
            },
            order: 4
          })
        : null
    );

    // City / Sector
    formfields.push(
      this.isFieldEnabled('city')
        ? new SelectBase({
            controlName: 'city',
            label: this.translateService.instant('labels.inputs.Sector/Cheffery/Municipality'),
            value: address ? address.city : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.sectorOptions || [] 
            },
            order: 5
          })
        : null
    );

    // Neighborhood / addressLine3
    formfields.push(
      this.isFieldEnabled('addressLine3')
        ? new SelectBase({
            controlName: 'addressLine3',
            label: this.translateService.instant('labels.inputs.Neighborhood'),
            value: address ? address.addressLine3 : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.neighborhoodOptions || [] 
            },
            order: 6
          })
        : null
    );

    // Village/Avenue
    formfields.push(
      this.isFieldEnabled('addressLine1')
        ? new InputBase({
            controlName: 'addressLine1',
            label: this.translateService.instant('labels.inputs.Village/Avenue'),
            value: address ? address.addressLine1 : '',
            type: 'text',
            order: 7
          })
        : null
    );

    // Postal Code
    formfields.push(
      this.isFieldEnabled('postalCode')
        ? new SelectBase({
            controlName: 'postalCode',
            label: this.translateService.instant('labels.inputs.Postal Code'),
            value: address ? address.postalCode : '',
            options: { 
              label: 'name', 
              value: 'id', 
              data: this.codeValuesTemplate?.postalCodeOptions || [] 
            },
            order: 8
          })
        : null
    );

    // Suppression des nulls
    formfields = formfields.filter((field) => field !== null);
    
    // DEBUG: Afficher les champs générés
    console.log('Champs de formulaire générés:', formfields);
    
    return formfields.filter(field => field !== null).sort((a, b) => a.order - b.order);
  }

  /**
   * Returns the array of client addresses
   */
  get address() {
    return { address: this.clientAddressData ? this.clientAddressData : [] };
  }
}