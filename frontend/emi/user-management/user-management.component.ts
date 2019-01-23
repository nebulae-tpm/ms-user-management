import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { Router } from "@angular/router";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from './../../../core/services/translation-loader.service';
import { TranslateService } from '@ngx-translate/core';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';

import { UserManagementService } from './user-management.service';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatDialog,
  MatSnackBar
} from '@angular/material';
import { fuseAnimations } from '../../../core/animations';


import { Subject, fromEvent, of, from, Observable, combineLatest } from 'rxjs';
import {
  startWith,
  take,
  filter,
  tap,
  map,
  mergeMap,
  debounceTime,
  distinctUntilChanged,
  toArray,
  takeUntil,
} from 'rxjs/operators';

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";
import { ToolbarService } from "../../toolbar/toolbar.service";

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  animations: fuseAnimations
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();
  // Rxjs subscriptions
  // subscriptions = [];
  // Table data
  dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = ['fullname', 'doc_type', 'doc_id', 'state', 'username'];

  // Table values
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('filter') filter: ElementRef;
  @ViewChild(MatSort) sort: MatSort;
  tableSize: number;
  page = 0;
  count = 10;
  searchFilter = '';
  sortColumn = null;
  sortOrder = null;
  itemPerPage = '';

  filterForm: FormGroup;
  businessFilterCtrl: FormControl;
  businessQueryFiltered$: Observable<any>;
  // selectedBusinessSubject$ = new Subject<any>();
  isAdmin: Boolean = false;
  selectedUser: any;
  selectedBusinessData: any = null;
  selectedBusinessId: any = null;

  constructor(
    private userManagementService: UserManagementService,
    private keycloakService: KeycloakService,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private toolbarService: ToolbarService,
    private router: Router,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
    this.businessFilterCtrl = new FormControl();
  }


  ngOnInit() {
    this.checkIfUserIsAdmin$().subscribe();
    this.buildFilterForm();
    this.loadBusinessFilter();
    this.loadFilterCache();
    // Refresh the users table
    this.refreshTable();
  }

    /**
   * Navigates to the detail page
   */
  goToDetail(){
    this.toolbarService.onSelectedBusiness$
    .pipe(
      take(1)
    ).subscribe(selectedBusiness => {
      console.log('selectedBusiness => ', selectedBusiness);
      if (!selectedBusiness || !selectedBusiness.id){
        this.showSnackBar('USER.SELECT_BUSINESS');
      }else{
        this.router.navigate(['user-management/user/' + 'new']);
      }
    });
  }

  loadFilterCache(){
    return this.userManagementService.selectedBusinessEvent$
    .pipe(
      take(1)
    )
    .subscribe(selectedBusiness => {
      if (selectedBusiness){
        this.selectedBusinessData = selectedBusiness;
        this.selectedBusinessId = selectedBusiness._id;
        this.businessFilterCtrl.setValue(this.selectedBusinessData);
      }
    });
  }

  buildFilterForm(){
    this.filterForm = this.formBuilder.group({
      business: [null],
      user: [null]
    });
  }

  getUserFilter$(){
    return fromEvent(this.filter.nativeElement, 'keyup')
    .pipe(
      startWith(undefined),
      map((element: any) => (element || {}).target ? element.target.value.trim() : undefined),
      debounceTime(150),
      distinctUntilChanged()
    );
  }

    /**
   * Paginator of the table
   */
  getPaginator$() {
    return this.paginator.page.pipe(startWith({ pageIndex: 0, pageSize: 10 }));
  }

  getUsers$(page, count, searchFilter, businessId) {
    return this.userManagementService
      .getUsers$(page, count, searchFilter, businessId)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
      );
  }

  getBusinessFilter$(){
    return this.toolbarService.onSelectedBusiness$
    .pipe(
      debounceTime(150),
      distinctUntilChanged()
    );
  }

  refreshTable(){
    combineLatest(
      this.getUserFilter$(),
      this.getBusinessFilter$(),
      this.getPaginator$()
    )
    .pipe(
      filter(([userFilter, businessFilter, paginator]) => businessFilter != null),
      mergeMap(([userFilter, businessFilter, paginator]) =>
        this.getUsers$(paginator.pageIndex, paginator.pageSize, userFilter, businessFilter.id)),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(model => {
      this.dataSource.data = model.data.getUsers;
    });
  }

  loadBusinessFilter() {
    this.businessQueryFiltered$ = this.checkIfUserIsAdmin$()
    .pipe(
      mergeMap(isAdmin => {
        if (isAdmin) {
          return this.businessFilterCtrl.valueChanges.pipe(
            startWith(undefined),
            debounceTime(500),
            distinctUntilChanged(),
            filter(change => typeof change === 'string' || change === undefined ),
            mergeMap((filterText: String) => this.getBusinessFiltered$(filterText, 10))
          );

        } else {
          return Observable.defer(() => this.userManagementService.getMyBusiness$())
          .pipe(
            map((res: any) => res.data.myBusiness),
            tap(business => {
              this.businessFilterCtrl.setValue(business);
              //this.onSelectBusinessEvent(business);
            }),
            toArray()
          );
        }
      }),
      takeUntil(this.ngUnsubscribe)
    );
  }

    /**
   * Checks if the logged user has role PLATFORM-ADMIN
   */
  checkIfUserIsAdmin$() {
    return of(this.keycloakService.getUserRoles(true)).pipe(
      map(userRoles => userRoles.some(role => role === 'PLATFORM-ADMIN')),
      tap(isAdmin => { this.isAdmin = isAdmin; }),
    );
  }

  getBusinessFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.userManagementService.getBusinessByFilter(filterText, limit).pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter((resp: any) => !resp.errors),
      mergeMap(result => from(result.data.getBusinessByFilterText)),
      toArray(),
      takeUntil(this.ngUnsubscribe)
    );
  }

    /**
   * Listens when a new business have been selected
   * @param business  selected business
   */
  onSelectBusinessEvent(business) {
    if (business){
      this.selectedBusinessId = business._id;
    }

    this.userManagementService.selectBusiness(business);

  }

  displayFn(business) {
    return (business || {generalInfo: {}}).generalInfo.name;
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('USER.CLOSE'), {
        duration: 4000
      });
  }

  /**
   * Handles the Graphql errors and show a message to the user
   * @param response
   */
  graphQlAlarmsErrorHandler$(response){
    return of(JSON.parse(JSON.stringify(response)))
    .pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response){
    if (response.errors){

      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          }else{
            response.errors.forEach( e => {
              this.showMessageSnackbar('ERRORS.' + e.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?){
    const translationData = [];
    if (messageKey){
      translationData.push(messageKey);
    }

    if (detailMessageKey){
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData)
    .subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : '',
        detailMessageKey ? data[detailMessageKey] : '',
        {
          duration: 2000
        }
      );
    });
  }

  getNext(event: any) {
    const offset = event.pageSize * event.pageIndex;
    // call your api function here with the offset
  }

  ngOnDestroy() {
    // if (this.subscriptions) {
    //   this.subscriptions.forEach(sub => {
    //     sub.unsubscribe();
    //   });
    // }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
