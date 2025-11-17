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

  totalRows: number = 0;
  isLoading = false;

  pageSize = 50;
  currentPage = 0;
  filterText = '';

  sortAttribute = '';
  sortDirection = '';
  
  // Filtres (nouveaux) - pilotage via ngModel
  filterShowAccepted: boolean = false;
  filterShowRejected: boolean = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private prospectService: ProspectsService) {}

  ngOnInit() {
    // Si vous avez un LocalisationService, vous pouvez y souscrire pour mettre à jour la locale ici.
    // Exemple: this.localisationService.currentLang$.subscribe(lang => this.prospectService.locale = lang);
    this.getProspects();
  }

  /**
   * Recherches server pour texte et ressources.
   * Cette méthode est déclenchée par le champ de recherche (ou via bouton).
   */
  search(value: string) {
    this.filterText = value;
    this.resetPaginator();
    // Utilise searchByText pour aligner avec l'API attendue
    this.getProspects();
  }
  
  onFilterChange() {
      this.resetPaginator();
      // Utilise searchByText pour aligner avec l'API attendue
      this.getProspects();
    }

  // --------------- Données affichées ---------------
  get displayedData(): any[] {
    return this.apiProspects;
  }

  // --------------- Appels API ---------------
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
	
	let statusParam = '1';

	if(this.filterShowAccepted){
		statusParam = statusParam + ',2';
	} 

	if(this.filterShowRejected){
		statusParam = statusParam + ',3';
	}

    // Appel API adaptée: utilisation de searchByText pour produire l’URL cible
    this.prospectService.searchByText(
	  statusParam,	
      this.filterText,
      this.currentPage,    // page
      this.pageSize,       // pageSize
      this.sortAttribute,
      this.sortDirection
    )
    .subscribe(
      (data: any) => {
        const content: any[] = data?.content ?? data?.items ?? data ?? [];

        // Map des prospects reçus
        this.apiProspects = content.map((p: any) => {
          const statusRaw = (typeof p.status === 'object' && p.status != null) ? p.status.code : p.status;
          const isAccepted = this.isAcceptedStatus(statusRaw);
          const isNew = this.isNewStatus(statusRaw);
          const isRejected = this.isRejectedStatus(statusRaw);
          const isExpired = this.isExpiredStatus(statusRaw);
          const isError = this.isErrorStatus(statusRaw);

          // Utiliser le mapping centralisé via le service
          const statusLabel = this.prospectService.mapStatus(statusRaw);
          const STATUS_ORDER = [
            { cond: isAccepted, value: 'prospectStatusType.accepted' },
            { cond: isRejected, value: 'prospectStatusType.rejected' },
            { cond: isExpired, value: 'prospectStatusType.expired' },
            { cond: isNew, value: 'prospectStatusType.new' },
            { cond: isError, value: 'prospectStatusType.error' },
          ];

          const statusCode = STATUS_ORDER.find(s => s.cond)?.value;
          // Nouveaux champs pour jour/mois/année (clé de traduction du mois)
          const dateParts = this.prospectService.formatDatePartsForLocale(p.createdAt);
          const createdAtDay = dateParts?.day ?? null;
          const createdAtMonthKey = dateParts?.monthKey ?? null;
          const createdAtYear = dateParts?.year ?? null;

          // Libellé formaté alternatif si besoin
          const createdAtLabel = this.prospectService.formatDateNeeded(p.createdAt); // optionnel

          return {
            ...p,
            statusValue: statusRaw,
            statusLabel: statusLabel,
            statusCode: statusCode,
            createdAtDay,
            createdAtMonthKey,
            createdAtYear,
            createdAtLabel
          };
        });

        // Total et données affichées initialement
        this.totalRows = data?.totalElements ?? data?.total ?? content.length;
        this.dataSource.data = this.apiProspects;

        this.existsProspectsToFilter = this.apiProspects.length > 0;
        this.notExistsProspectsToFilter = !this.existsProspectsToFilter;
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