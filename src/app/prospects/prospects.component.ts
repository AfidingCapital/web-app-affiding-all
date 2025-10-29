/** Angular Imports */
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';

/** Custom Services */
import { ProspectsService } from './prospects.service';

@Component({
  selector: 'mifosx-prospects',
  templateUrl: './prospects.component.html',
  styleUrls: ['./prospects.component.scss']
})
export class ProspectsComponent implements OnInit {
  
  displayedColumns = [
    'displayName',
    'mobileNo',
    'emailAddress',
    'status',
    'createdAt'
  ];

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
    return this.apiProspects;
  }

  // --------------- Appels API ---------------

  private getProspects() {
  this.isLoading = true;

  this.prospectService.searchByText(this.filterText, this.currentPage, this.pageSize, this.sortAttribute, this.sortDirection)
  	.subscribe(
        (data: any) => {
          this.apiProspects = data;
          this.totalRows = data.length;
          this.dataSource.data = this.displayedData;

          this.existsProspectsToFilter = data.length > 0;
          this.notExistsProspectsToFilter = !this.existsProspectsToFilter;
          this.isLoading = false;
		  
		  console.log(data);console.log(this.apiProspects);console.log(this.displayedData);
        },
        (error: any) => {
          this.isLoading = false;
        }
      );
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
