/** Angular Imports */
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';

/** Optional: interface pour typer les items de notification */
interface NotificationItem {
  id: number;
  objectType: string;
  objectId: number;
  action: string;
  actorId?: number;
  content: string;
  isRead: boolean;
  isSystemGenerated: boolean;
  createdAt: string;
}

/**
 * Notifications Page Component
 */
@Component({
  selector: 'mifosx-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss']
})
export class NotificationsPageComponent implements OnInit {
  /** Notifications data. */
  notificationsData: NotificationItem[] = [];

  /** Columns to be displayed in notifications table. */
  displayedColumns: string[] = [
    'notification',
    'createdAt'
  ];

  /** Data source for notifications table. */
  dataSource: MatTableDataSource<NotificationItem>;

  /**
   * Gets router link prefix from notification's objectType attribute
   * Shares, Savings, Deposits, Loans routes inaccessible because of dependency on entity ID.
   */
  routeMap: any = {
    client: '/clients/',
    group: '/groups/',
    loan: '/loans-accounts/',
    center: '/centers/',
    shareAccount: '/shares-accounts/',
    fixedDeposit: '/fixed-deposits-accounts/',
    recurringDepositAccount: '/recurring-deposits-accounts/',
    savingsAccount: '/savings-accounts/',
    shareProduct: '/products/share-products/',
    loanProduct: '/products/loan-products/'
  };

  /** Paginator for notifications table. */
  @ViewChild(MatPaginator) paginator: MatPaginator;
  /** Sorter for notifications table. */
  @ViewChild(MatSort) sort: MatSort;

  /**
   * New: champs pour le format "jour mois-traduit année HH:mm:ss"
   * Exposé côté template pour affichage cohérent avec i18n des mois.
   */
  createdAtDay: number | null = null;
  createdAtMonthKey: string | null = null; // ex: 'months.november'
  createdAtYear: number | null = null;
  createdAtTime: string | null = null; // ex: '18:30:00'

  /**
   * Retrieves the notifications data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor(private route: ActivatedRoute) {
    // Réception des données résolues
    this.route.data.subscribe((data: { notifications: { pageItems: NotificationItem[] } }) => {
      this.notificationsData = data?.notifications?.pageItems ?? [];
      this.setNotifications();
    });
  }

  /**
   * Init hook kept for compatibility. La dataSource est déjà initialisée via le resolver.
   */
  ngOnInit() {
    // Pas d'initialisation bloquante ici pour éviter les erreurs si les données arrivent après la construction.
  }

  /**
   * Initializes the data source, paginator and sorter for notifications table.
   */
  setNotifications() {
    // Si jamais les données ne sont pas encore disponibles, on crée un tableau vide.
    const items = Array.isArray(this.notificationsData) ? this.notificationsData : [];
    // Option 1: mapping avec création d'une propriété displayCreatedAt pour éviter des appels récurrents
    const mapped = items.map(p => ({
      ...p,
      createdAtDisplay: this.formatCreatedAtWithTime(p.createdAt)
    }));

    this.dataSource = new MatTableDataSource<NotificationItem>(mapped as any);

    // Appliquer paginator et sort une fois que la vue est prête
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }

    // Pré-calcul des champs pour le format "jour mois-traduit année HH:mm:ss" par item
    // Pour un affichage ligne par ligne, il est préférable d’alimenter les champs par item.
    // Ici, nous calculons pour le dernier item afin que le template puisse lire les valeurs de manière fiable.
    // Si vous avez besoin d’un calcul per-row, vous pouvez faire un mapping similaire dans setNotifications.
    if (mapped.length > 0) {
      const last = mapped[mapped.length - 1];
      this.updateCreatedAtParts(last.createdAt);
    } else {
      this.clearCreatedAtParts();
    }
  }

  private clearCreatedAtParts() {
    this.createdAtDay = null;
    this.createdAtMonthKey = null;
    this.createdAtYear = null;
    this.createdAtTime = null;
  }

  /**
   * Update the per-row date parts (day, monthKey, year, time) from an ISO string.
   * Adapté pour obtenir passthroughs pour un affichage cohérent dans le template.
   */
  private updateCreatedAtParts(iso?: string) {
    if (!iso) {
      this.clearCreatedAtParts();
      return;
    }
    const cleaned = iso.split('.')[0];
    const date = new Date(cleaned);
    if (Number.isNaN(date.getTime())) {
      this.clearCreatedAtParts();
      return;
    }

    const day = date.getDate();
    const monthEn = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date);
    const year = date.getFullYear();

    // Construire la clé de traduction. Exemple: months.november
    const monthKey = `months.${monthEn.toLowerCase()}`;

    // Heure au format HH:mm:ss
    const timePart = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(date);

    this.createdAtDay = day;
    this.createdAtMonthKey = monthKey;
    this.createdAtYear = year;
    this.createdAtTime = timePart;
  }

  /**
   * Return the entity link for a given notification item.
   * For loans, the required format is:
   * /clients/{actorId}/loans-accounts/{objectId}/general
   */
  getEntityLink(item: NotificationItem): string {
    const type = item?.objectType;
    const base = this.routeMap[type] ?? '';

    if (type === 'loan' && item?.actorId && item?.objectId) {
      return `/clients/${item.actorId}/loans-accounts/${item.objectId}/general`;
    }

    // Fallback to generic pattern if available
    if (base && item?.objectId) {
      return `${base}${item.objectId}`;
    }

    return '#';
  }

  /**
   * Format createdAt to include date and time according to the current locale.
   * - It trims any trailing information after a dot (.) if present.
   * - Returns an empty string if createdAt is invalid.
   * Note: This function is kept for backward compatibility if you still need createdAtDisplay in some places.
   */
  formatCreatedAtWithTime(iso?: string): string {
    if (!iso) return '';
    // Supprime tout ce qui suit le point (ex. millis, TZ, etc.)
    const cleaned = iso.split('.')[0];
    const date = new Date(cleaned);
    if (Number.isNaN(date.getTime())) return '';

    const datePart = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);

    const timePart = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);

    // Combine les parties selon la locale du navigateur
    return `${datePart} ${timePart}`;
  }
}