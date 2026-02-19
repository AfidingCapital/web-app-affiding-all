/** Angular Imports */
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, UntypedFormControl } from '@angular/forms';
import { ClientsService } from 'app/clients/clients.service';
import { Dates } from 'app/core/utils/dates';

/** Custom Services */
import { SettingsService } from 'app/settings/settings.service';

/**
 * Create Client Component
 */
@Component({
  selector: 'mifosx-client-general-step',
  templateUrl: './client-general-step.component.html',
  styleUrls: ['./client-general-step.component.scss']
})
export class ClientGeneralStepComponent implements OnInit {
  @Output() legalFormChangeEvent = new EventEmitter<{ legalForm: number }>();

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();

  /** Client Template */
  @Input() clientTemplate: any;
  /** Create Client Form */
  createClientForm: UntypedFormGroup;

  /** Office Options */
  officeOptions: any;
  /** Staff Options */
  staffOptions: any;
  /** Legal Form Options */
  legalFormOptions: any;
  /** Client Type Options */
  clientTypeOptions: any;
  /** Client Classification Options */
  clientClassificationTypeOptions: any;
  /** Business Line Options */
  businessLineOptions: any;
  /** Constitution Options */
  constitutionOptions: any;
  /** Gender Options */
  genderOptions: any;
  /** Saving Product Options */
  savingProductOptions: any;

  /**
   * @param {FormBuilder} formBuilder Form Builder
   * @param {Dates} dateUtils Date Utils
   * @param {SettingsService} settingsService Setting service
   * @param {ClientsService} clientService Client service
   */
  constructor(
    private formBuilder: UntypedFormBuilder,
    private dateUtils: Dates,
    private settingsService: SettingsService,
    private clientService: ClientsService
  ) {
    this.setClientForm();
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.setOptions();
    this.buildDependencies();
  }

  /**
   * Creates the client form.
   */
  setClientForm() {
    this.createClientForm = this.formBuilder.group({
      officeId: [
        '',
        Validators.required
      ],
      staffId: [''],
      legalFormId: [
        '',
        Validators.required
      ],
      isStaff: [false],
      active: [false],
      addSavings: [false],
      accountNo: [''],
      externalId: [''],
      genderId: [''],
      mobileNo: [''],
      emailAddress: [
        '',
        Validators.email
      ],
      dateOfBirth: [''],
      clientTypeId: [''],
      clientClassificationId: [''],
      submittedOnDate: [
        this.settingsService.businessDate,
        Validators.required
      ]
    });
  }

  /**
   * Sets select dropdown options.
   */
  setOptions() {
    // Sort offices in hierarchical tree order (parent followed by children)
    // Fetch all offices from /offices API to ensure complete hierarchy
    this.clientService.getOffices().subscribe((offices: any[]) => {
      // Build a map of office IDs from clientTemplate for filtering
      const allowedOfficeIds = new Set(this.clientTemplate.officeOptions.map((o: any) => o.id));
      
      // Filter offices to only include those in clientTemplate
      const filteredOffices = offices.filter((office: any) => allowedOfficeIds.has(office.id));
      
      // Sort the filtered offices hierarchically
      this.officeOptions = this.sortOfficesHierarchically(filteredOffices);
    });
    
    this.staffOptions = this.clientTemplate.staffOptions;
    this.legalFormOptions = this.clientTemplate.clientLegalFormOptions;
    this.clientTypeOptions = this.clientTemplate.clientTypeOptions;
    this.clientClassificationTypeOptions = this.clientTemplate.clientClassificationOptions;
    this.businessLineOptions = this.clientTemplate.clientNonPersonMainBusinessLineOptions;
    this.constitutionOptions = this.clientTemplate.clientNonPersonConstitutionOptions;
    this.genderOptions = this.clientTemplate.genderOptions;
    this.savingProductOptions = this.clientTemplate.savingProductOptions;
  }

