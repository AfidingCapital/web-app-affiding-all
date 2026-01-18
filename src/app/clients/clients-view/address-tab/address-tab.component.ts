/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { SelectBase } from 'app/shared/form-dialog/formfield/model/select-base';

/** Custom Components */
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';

/** Custom Services */
import { TranslateService } from '@ngx-translate/core';
import { ClientsService } from '../../clients.service';
import { forkJoin } from 'rxjs';

/**
 * Clients Address Tab Component
 */
@Component({
  selector: 'mifosx-address-tab',
  templateUrl: './address-tab.component.html',
  styleUrls: ['./address-tab.component.scss']
})
export class AddressTabComponent implements OnInit {
  /** Client Address Data */
  clientAddressData: any;
  /** Client Address Field Config */
  clientAddressFieldConfig: any;
  /** Client Address Template */
  clientAddressTemplate: any;
  codeValuesTemplate: any = {}; // Pour les codes 27, 42, 45, 44, 47
  /** Client Id */
  clientId: string;

  // Options visibles
  public provinceIdOptions: any[] = []; // Province (27)
  public districtTownOptions: any[] = []; // District/Town (anciennement filtré, mais maintenant autonome)
  public sectorOptions: any[] = []; // Sector/Cheffery/Municipality (45)
  public neighborhoodOptions: any[] = []; // Neighborhood (44)
  public postalCodeOptions: any[] = []; // Postal Code (47)

  // Listes brutes en arrière-plan
  private allDistrictTownOptionsRaw: any[] = [];
  private allTerritoryOptionsRaw: any[] = []; // Brut pour Territoire (District/Town)

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientsService,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {}

  ngOnInit() {
    // Chargement des données via route
    this.route.data.subscribe(
      (data: { clientAddressData: any; clientAddressFieldConfig: any; clientAddressTemplateData: any }) => {
        this.clientAddressData = data.clientAddressData;
        this.clientAddressFieldConfig = data.clientAddressFieldConfig;
        this.clientAddressTemplate = data.clientAddressTemplateData;
        this.clientId = this.route.parent!.snapshot.paramMap.get('clientId');
      }
    );

    // Chargement en parallèle des codes 27, 42, 45, 44
    this.loadAllCodeValues();
  }

  private loadAllCodeValues() {
    const obs27 = this.clientService.getCodeValues(27); // Provinces
    const obs42 = this.clientService.getCodeValues(42); // District/Town (autonome)
    const obs45 = this.clientService.getCodeValues(45); // Sector
    const obs44 = this.clientService.getCodeValues(44); // Neighborhood
    const obs47 = this.clientService.getCodeValues(47); // Postal Code 

    forkJoin([obs27, obs42, obs45, obs44, obs47]).subscribe(
      (results: any[]) => {
        const provinces = results[0] as any[];
        const districts = results[1] as any[];
        const sectors = results[2] as any[];
        const neighborhoods = results[3] as any[];
        const postalCodes = results[4] as any[];

        this.codeValuesTemplate = {
          provinceIdOptions: provinces,
          districtTownOptions: districts,
          sectorOptions: sectors,
          neighborhoodOptions: neighborhoods,
          postalCodeOptions: postalCodes,
        };

        // Données brutes
        this.allDistrictTownOptionsRaw = districts;
        // Territoire brut, utilisé tel quel comme options autonome
        this.allTerritoryOptionsRaw = districts;

        // Provinces affichées (avec position)
        this.provinceIdOptions = provinces.map((p: any) => ({
          id: p.id,
          name: p.name,
          position: p.position
        }));

    
        // District/Town affichage (autonome aussi, identique à Territoire ici)
        this.districtTownOptions = districts.map((d: any) => ({
          id: d.id,
          name: d.name,
          position: d.position
        }));

        // Sectors 
        this.sectorOptions = sectors
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            position: s.position
          }));

          // Neighborhoods
        this.neighborhoodOptions = neighborhoods
          .map((n: any) => ({
            id: n.id,
            name: n.name,
            position: n.position
          }));

