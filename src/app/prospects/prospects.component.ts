/** Angular Imports */
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

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

  // --------------- Données affichées ---------------
  get displayedData(): any[] {
    return this.apiProspects;
  }

  // --------------- Appels API ---------------

  private formatDate(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    // 29 October 2025
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  private mapStatus(status: string | number | undefined): string {
    if (status == null) return '—';
    const map: Record<string, string> = {
      '0': 'Error',
      '1': 'New',
      '2': 'Accepted',
      '3': 'Rejected',
      '4': 'Expired'
    };
    const key = String(status);
    return map[key] ?? key;
  }

  private isAcceptedStatus(statusRaw: any): boolean {
    const code = typeof statusRaw === 'object' && statusRaw != null ? statusRaw.code : statusRaw;
    return Number(code) === 2;
  }

  private isErrorStatus(statusRaw: any): boolean {
    const code = typeof statusRaw === 'object' && statusRaw != null ? statusRaw.code : statusRaw;
    return Number(code) === 0;
  }

  private isNewStatus(statusRaw: any): boolean {
    const code = typeof statusRaw === 'object' && statusRaw != null ? statusRaw.code : statusRaw;
    return Number(code) === 1;
  }

  private isRejectedStatus(statusRaw: any): boolean {
    const code = typeof statusRaw === 'object' && statusRaw != null ? statusRaw.code : statusRaw;
    return Number(code) === 3;
  }

  private isExpiredStatus(statusRaw: any): boolean {
    const code = typeof statusRaw === 'object' && statusRaw != null ? statusRaw.code : statusRaw;
    return Number(code) === 4;
  }

  private getProspects() {
    this.isLoading = true;

    this.prospectService.getProspects(
      this.sortAttribute,
      this.sortDirection,
      this.currentPage,
      this.pageSize
    )
    .subscribe(
      (data: any) => {
        const content: any[] = data?.content ?? data ?? [];

        this.apiProspects = content.map((p: any) => {
          // Si status peut être un objet { code, value }, gère les deux cas
          const statusRaw = (typeof p.status === 'object' && p.status != null) ? p.status.code : p.status;
          const isAccepted = this.isAcceptedStatus(statusRaw);
          const isNew = this.isNewStatus(statusRaw);
          const isRejected = this.isRejectedStatus(statusRaw);
          const isExpired = this.isExpiredStatus(statusRaw);
          const isError = this.isErrorStatus(statusRaw);

          // Le label est calculé via mapStatus pour refléter le mapping dynamique
          const statusLabel = this.mapStatus(statusRaw);
         const STATUS_ORDER = [
  { cond: isAccepted, value: 'prospectStatusType.accepted' },
  { cond: isRejected, value: 'loanStatusType.overpaid' },
  { cond: isExpired, value: 'loanProduct.inActive' },
  { cond: isNew, value: 'prospectStatusType.new' },
  { cond: isError, value: 'prospectStatusType.error' },
];

const statusCode = STATUS_ORDER.find(s => s.cond)?.value;
          return {
            ...p,
            statusValue: statusRaw,
            statusLabel: statusLabel,
            statusCode: statusCode,
            createdAtLabel: this.formatDate(p.createdAt)
          };
        });

        // totalElements attendu côté backend pour pagination
        this.totalRows = data?.totalElements ?? this.apiProspects.length;
        this.dataSource.data = this.displayedData;

        const hasResults = this.apiProspects.length > 0;
        this.existsProspectsToFilter = hasResults;
        this.notExistsProspectsToFilter = !hasResults;
        this.isLoading = false;
      },
      (error: any) => {
        this.isLoading = false;
        console.error('Erreur lors du chargement des prospects', error);
      }
    );
  }

  // --------------- Pagination & Tri ---------------
  pageChanged(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.getProspects();
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
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  // --------------- Actions UI ---------------
  onShowDraftChange(_evt?: boolean) {
    // La valeur this.showDraft n’est pas utilisée ici, garder si besoin d’avenir
    this.getProspects(); // recharge les données en fonction du nouvel état (si implémenté)
  }

  // --------------- Types ---------------
}