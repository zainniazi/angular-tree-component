import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BasicTreeComponent } from './basictree/basictree.component';
import { FullTreeComponent } from './fulltree/fulltree.component';
import { TemplatesComponent } from './templates/templates.component';
import { FieldsComponent } from './fields/fields.component';
import { FilterComponent } from './filter/filter.component';
import { AsyncComponent } from './async/async.component';
import { ActionMappingComponent } from './action-mapping/action-mapping.component';

const routes: Routes = [
  {
    path: '',
    component: FullTreeComponent
  },
  {
    path: 'basic',
    component: BasicTreeComponent
  },
  {
    path: 'fields',
    component: FieldsComponent
  },
  {
    path: 'templates',
    component: TemplatesComponent
  },
  {
    path: 'filter',
    component: FilterComponent
  },
  {
    path: 'async',
    component: AsyncComponent
  },
  {
    path: 'action-mapping',
    component: ActionMappingComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
