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
      minute: '2-digit'
    }).format(date);

    // Combine les parties selon la locale du navigateur
    return `${datePart} ${timePart}`;
  }
}