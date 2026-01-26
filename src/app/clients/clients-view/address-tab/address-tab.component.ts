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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  codeValuesTemplate: any = {}; // Pour les codes 27, 28, 42, 45, 44, 47
  /** Client Id */
  clientId: string;

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

    // Chargement en parallèle des codes 27, 28, 42, 45, 44, 47
    this.loadAllCodeValues();
  }

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

        //Country
        this.codeValuesTemplate.countryIdOptions = country.map((c: any) => ({
          id: c.id,
          name: c.name,
          position: c.position
        }));

        // Territoire affiché 
        this.codeValuesTemplate.territoryOptions = districts.map((d: any) => ({
          id: d.id,
          name: d.name,
          position: d.position
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

        //Neighborhoods
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
      title:
        this.translateService.instant('labels.buttons.Add') +
        ' ' +
        this.translateService.instant('labels.catalogs.Client') +
        ' ' +
        this.translateService.instant('labels.heading.Address'),
      formfields: this.getAddressFormFields('add'),
      // Passer les données pour le filtrage
      codeValuesTemplate: this.codeValuesTemplate,
      enableDistrictFiltering: true
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
      layout: { addButtonText: 'Edit' },
      // Passer les données pour le filtrage
      codeValuesTemplate: this.codeValuesTemplate,
      enableDistrictFiltering: true
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

    // Champs communs et logique d'ajout
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

    // Postal Code (ajouté — order ajusté à 9 pour respecter l'enchaînement logique)
    pushSelectField({
      enabledKey: 'postalCode',
      controlName: 'postalCode',
      labelKey: 'labels.inputs.Postal Code',
      valueGetter: (addr) => addr?.postalCode ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.postalCodeOptions },
      order: 9
    });

    // City / Sector
    pushSelectField({
      enabledKey: 'city',
      controlName: 'city',
      labelKey: 'labels.inputs.Sector/Cheffery/Municipality',
      valueGetter: (addr) => addr?.city ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.sectorOptions },
      order: 5
    });

    // Neighborhood / addressLine3
    pushSelectField({
      enabledKey: 'addressLine3',
      controlName: 'addressLine3',
      labelKey: 'labels.inputs.Neighborhood',
      valueGetter: (addr) => addr?.addressLine3 ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.neighborhoodOptions },
      order: 6
    });

    // Province
    pushSelectField({
      enabledKey: 'stateProvinceId',
      controlName: 'stateProvinceId',
      labelKey: 'labels.inputs.Province',
      valueGetter: (addr) => addr?.stateProvinceId ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.provinceIdOptions },
      order: 3
    });

    // District/Town - Utiliser TOUTES les options, le filtrage se fera dans le FormDialog
    pushSelectField({
      enabledKey: 'addressLine2',
      controlName: 'addressLine2',
      labelKey: 'labels.inputs.District/Town',
      valueGetter: (addr) => addr?.addressLine2 ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.districtTownOptions },
      order: 4
    });

    // Country
    pushSelectField({
      enabledKey: 'countryId',
      controlName: 'countryId',
      labelKey: 'labels.inputs.Country',
      valueGetter: (addr) => addr?.countryId ?? '',
      options: { label: 'name', value: 'id', data: this.codeValuesTemplate.countryIdOptions },
      order: 2
    });

    // Suppression éventuelle des nulls et retour
    formfields = formfields.filter((field) => field !== null);
    return formfields;
  }
}