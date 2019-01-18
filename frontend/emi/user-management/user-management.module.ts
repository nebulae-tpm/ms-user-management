import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { MatPaginatorIntl } from '@angular/material';
import { UserManagementService } from './user-management.service';
import { UserManagementComponent } from './user-management.component';
import { UserFormComponent } from './user-form/user-form.component';
import { UserAuthComponent } from './user-form/user-auth/user-auth.component';
import { UserGeneralInfoComponent } from './user-form/user-general-info/user-general-info.component';
import { UserRoleComponent } from './user-form/user-role/user-role.component';
import { UserSesionsComponent } from './user-form/user-sesions/user-sesions.component';
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
    path: 'user/:businessId/:id',
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
    UserFormComponent,
    UserAuthComponent,
    UserGeneralInfoComponent,
    UserRoleComponent,
    UserSesionsComponent
  ],
  providers: [ UserManagementService, DatePipe, UserFormService,
    { provide: MatPaginatorIntl, useClass: CustomPaginator }]
})

export class UserManagementModule {}
