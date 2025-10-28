/** Angular Imports */
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';

/** Custom Services */
import { environment } from 'environments/environment';
import { ProspectsService } from './prospects.service';

@Component({
  selector: 'mifosx-clients',
  templateUrl: './prospects.component.html',
  styleUrls: ['./prospects.component.scss']
})
export class ProspectsComponent implements OnInit {
  @ViewChild('showClosedAccounts') showClosedAccounts: MatCheckbox;

  displayedColumns = [
    'displayName',
    'accountNumber',
    'externalId',
    'status',
    'officeName'
  ];

  // 2) Contrôleur d’affichage des drafts (récupérés via l'endpoint)
draftApiClients: any[] = []; // drafts récupérés depuis l'endpoint



  // 2) Contrôleur d’affichage des drafts
  showDraft: boolean = false;

  // Données API et affichage
  apiProspects: any[] = []; // données API de la page courante
  dataSource: MatTableDataSource<any> = new MatTableDataSource();

  existsProspectsToFilter = false;
  notExistsProspectsToFilter = false;

  totalRows: number;
  isLoading = false;

  pageSize = 50;
  currentPage = 0;
  filterText = '';

  sortAttribute = '';
  sortDirection = '';

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private prospectService: ProspectsService) {}

  ngOnInit() {
    this.getProspects();
  }

  /**
   * Recherches server pour texte et ressources.
   */
  search(value: string) {
    this.filterText = value;
    this.resetPaginator();
    this.getProspects();
  }

  // --------------- Données affichées (fusion drafts + API) ---------------
  get displayedData(): any[] {
    if (this.showDraft) {
      // Drafts + API courants
      return [...this.draftApiClients, ...this.apiProspects];
    }
    return this.apiProspects;
  }

  // --------------- Appels API ---------------

  private getProspects() {
  this.isLoading = true;

  if (this.showDraft) {
    // Récupérer à la fois les prospects API et les drafts via l'endpoint
    forkJoin({
      api: this.prospectService.searchByText(this.filterText, this.currentPage, this.pageSize, this.sortAttribute, this.sortDirection),
      drafts: this.prospectService.getDraftClients()
    }).subscribe(
      ({ api, drafts }: { api: any, drafts: any[] }) => {
        // API results
        this.apiProspects = api.content;
        // Drafts récupérés
        this.draftApiClients = drafts;

        // Pagination: combiner les totaux
        this.totalRows = api.totalElements + drafts.length;

        this.dataSource.data = this.displayedData;

        this.existsProspectsToFilter = (api.numberOfElements > 0) || (drafts.length > 0);
        this.notExistsProspectsToFilter = !this.existsProspectsToFilter;
        this.isLoading = false;
      },
      (error: any) => {
        this.isLoading = false;
      }
    );
  } else {
    // Cas normal: uniquement les résultats API
    this.prospectService
      .searchByText(this.filterText, this.currentPage, this.pageSize, this.sortAttribute, this.sortDirection)
      .subscribe(
        (data: any) => {
          this.apiProspects = data.content;
          this.totalRows = data.totalElements;
          this.dataSource.data = this.displayedData;

          this.existsProspectsToFilter = data.numberOfElements > 0;
          this.notExistsProspectsToFilter = !this.existsProspectsToFilter;
          this.isLoading = false;
        },
        (error: any) => {
          this.isLoading = false;
        }
      );
  }
}

// --------------- Pagination & Tri ---------------
pageChanged(event: PageEvent) {
  this.pageSize = event.pageSize;
  this.currentPage = event.pageIndex;
  // Toujours recharger les données (API + drafts si actif)
  this.getProspects();
}
  // --------------- Actions UI ---------------
  onShowDraftChange(_evt?: boolean) {
    // La valeur this.showDraft est déjà mise à jour par ngModelChange
    this.getProspects(); // recharge les données en fonction du nouvel état
  }

  

  sortChanged(event: Sort) {
    if (event.direction === '') {
      this.sortDirection = '';
      this.sortAttribute = '';
    } else {
      this.sortAttribute = event.active;
      this.sortDirection = event.direction;
    }
    this.resetPaginator();
    this.getProspects();
  }

  private resetPaginator() {
    this.currentPage = 0;
    this.paginator.firstPage();
  }

  // --------------- Types ---------------
}
