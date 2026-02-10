/** Angular Imports */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { ValueChangeSelectBase } from 'app/shared/form-dialog/formfield/model/valuechangeselect-base';

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
  codeValuesTemplate: any = {}; // Pour les codes 27, 28, 42, 45, 44, 47
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

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientsService,
    private dialog: MatDialog,
    private translateService: TranslateService,
	private cdr: ChangeDetectorRef
  ) {
	
	  this.onSelectionChange = this.onSelectionChange.bind(this);
  }

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
    const obs27 = this.clientService.getCodeValues('STATE'); // Provinces
    const obs28 = this.clientService.getCodeValues('COUNTRY'); // Country
    const obs42 = this.clientService.getCodeValues('DISTRICT/TOWN'); // District/Town
    const obs45 = this.clientService.getCodeValues('SECTOR/CHEFFERY/MUNICIPALITY'); // Sector
    const obs44 = this.clientService.getCodeValues('NEIGHBORHOOD'); // Neighborhood
    const obs47 = this.clientService.getCodeValues('CODE_POSTAL'); // Postal Code

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

    for (let index = 0; index < this.clientAddressTemplate.addressTypeIdOptions.length; index++) {
      this.clientAddressTemplate.addressTypeIdOptions[index].name = this.translateService.instant(
        `labels.catalogs.${this.clientAddressTemplate.addressTypeIdOptions[index].name}`
      );
    }
	
    // Champs communs et logique d’ajout
    if (formType === 'add') {
			  
	  formfields.push(
	    this.isFieldEnabled('addressType')
	      ? new ValueChangeSelectBase({
	          controlName: 'addressType',
	          label: this.translateService.instant('labels.inputs.Address Type'),
	          value: address ? address.addressType : '',
	          options: { label: 'name', value: 'id', data: this.clientAddressTemplate.addressTypeIdOptions },
	          order: 1
	        })
	      : null);
    }
	
	// Country
	formfields.push(
	 	this.isFieldEnabled('countryId')
	      ? new ValueChangeSelectBase({
	          controlName: 'countryId',
	          label: this.translateService.instant('labels.inputs.Country'),
	          value: address ? address.countryId : '',
	          options: { label: 'name', value: 'id', data:this.codeValuesTemplate.countryIdOptions },
	          order: 2
	        })
	      : null);
	
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
		        order:3,
				onValueChange: (value:any) => this.onSelectionChange(value, 'stateProvinceId')
		      }): null);		  
		  
	// District/Town complémentaire
	formfields.push(
		this.isFieldEnabled('addressLine2')
		      ? new ValueChangeSelectBase({
		          controlName: 'addressLine2',
		          label: this.translateService.instant('labels.inputs.District/Town'),
		          value: address ? address.addressLine2 : '',
		          options: this.displayOptions.districtTownOptions,
		          order: 4,
				  onValueChange: (value:any) => this.onSelectionChange(value, 'addressLine2')
		        }): null);
		  
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
		        }): null);		  

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
		  	}): null);		  
	  
    formfields.push(
      this.isFieldEnabled('addressLine1')
        ? new InputBase({
            controlName: 'addressLine1',
            label: this.translateService.instant('labels.inputs.Village/Avenue'),
            value: address ? address.addressLine1 : '',
            type: 'text',
            order: 7
          })
        : null);
	
	formfields.push(
	  this.isFieldEnabled('postalCode')
	    ? new ValueChangeSelectBase({
	        controlName: 'postalCode',
	        label: this.translateService.instant('labels.inputs.Postal Code'),
	        value: address ? address.postalCode: '',
			options: this.displayOptions.postalCodeOptions,
	        order: 8,
			onValueChange: (value:any) => this.onSelectionChange(value, 'postalCode')
	      })
	    : null);	

    // Suppression éventuelle des nulls et retour
    formfields = formfields.filter((field) => field !== null);
    return formfields;
  }

}