  /**
   * Sorts offices in hierarchical tree order: parent followed by its children (depth-first).
   * @param {any[]} offices Array of office objects
   * @returns {any[]} Sorted array of offices
   */
  private sortOfficesHierarchically(offices: any[]): any[] {
    if (!offices || offices.length === 0) {
      return offices;
    }

    // Build a map of parentId -> children
    const childrenMap = new Map<number, any[]>();
    const officeMap = new Map<number, any>();
    let rootOffices: any[] = [];

    // First pass: build office map and identify potential roots
    offices.forEach((office: any) => {
      officeMap.set(office.id, office);
    });

    // Second pass: build parent-child relationships, avoiding circular references
    offices.forEach((office: any) => {
      if (!office.parentId) {
        rootOffices.push(office);
      } else {
        // Check if parent exists in the office list
        const parent = officeMap.get(office.parentId);
        if (parent) {
          // Check for circular reference (office's parent is its own child)
          if (parent.parentId !== office.id) {
            if (!childrenMap.has(office.parentId)) {
              childrenMap.set(office.parentId, []);
            }
            childrenMap.get(office.parentId).push(office);
          } else {
            // Treat as root if circular reference detected
            rootOffices.push(office);
          }
        } else {
          // Parent not in list - this office should still be included but as a root
          // This can happen when the API returns a filtered list
          rootOffices.push(office);
        }
      }
    });

    // Depth-first traversal to build sorted list (with cycle detection)
    const result: any[] = [];
    const visited = new Set<number>();
    
    const traverse = (office: any) => {
      if (visited.has(office.id)) {
        return; // Avoid infinite loops
      }
      visited.add(office.id);
      result.push(office);
      const children = childrenMap.get(office.id) || [];
      children.forEach((child: any) => traverse(child));
    };

    rootOffices.forEach((root: any) => traverse(root));
    return result;
  }

  /**
   * Adds controls conditionally.
   */
  buildDependencies() {
    this.createClientForm.get('legalFormId').valueChanges.subscribe((legalFormId: number) => {
      this.legalFormChangeEvent.emit({ legalForm: legalFormId });
      if (legalFormId === 1) {
        this.createClientForm.removeControl('fullname');
        this.createClientForm.removeControl('clientNonPersonDetails');
        this.createClientForm.addControl(
          'firstname',
          new UntypedFormControl('', [
            Validators.required,
            Validators.pattern('(^[A-z]).*')])
        );
        this.createClientForm.addControl('middlename', new UntypedFormControl('', Validators.pattern('(^[A-z]).*')));
        this.createClientForm.addControl(
          'lastname',
          new UntypedFormControl('', [
            Validators.required,
            Validators.pattern('(^[A-z]).*')])
        );
      } else {
        this.createClientForm.removeControl('firstname');
        this.createClientForm.removeControl('middlename');
        this.createClientForm.removeControl('lastname');
        this.createClientForm.addControl(
          'fullname',
          new UntypedFormControl('', [
            Validators.required,
            Validators.pattern('(^[A-z]).*')])
        );
        this.createClientForm.addControl(
          'clientNonPersonDetails',
          this.formBuilder.group({
            constitutionId: [
              '',
              Validators.required
            ],
            incorpValidityTillDate: [''],
            incorpNumber: [''],
            mainBusinessLineId: [''],
            remarks: ['']
          })
        );
      }
    });
    this.createClientForm.get('legalFormId').patchValue(1);
    this.createClientForm.get('active').valueChanges.subscribe((active: boolean) => {
      if (active) {
        this.createClientForm.addControl('activationDate', new UntypedFormControl('', Validators.required));
      } else {
        this.createClientForm.removeControl('activationDate');
      }
    });
    this.createClientForm.get('addSavings').valueChanges.subscribe((active: boolean) => {
      if (active) {
        this.createClientForm.addControl('savingsProductId', new UntypedFormControl('', Validators.required));
      } else {
        this.createClientForm.removeControl('savingsProductId');
      }
    });
    this.createClientForm.get('officeId').valueChanges.subscribe((officeId: number) => {
      this.clientService.getClientWithOfficeTemplate(officeId).subscribe((clientTemplate: any) => {
        this.staffOptions = clientTemplate.staffOptions;
      });
    });
  }

  getDateLabel(legalFormId: number, values: string[]): string {
    return legalFormId === 1 ? values[0] : values[1];
  }

  /**
   * Client General Details
   */
  get clientGeneralDetails() {
    const generalDetails = this.createClientForm.value;
    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;
    for (const key in generalDetails) {
      if (generalDetails[key] === '' || key === 'addSavings') {
        delete generalDetails[key];
      }
    }
    if (generalDetails.submittedOnDate instanceof Date) {
      generalDetails.submittedOnDate = this.dateUtils.formatDate(generalDetails.submittedOnDate, dateFormat);
    }
    if (generalDetails.activationDate instanceof Date) {
      generalDetails.activationDate = this.dateUtils.formatDate(generalDetails.activationDate, dateFormat);
    }
    if (generalDetails.dateOfBirth instanceof Date) {
      generalDetails.dateOfBirth = this.dateUtils.formatDate(generalDetails.dateOfBirth, dateFormat);
    }

    if (generalDetails.clientNonPersonDetails && generalDetails.clientNonPersonDetails.incorpValidityTillDate) {
      generalDetails.clientNonPersonDetails = {
        ...generalDetails.clientNonPersonDetails,
        incorpValidityTillDate: this.dateUtils.formatDate(generalDetails.dateOfBirth, dateFormat),
        dateFormat,
        locale
      };
    }
    return generalDetails;
  }
}
