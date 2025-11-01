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
      '0': 'Nouveau',
      '1': 'Active',
      '2': 'Pending', 
      '3': 'Refusé'
    };
    const key = String(status);
    return map[key] ?? key;
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

            // Calcul du label: si code === 2 (Pending) sinon mapping général
            const statusLabel = (typeof statusRaw === 'number' && statusRaw === 2)
              ? 'Pending'
              : this.mapStatus(statusRaw);

              const statusCode = (typeof statusRaw === 'number' && statusRaw === 2)
              ? 'clientStatusType.pending'
              : undefined;

            const transformed: any = {
              ...p,
              statusValue: statusRaw,
              statusLabel: statusLabel,
              statusCode: statusCode,
              createdAtLabel: this.formatDate(p.createdAt)
            };

            // Debug rapide
            console.log('statusLabel pour ce prospect:', statusLabel, 'statusRaw:', statusRaw, 'objet:', transformed);

            return transformed;
          });

          this.totalRows = this.apiProspects.length;
          this.dataSource.data = this.apiProspects;

          const hasResults = this.apiProspects.length > 0;
          this.existsProspectsToFilter = hasResults;
          this.notExistsProspectsToFilter = !hasResults;
          this.isLoading = false;

          console.log('Prospects raw:', data);
          console.log('apiProspects:', this.apiProspects);
        },
        (error: any) => {
          this.isLoading = false;
          console.error('Erreur lors du chargement des prospects', error);
        }
      );

    // Flux searchByText: applique le même mapping pour éviter d’écraser statusLabel
    this.prospectService.searchByText(
      this.filterText,
      this.currentPage,
      this.pageSize,
      this.sortAttribute,
      this.sortDirection
    )
    .subscribe(
      (data: any) => {
        const content = data?.content ?? data ?? [];

        // Appliquer le même mapping ici pour ne pas écraser statusLabel
        const mapped = content.map((p: any) => {
          const statusRaw = (typeof p.status === 'object' && p.status != null) ? p.status.code : p.status;
          const statusLabel = (typeof statusRaw === 'number' && statusRaw === 2)
            ? 'Pending'
            : this.mapStatus(statusRaw);
          const statusCode = (typeof statusRaw === 'number' && statusRaw === 2)
            ? 'clientStatusType.pending'
            : undefined;

          return {
            ...p,
            statusValue: statusRaw,
            statusLabel: statusLabel,
            statusCode: statusCode,
             createdAtLabel: this.formatDate(p.createdAt)
          };
        });

        this.apiProspects = mapped;
        this.totalRows = data?.totalElements ?? mapped.length;
        this.dataSource.data = this.displayedData;

        this.existsProspectsToFilter = (mapped.length > 0);
        this.notExistsProspectsToFilter = !this.existsProspectsToFilter;
        this.isLoading = false;

        console.log('Prospects raw (searchByText):', data);
        console.log('apiProspects (appliqué mapping):', this.apiProspects);
        console.log('displayedData:', this.displayedData);
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