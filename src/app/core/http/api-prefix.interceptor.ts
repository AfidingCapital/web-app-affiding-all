/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Environment Configuration */
import { SettingsService } from 'app/settings/settings.service';

/**
 * Http request interceptor to prefix a request with `serverUrl`.
 */
@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
  
  /**
   * @param {SettingsService} settingsService Settings Service
   */
  constructor(private settingsService: SettingsService) {}

  /**
   * Intercepts a Http request and prefixes it with `serverUrl`.
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Détermine si l'URL contient une version (par ex. /v2/...)
    //const isVersioned = /^\/(v[1-9]\d*\/).*$/.test(request.url);


    
    let baseUrl = this.settingsService.serverUrl;
    let customUrl = this.settingsService.customServerUrl;

    const versionRegex = /^\/(v[1-9][0-9]*\/).*$/;
    if (versionRegex.test(request.url)) {
     
      baseUrl = this.settingsService.baseServerUrl;
    }
    if (versionRegex.test(request.url)) {
      baseUrl = this.settingsService.baseServerUrl;
    }
    if (request.url.includes('/actuator/')) {
      baseUrl = this.settingsService.serverHost;
    }

    // Si l'URL contient 'prospects', on doit utiliser baseUrlCustomer
    // const isProspects = request.url.includes('prospects');
    // const finalCustombaseUrlCustom = isProspects ? CustombaseUrlCustom : baseUrl;

    // // Ignore URLs absolues (http/https)
    // if (!/^https?:\/\//.test(request.url)) {
    //   // Concaténation sûre: gère les slashes en trop ou manquants
    //   const joined = this.joinUrl(finalCustombaseUrlCustom, request.url);
    //   request = request.clone({ url: joined });
    // }

    /**
     * Ignore URLs that are complete for i18n
    /* /*  */
    
    if (!request.url.includes('http:') && !request.url.includes('https:')) {
      if (request.url.includes('prospects')) {
        console.log('Je viens d\'ajouter le custom URL Customer :' + customUrl+' à '+request.url);
        request = request.clone({ url: customUrl + request.url });
      }
      else {
        console.log('Je viens d\'ajouter le base URL :' + baseUrl+' à '+request.url);
        request = request.clone({ url: baseUrl + request.url });
      }
    }
    return next.handle(request);
  }

  // Helper pour joindre proprement base et path
  private joinUrl(base: string, path: string): string {
    if (base.endsWith('/') && path.startsWith('/')) {
      return base.slice(0, -1) + path;
    } else if (!base.endsWith('/') && !path.startsWith('/')) {
      return base + '/' + path;
    }
    return base + path;
  }
}
