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
  /** Client Id */
  clientId: string;

  // Expose les options de codes directement
  public provinceIdOptions: any[] = []; // Province (27)
  public districtTownOptions: any[] = []; // District/Town (42)
  public sectorOptions: any[] = []; // Sector/Cheffery/Municipality (45)
  public neighborhoodOptions: any[] = []; // Neighborhood (44)

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
        this.clientId = this.route.parent!.snapshot.paramMap.get('clientId')!;
      }
    );

    // Chargement en parallèle des codes 27, 42, 45, 44
    this.loadAllCodeValues();
  }

  private loadAllCodeValues() {
    const obs27 = this.clientService.getCodeValues(27);
    const obs42 = this.clientService.getCodeValues(42);
    const obs45 = this.clientService.getCodeValues(45);
    const obs44 = this.clientService.getCodeValues(44);

    forkJoin([obs27, obs42, obs45, obs44]).subscribe(
      (results: any[]) => {
        const res27 = results[0] as any[];
        const res42 = results[1] as any[];
        const res45 = results[2] as any[];
        const res44 = results[3] as any[];

        // Mappez directement en { id, name }
        this.provinceIdOptions = res27.map((it: any) => ({
          id: it.id,
          name: it.name
        }));
        this.districtTownOptions = res42.map((it: any) => ({
          id: it.id,
          name: it.name
        }));
        this.sectorOptions = res45.map((it: any) => ({
          id: it.id,
          name: it.name
        }));
        this.neighborhoodOptions = res44.map((it: any) => ({
          id: it.id,
          name: it.name
        }));

        // Optionnel: trie
        this.provinceIdOptions.sort((a, b) => a.name.localeCompare(b.name));
        this.districtTownOptions.sort((a, b) => a.name.localeCompare(b.name));
        this.sectorOptions.sort((a, b) => a.name.localeCompare(b.name));
        this.neighborhoodOptions.sort((a, b) => a.name.localeCompare(b.name));
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

    if (formType === 'add') {
      formfields.push(
        this.isFieldEnabled('addressType')
          ? new SelectBase({
              controlName: 'addressType',
              label: this.translateService.instant('labels.inputs.Address Type'),
              value: address ? address.addressType : '',
              options: { label: 'name', value: 'id', data: this.clientAddressTemplate.addressTypeIdOptions },
              order: 1
            })
          : null
      );
    }

    formfields.push(
      this.isFieldEnabled('street')
        ? new InputBase({
            controlName: 'street',
            label: this.translateService.instant('labels.inputs.Street'),
            value: address ? address.street : '',
            type: 'text',
            required: false,
            order: 10
          })
        : null
    );
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
    formfields.push(
      this.isFieldEnabled('addressLine1')
        ? new InputBase({
            controlName: 'addressLine1',
            label: this.translateService.instant('labels.inputs.Reference'),
            value: address ? address.addressLine1 : '',
            type: 'text',
            order: 8
          })
        : null
    );

    // Province -> 27
    formfields.push(
      this.isFieldEnabled('stateProvinceId')
        ? new SelectBase({
            controlName: 'stateProvinceId',
            label: this.translateService.instant('labels.inputs.Sector/Cheffery/Municipality'),
            value: address ? address.stateProvinceId : '',
            options: { label: 'name', value: 'id', data: this.sectorOptions },
            order: 5
          })
        : null
    );

    // Neighborhood -> 44
    formfields.push(
      this.isFieldEnabled('stateProvinceId')
        ? new SelectBase({
            controlName: 'stateProvinceId',
            label: this.translateService.instant('labels.inputs.Neighborhood'),
            value: address ? address.stateProvinceId : '',
            options: { label: 'name', value: 'id', data: this.neighborhoodOptions },
            order: 6
          })
        : null
    );

    // Province -> 27
    formfields.push(
      this.isFieldEnabled('stateProvinceId')
        ? new SelectBase({
            controlName: 'stateProvinceId',
            label: this.translateService.instant('labels.inputs.Province'),
            value: address ? address.stateProvinceId : '',
            options: { label: 'name', value: 'id', data: this.provinceIdOptions },
            order: 3
          })
        : null
    );

    // District/Town -> 42
    formfields.push(
      this.isFieldEnabled('stateProvinceId')
        ? new SelectBase({
            controlName: 'stateProvinceId',
            label: this.translateService.instant('labels.inputs.District/Town'),
            value: address ? address.stateProvinceId : '',
            options: { label: 'name', value: 'id', data: this.districtTownOptions },
            order: 4
          })
        : null
    );

    // Pays
    formfields.push(
      this.isFieldEnabled('countryId')
        ? new SelectBase({
            controlName: 'countryId',
            label: this.translateService.instant('labels.inputs.Country'),
            value: address ? address.countryId : '',
            options: { label: 'name', value: 'id', data: this.clientAddressTemplate.countryIdOptions },
            order: 2
          })
        : null
    );

    // Code postal
    formfields.push(
      this.isFieldEnabled('postalCode')
        ? new InputBase({
            controlName: 'postalCode',
            label: this.translateService.instant('labels.inputs.Postal Code'),
            value: address ? address.postalCode : '',
            type: 'text',
            order: 9
          })
        : null
    );

    formfields = formfields.filter((field) => field !== null);
    return formfields;
  }
}