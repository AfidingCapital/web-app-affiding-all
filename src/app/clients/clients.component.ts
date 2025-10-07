/** Angular Imports */
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/** Custom Services */
import { environment } from 'environments/environment';
import { ClientsService } from './clients.service';

@Component({
  selector: 'mifosx-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  @ViewChild('showClosedAccounts') showClosedAccounts: MatCheckbox;

  displayedColumns = [
    'displayName',
    'accountNumber',
    'externalId',
    'status',
    'officeName'
  ];

  // 1) Liste des drafts statiques
  draftClients: DraftClient[] = [
    {
      id: 'draft-001',
      displayName: 'Jean-Luc Mugowgwa',
      accountNumber: '001234567',
      externalId: 'EXT-DRAFT-001',
      status: { code: 'draft', value: 'Draft' },
      officeName: 'Kinshasa',
      isDraft: true
    },
    {
      id: 'draft-002',
      displayName: 'Piere Kwete',
      accountNumber: '009836542683',
      externalId: 'EXT-DRAFT-002',
      status: { code: 'draft', value: 'Draft' },
      officeName: 'Kinshasa',
      isDraft: true
    },
    {
      id: 'draft-003',
      displayName: 'Christian Kayeye',
      accountNumber: '00983688299',
      externalId: 'EXT-DRAFT-003',
      status: { code: 'draft', value: 'Draft' },
      officeName: 'Kinshasa',
      isDraft: true
    },
    {
      id: 'draft-004',
      displayName: 'Josephine Kingombe',
      accountNumber: '009843588299',
      externalId: 'EXT-DRAFT-004',
      status: { code: 'draft', value: 'Draft' },
      officeName: 'Kinshasa',
      isDraft: true
    }
    // Ajouter d'autres drafts si nécessaire
  ];

  // 2) Contrôleur d’affichage des drafts
  showDraft: boolean = false;

  // Données API et affichage
  apiClients: any[] = []; // données API de la page courante
  dataSource: MatTableDataSource<any> = new MatTableDataSource();

  existsClientsToFilter = false;
  notExistsClientsToFilter = false;

  totalRows: number;
  isLoading = false;

  pageSize = 50;
  currentPage = 0;
  filterText = '';

  sortAttribute = '';
  sortDirection = '';

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private clientService: ClientsService) {}

  ngOnInit() {
    this.getClients();
  }

  /**
   * Recherches server pour texte et ressources.
   */
  search(value: string) {
    this.filterText = value;
    this.resetPaginator();
    this.getClients();
  }

  // --------------- Données affichées (fusion drafts + API) ---------------
  get displayedData(): any[] {
    if (this.showDraft) {
      // Drafts + API courants
      return [...this.draftClients, ...this.apiClients];
    }
    return this.apiClients;
  }

  // --------------- Appels API ---------------
  private getClients() {
    this.isLoading = true;
    this.clientService
      .searchByText(this.filterText, this.currentPage, this.pageSize, this.sortAttribute, this.sortDirection)
      .subscribe(
        (data: any) => {
          this.apiClients = data.content;
          this.totalRows = data.totalElements;
          this.dataSource.data = this.displayedData;

          this.existsClientsToFilter = data.numberOfElements > 0;
          this.notExistsClientsToFilter = !this.existsClientsToFilter;
          this.isLoading = false;
        },
        (error: any) => {
          this.isLoading = false;
        }
      );
  }

  // --------------- Actions UI ---------------
  onShowDraftChange(_evt?: boolean) {
    // La valeur this.showDraft est déjà mise à jour par ngModelChange
    this.getClients(); // recharge les données en fonction du nouvel état
  }

  // --------------- Pagination & Tri ---------------
  pageChanged(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    // Si Show Draft est actif, on utilise quand même la pagination serveur pour apiClients;
    // les drafts s'affichent uniquement via displayedData (Option A)
    if (!this.showDraft) {
      this.getClients(); // pagination serveur
    } else {
      // Option A: on ne recharge pas les données API ici; on met simplement à jour le dataSource
      // afin d'inclure les drafts sur la première page uniquement via displayedData
      this.dataSource.data = this.displayedData;
    }
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
    this.getClients();
  }

  private resetPaginator() {
    this.currentPage = 0;
    this.paginator.firstPage();
  }

  // --------------- Types ---------------
}

/** Draft type pour le modéle DraftClient */
interface DraftClient {
  id: string;
  displayName: string;
  accountNumber: string;
  externalId: string;
  status: { code: string; value: string }; // doit inclure 'draft'
  officeName: string;
  isDraft?: boolean; // marquez explicitement comme draft
}