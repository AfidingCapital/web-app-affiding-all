/** Angular Imports */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

/** Custom Models */
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { ValueChangeSelectBase } from 'app/shared/form-dialog/formfield/model/valuechangeselect-base';

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

displayOptions:any = {
districtTownOptions: { label: 'name', value: 'id', data: [] },
sectorOptions:  { label: 'name', value: 'id', data: [] },
neighborhoodOptions:  { label: 'name', value: 'id', data: [] },
postalCodeOptions:  { label: 'name', value: 'id', data: [] }
};

/** les options à afficher */
selectionOptions : any;

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
private clientService: ClientsService,
private cdr: ChangeDetectorRef
) {
this.onSelectionChange = this.onSelectionChange.bind(this);
}

ngOnInit() {
// Chargement des données via route
this.route.data.subscribe(
(data: { clientAddressData: any; clientAddressFieldConfig: any; clientAddressTemplateData: any }) => {
this.clientAddressData = data.clientAddressData || [];
this.clientAddressFieldConfig = data.clientAddressFieldConfig;
this.clientAddressTemplate = data.clientAddressTemplateData;
this.clientId = this.route.parent!.snapshot.paramMap.get('clientId');
}
);

// Chargement en parallèle des codes 27, 28, 29, 42, 45, 44, 47
this.loadAllCodeValues();
}