          //PostalCode
          this.postalCodeOptions = postalCodes
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
      title:
        this.translateService.instant('labels.buttons.Add') +
        ' ' +
        this.translateService.instant('labels.catalogs.Client') +
        ' ' +
        this.translateService.instant('labels.heading.Address'),
      formfields: this.getAddressFormFields('add')
    };
    const addAddressDialogRef = this.dialog.open(FormDialogComponent, { data });
    addAddressDialogRef.afterClosed().subscribe((response: any) => {
      if (response.data) {
        this.clientService
          .createClientAddress(this.clientId, response.data.value.addressType, response.data.value)
          .subscribe((res: any) => {
            const addressData = response.data.value;
            addressData.addressId = res.resourceId;
            addressData.addressType = this.getSelectedValue('addressTypeIdOptions', addressData.addressType).name;
            addressData.isActive = false;
            this.clientAddressData.push(addressData);

            // Rien à filtrer en fonction de Province ici, version autonome
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
    const data = {
      title:
        this.translateService.instant('labels.buttons.Edit') +
        ' ' +
        this.translateService.instant('labels.catalogs.Client') +
        ' ' +
        this.translateService.instant('labels.heading.Address'),
      formfields: this.getAddressFormFields('edit', address),
      layout: { addButtonText: 'Edit' }
    };
    const editAddressDialogRef = this.dialog.open(FormDialogComponent, { data });
    editAddressDialogRef.afterClosed().subscribe((response: any) => {
      if (response.data) {
        const addressData = response.data.value;
        addressData.addressId = address.addressId;
        addressData.isActive = address.isActive;
        this.clientService
          .editClientAddress(this.clientId, address.addressTypeId, addressData)
          .subscribe((res: any) => {
            addressData.addressTypeId = address.addressTypeId;
            addressData.addressType = address.addressType;
            this.clientAddressData[index] = addressData;
          });
      }
    });
  }

  /**
   * Toggles address activity.
   * @param {any} address Client Address
   */
  toggleAddress(address: any) {
    const addressData = {
      addressId: address.addressId,
      isActive: address.isActive ? false : true
    };
    this.clientService.editClientAddress(this.clientId, address.addressTypeId, addressData).subscribe(() => {
      address.isActive = address.isActive ? false : true;
    });
  }

  /**
   * Checks if field is enabled in address config.
   * @param {any} fieldName Field Name
   */
  isFieldEnabled(fieldName: any) {
    return this.clientAddressFieldConfig.find((fieldObj: any) => fieldObj.field === fieldName)?.isEnabled;
  }

  /**
   * Find Pipe doesn't work with accordian
   * @param {any} fieldName Field Name
   * @param {any} fieldId Field Id
   */
  getSelectedValue(fieldName: any, fieldId: any) {
    return this.clientAddressTemplate[fieldName].find((fieldObj: any) => fieldObj.id === fieldId);
  }

  /**
   * Find Pipe doesn't work with accordian
   * @param {any} fieldName Field Name
   * @param {any} fieldId Field Id
   */

  getSelectedCodeValue(fieldName: any, fieldId: any) {
    if(this.codeValuesTemplate[fieldName]) {
      return this.codeValuesTemplate[fieldName].find((fieldObj: any) => fieldObj.id == fieldId);
    }
    return "";
  }

  /**
   * Returns address form fields for form dialog.
   * @param {string} formType Form Type
   * @param {any} address Address
   */
  getAddressFormFields(formType?: string, address?: any) {
    let formfields: FormfieldBase[] = [];

    for (let index = 0; index < this.clientAddressTemplate.addressTypeIdOptions.length; index++) {
      this.clientAddressTemplate.addressTypeIdOptions[index].name = this.translateService.instant(
        `labels.catalogs.${this.clientAddressTemplate.addressTypeIdOptions[index].name}`
      );
    }

    // Utilitaire interne: pushSelectField (factoring)
    const pushSelectField = (spec: {
      enabledKey: string;
      controlName: string;
      labelKey: string;
      valueGetter: (addr?: any) => any;
      options: { label: string; value: string; data: any[] };
      order: number;
    }) => {
      const enabled = this.isFieldEnabled(spec.enabledKey);
      const value = spec.valueGetter?.(address) ?? '';
      if (enabled) {
        formfields.push(
          new SelectBase({
            controlName: spec.controlName,
            label: this.translateService.instant(spec.labelKey),
            value,
            options: spec.options,
            order: spec.order
          })
        );
      } else {
        formfields.push(null);
      }
    };

    // Champs communs et logique d’ajout
    if (formType === 'add') {
      pushSelectField({
        enabledKey: 'addressType',
        controlName: 'addressType',
        labelKey: 'labels.inputs.Address Type',
        valueGetter: (addr) => (addr ? addr.addressType : ''), // addressType lors d'un ajout
        options: { label: 'name', value: 'id', data: this.clientAddressTemplate.addressTypeIdOptions },
        order: 1
      });
    }

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
    pushSelectField({
      enabledKey: 'postalCode',
      controlName: 'postalCode',
      labelKey: 'labels.inputs.Postal Code',
      valueGetter: (addr) => addr?.postalCode ?? '',
      options: { label: 'name', value: 'id', data: this.postalCodeOptions },
      order: 9
    });
           

    // City / Sector
    pushSelectField({
      enabledKey: 'city',
      controlName: 'city',
      labelKey: 'labels.inputs.Sector/Cheffery/Municipality',
      valueGetter: (addr) => addr?.city ?? '',
      options: { label: 'name', value: 'id', data: this.sectorOptions },
      order: 5
    });

    // Neighborhood / addressLine3
    pushSelectField({
      enabledKey: 'addressLine3',
      controlName: 'addressLine3',
      labelKey: 'labels.inputs.Neighborhood',
      valueGetter: (addr) => addr?.addressLine3 ?? '',
      options: { label: 'name', value: 'id', data: this.neighborhoodOptions },
      order: 6
    });

    // Province
    pushSelectField({
      enabledKey: 'stateProvinceId',
      controlName: 'stateProvinceId',
      labelKey: 'labels.inputs.Province',
      valueGetter: (addr) => addr?.stateProvinceId ?? '',
      options: { label: 'name', value: 'id', data: this.provinceIdOptions },
      order: 3
    });

    // District/Town complémentaire
    pushSelectField({
      enabledKey: 'addressLine2',
      controlName: 'addressLine2',
      labelKey: 'labels.inputs.District/Town',
      valueGetter: (addr) => addr?.addressLine2 ?? '',
      options: { label: 'name', value: 'id', data: this.districtTownOptions },
      order: 4
    });

    // Country
    pushSelectField({
      enabledKey: 'countryId',
      controlName: 'countryId',
      labelKey: 'labels.inputs.Country',
      valueGetter: (addr) => addr?.countryId ?? '',
      options: { label: 'name', value: 'id', data: this.clientAddressTemplate.countryIdOptions },
      order: 2
    });

    // Suppression éventuelle des nulls et retour
    formfields = formfields.filter((field) => field !== null);
    return formfields;
  }

}