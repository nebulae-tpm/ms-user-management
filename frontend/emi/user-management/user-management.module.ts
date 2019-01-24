import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { MatPaginatorIntl } from '@angular/material';
import { UserManagementService } from './user-management.service';
import { UserManagementComponent } from './user-management.component';
import { UserFormComponent } from './user-form/user-form.component';
import { CustomPaginator } from './utils/custom-paginator';
import { UserFormService } from './user-form/user-form.service';

const routes: Routes = [
  {
    path: '',
    component: UserManagementComponent,
  },
  {
    path: ':id',
    component: UserManagementComponent,
  },
  {
    path: 'user/:id',
    component: UserFormComponent,
    // resolve: {
    //   data: UserFormService
    // }
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    UserManagementComponent,
    UserFormComponent
  ],
  providers: [ UserManagementService, DatePipe, UserFormService,
    { provide: MatPaginatorIntl, useClass: CustomPaginator }]
})

export class UserManagementModule {}
