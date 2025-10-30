import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** Routing Imports */
import { Route } from '../core/route/route.service';

/** Custom Components */
import { ProspectsComponent } from './prospects.component';
import { ViewProspectComponent } from './view-prospect/view-prospect.component';

/** Custom Resolvers */
import { ProspectResolver } from './prospect.resolver';

const routes: Routes = [
  Route.withShell([
    {
      path: 'prospects',
      data: { title: 'Prospects', breadcrumb: 'Prospects', routeParamBreadcrumb: false },
      children: [
        {
          path: '',
          component: ProspectsComponent
        },
		{
		  path: ':id',
		  data: { title: 'View Prospect', routeParamBreadcrumb: 'id' },
		  children: [
		    {
		      path: '',
		      component: ViewProspectComponent,
		      resolve: {
		        user: ProspectResolver
		      }
		    },
		  ]
		}		
      ],
        
    },

  ])

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
	ProspectResolver,
  ]
})
export class ProspectsRoutingModule {}