private loadAllCodeValues() {
    const obs27 = this.clientService.getCodeValues(27).pipe(catchError(() => of([]))); // Provinces
    const obs28 = this.clientService.getCodeValues(28).pipe(catchError(() => of([]))); // Country
    const obs29 = this.clientService.getCodeValues(29).pipe(catchError(() => of([]))); // Address Types
    const obs42 = this.clientService.getCodeValues(42).pipe(catchError(() => of([]))); // District/Town
    const obs45 = this.clientService.getCodeValues(45).pipe(catchError(() => of([]))); // Sector
    const obs44 = this.clientService.getCodeValues(44).pipe(catchError(() => of([]))); // Neighborhood
    const obs47 = this.clientService.getCodeValues(47).pipe(catchError(() => of([]))); // Postal Code

forkJoin([obs27, obs28, obs29, obs42, obs45, obs44, obs47]).subscribe(
(results: any[]) => {
const provinces = results[0] as any[];
const country = results[1] as any[];
const addressTypes = results[2] as any[];
const districts = results[3] as any[];
const sectors = results[4] as any[];
const neighborhoods = results[5] as any[];
const postalCodes = results[6] as any[];

this.codeValuesTemplate = {
provinceIdOptions: provinces,
countryIdOptions: country,
addressTypeIdOptions: addressTypes,
districtTownOptions: districts,
sectorOptions: sectors,
neighborhoodOptions: neighborhoods,
postalCodeOptions: postalCodes
};

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
title: this.translateService.instant('labels.buttons.Add') +
' ' + 
this.translateService.instant('labels.heading.Address'),
formfields: this.getAddressFormFields('add')
};
const addAddressDialogRef = this.dialog.open(FormDialogComponent, { data, width: '50rem' });
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
formfields: this.getAddressFormFields(address),
layout: { addButtonText: 'Edit' },
};

const editAddressDialogRef = this.dialog.open(FormDialogComponent, { data, width: '50rem' });

editAddressDialogRef.afterClosed().subscribe((response: any) => {
if (response.data) {
const addressData = response.data.value;
addressData.isActive = address.isActive;
for (const key in addressData) {
if (addressData[key] === '' || addressData[key] === undefined) {
delete addressData[key];
}
}
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

onSelectionChange = (newValue: string, fieldName?: string) => {

// 1. Province → District/Town
if (fieldName === 'stateProvinceId') {
const selectedVaue = this.codeValuesTemplate.provinceIdOptions
.find((item: any) => item.id == newValue);

const selectedDistricts = this.codeValuesTemplate.districtTownOptions
.filter((item: any) => item.position.toString().startsWith(selectedVaue.position));

this.displayOptions.districtTownOptions.data = [...selectedDistricts];
this.displayOptions.sectorOptions.data = [];
this.displayOptions.neighborhoodOptions.data = [];
this.displayOptions.postalCodeOptions.data = [];

}

// 2. District/Town → Sector
if (fieldName === 'addressLine2') {
const selectedVaue = this.displayOptions.districtTownOptions.data
.find((item: any) => item.id == newValue);

const sectors = this.codeValuesTemplate.sectorOptions
.filter((item: any) => item.position.toString().startsWith(selectedVaue.position));

const postalcodes = this.codeValuesTemplate.postalCodeOptions
.filter((item: any) => item.position == selectedVaue.position);	

this.displayOptions.sectorOptions.data = [...sectors];
this.displayOptions.neighborhoodOptions.data = [];
this.displayOptions.postalCodeOptions.data = [...postalcodes];
}

// 3. Sector → Neighborhood
if (fieldName === 'city') {

const selectedVaue = this.displayOptions.sectorOptions.data
.find((item: any) => item.id == newValue);

const neighborhoods = this.codeValuesTemplate.neighborhoodOptions
.filter((item: any) => item.position.toString().startsWith(selectedVaue.position));

const postalcodes = this.codeValuesTemplate.postalCodeOptions
.filter((item: any) => item.position == selectedVaue.position);	

this.displayOptions.neighborhoodOptions.data = [...neighborhoods];
this.displayOptions.postalCodeOptions.data = [...postalcodes];	  
}

//4. Neighborhood
if (fieldName === 'addressLine3') {
const selectedValue = this.displayOptions.neighborhoodOptions.data
.find((item: any) => item.id == newValue);

const postalcodes = this.codeValuesTemplate.postalCodeOptions
.filter((item: any) => item.position == selectedValue.position);

this.displayOptions.postalCodeOptions.data = [...postalcodes];
}

this.cdr.detectChanges(); // rafraîchissement explicite
};


/**
  * Returns address form fields for form dialog.
  * @param {string} formType Form Type
  * @param {any} address Address
  */
getAddressFormFields(formType?: string, address?: any) {
let formfields: FormfieldBase[] = [];

// Type d'adresse (seulement pour l'ajout)
if (this.isFieldEnabled('addressType')) {
formfields.push(
new ValueChangeSelectBase({
controlName: 'addressTypeId', // CHANGEMENT : On utilise addressTypeId pour matcher votre JSON
label: this.translateService.instant('labels.inputs.Address Type'),
// On prend l'ID (29) si disponible, sinon on cherche dans addressType
value: address ? (address.addressTypeId || address.addressType) : '',
options: {
label: 'name',
value: 'id',
data: this.codeValuesTemplate?.addressTypeIdOptions || this.clientAddressTemplate?.addressTypeIdOptions || []
},
order: 1,
required: true
})
);
}
// Country
formfields.push(
this.isFieldEnabled('countryId')
? new ValueChangeSelectBase({
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
? new ValueChangeSelectBase({
controlName: 'stateProvinceId',
label: this.translateService.instant('labels.inputs.Province'),
value: address ? address.stateProvinceId : '',
options: { 
label: 'name', 
value: 'id', 
data: this.codeValuesTemplate.provinceIdOptions
},
order: 3,
onValueChange: (value:any) => this.onSelectionChange(value, 'stateProvinceId')
})
: null
);

// District/Town
formfields.push(
this.isFieldEnabled('addressLine2')
? new ValueChangeSelectBase({
controlName: 'addressLine2',
label: this.translateService.instant('labels.inputs.District/Town'),
value: address ? address.addressLine2 : '',
options: this.displayOptions.districtTownOptions,
order: 4,
onValueChange: (value:any) => this.onSelectionChange(value, 'addressLine2')
})
: null
);

// City / Sector
formfields.push(
this.isFieldEnabled('city')
? new ValueChangeSelectBase({
controlName: 'city',
label: this.translateService.instant('labels.inputs.Sector/Cheffery/Municipality'),
value: address ? address.city : '',
options: this.displayOptions.sectorOptions,
order: 5,
onValueChange: (value:any) => this.onSelectionChange(value, 'city')
})
: null
);

// Neighborhood / addressLine3
formfields.push(
this.isFieldEnabled('addressLine3')
? new ValueChangeSelectBase({
controlName: 'addressLine3',
label: this.translateService.instant('labels.inputs.Neighborhood'),
value: address ? address.addressLine3 : '',
options: this.displayOptions.neighborhoodOptions,
order: 6,
onValueChange: (value:any) => this.onSelectionChange(value, 'addressLine3')
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
? new ValueChangeSelectBase({
controlName: 'postalCode',
label: this.translateService.instant('labels.inputs.Postal Code'),
value: address ? address.postalCode : '',
options: this.displayOptions.postalCodeOptions,
order: 8,
onValueChange: (value:any) => this.onSelectionChange(value, 'postalCode')
})
: null
);

// Suppression des nulls
formfields = formfields.filter((field) => field !== null);

return formfields;
}

/**
  * Returns the array of client addresses
  */
get address() {
return { address: this.clientAddressData ? this.clientAddressData : [] };
}
}