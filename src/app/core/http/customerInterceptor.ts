import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CustomUrlInterceptor implements HttpInterceptor {
  // URL de base du backend local
  private readonly customBase = 'http://192.168.100.29:8080';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let url = req.url;

    // Si l'URL n'est pas absolue et contient 'prospects', on la réécrit
    const isRelative = !/^https?:\/\//i.test(url); // pas http:// ou https://
    if (isRelative && url.includes('prospects')) {
     // console.log("Intercepteur: rewriting URL", { original: url });

      // Concaténation sûre: retire slashes superflus
      const base = this.customBase.replace(/\/+$/, '');      // trim trailing slashes
      const path = url.replace(/^\/+/, '');                   // trim leading slashes

      url = `${base}/${path}`; // par ex: http://192.168.100.29:8080/custom-provider/api/v1/prospects
      //console.log("Intercepteur: nouvelle URL", url);

      // Clone avec la nouvelle URL
      const cloned = req.clone({ url });
      return next.handle(cloned);
    }

    // Sinon, passer tel quel
    return next.handle(req);
  }
}