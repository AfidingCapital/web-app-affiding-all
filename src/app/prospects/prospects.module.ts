/** Angular Imports */
import { NgModule } from '@angular/core';

/** Custom Modules */
import { ProspectsRoutingModule } from './prospects-routing.module';
import { SharedModule } from 'app/shared/shared.module';
import { PipesModule } from '../pipes/pipes.module';
import { DirectivesModule } from '../directives/directives.module';

/** Custom Components */
import { ProspectsComponent } from './prospects.component';
import { ViewProspectComponent } from './view-prospect/view-prospect.component';
//import { ProspectsViewComponent } from './clients-view/prospects-view.component';
//import { ClientsViewComponent } from './clients-view/clients-view.component';

/**
 * Clients Module
 *
 * All components related to Clients should be declared here.
 */
@NgModule({
  imports: [
    SharedModule,
    ProspectsRoutingModule,
    PipesModule,
    DirectivesModule
  ],
  declarations: [
    ProspectsComponent,
	ViewProspectComponent
//    ClientsComponent,
//	ProspectsViewComponent,

  ],
  providers: []
})
export class ProspectsModule {}
