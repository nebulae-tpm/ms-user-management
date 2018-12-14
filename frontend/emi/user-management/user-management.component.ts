import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from "@angular/core";

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "./../../../core/services/translation-loader.service";
import { TranslateService } from "@ngx-translate/core";
import { locale as english } from "./i18n/en";
import { locale as spanish } from "./i18n/es";

import { UserManagementService } from './user-management.service';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  Sort,
  MatTableDataSource,
  MatDialog,
  MatSnackBar
} from '@angular/material';
import { fuseAnimations } from '../../../core/animations';

//////////// RXJS ////////////
import * as Rx from "rxjs/Rx";
import { Subject, BehaviorSubject, Subscription, fromEvent, of, from, Observable, combineLatest } from "rxjs";
import {
  first,
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
} from "rxjs/operators";

//////////// Services ////////////
import { KeycloakService } from "keycloak-angular";

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
  //subscriptions = [];
  // Table data
  dataSource = new MatTableDataSource();
  // Columns to show in the table
  displayedColumns = ['username', 'fullname', 'doc_type', 'doc_id', 'state'];

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
  //selectedBusinessSubject$ = new Subject<any>();
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
    private snackBar: MatSnackBar
  ) {
    this.translationLoader.loadTranslations(english, spanish);
    this.businessFilterCtrl = new FormControl();
  }

  ngAfterViewInit() {

  }

  ngOnInit() {
    this.checkIfUserIsAdmin$().subscribe();
    this.buildFilterForm();
    this.loadBusinessFilter();
    this.loadFilterCache();
    // Refresh the users table
    this.refreshTable();
  }

  loadFilterCache(){
    return this.userManagementService.selectedBusinessEvent$
    .pipe(
      take(1)
    )
    .subscribe(selectedBusiness=> {
      if(selectedBusiness){
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
      //tap(data => ,
      startWith(undefined),
      map((element: any) => {
        return (element || {}).target ? element.target.value.trim(): undefined;
      }),
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
    return this.userManagementService.selectedBusinessEvent$
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
      filter(([userFilter, businessFilter, paginator]) => {
        return businessFilter != null;
      }),
      mergeMap(([userFilter, businessFilter, paginator]) => {
        return this.getUsers$(paginator.pageIndex, paginator.pageSize, userFilter, businessFilter._id)
      }),
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
            mergeMap((filterText: String) => {
              return this.getBusinessFiltered$(filterText, 10);
            })
          );
          
        } else {
          return Observable.defer(() => this.userManagementService.getMyBusiness$())
          .pipe(
            map((res: any) => res.data.myBusiness),
            tap(business => {      
              this.businessFilterCtrl.setValue(business);            
              this.onSelectBusinessEvent(business);
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
    return Rx.Observable.of(this.keycloakService.getUserRoles(true)).pipe(
      map(userRoles => {
        return userRoles.some(role => role === 'PLATFORM-ADMIN');
      }),
      tap(isAdmin => {
        this.isAdmin = isAdmin;
      }),
    );
  }

  getBusinessFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.userManagementService.getBusinessByFilter(filterText, limit).pipe(      
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(resp => !resp.errors),
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
    if(business){
      this.selectedBusinessId = business._id;
    }    

    this.userManagementService.selectBusiness(business);

  }

  displayFn(business) {
    return (business || {generalInfo: {}}).generalInfo.name;
  }

  /**
   * Finds the users and updates the table data
   * @param page page number
   * @param count Max amount of users that will be return.
   * @param searchFilter Search filter
   * @param businessId business id filter
   */
  // refreshDataTable(page, count, searchFilter, businessId) {
  //   this.userManagementService
  //     .getUsers$(page, count, searchFilter, businessId)
  //     .pipe(
  //       mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
  //       filter((resp: any) => !resp.errors || resp.errors.length === 0),
  //     ).subscribe(model => {
  //       this.dataSource.data = model.data.getUsers;
  //     });
  // }

  /**
   * Handles the Graphql errors and show a message to the user
   * @param response
   */
  graphQlAlarmsErrorHandler$(response){
    return Rx.Observable.of(JSON.parse(JSON.stringify(response)))
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
            response.errors.forEach(error => {
              this.showMessageSnackbar('ERRORS.' + error.message.code);
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
    let translationData = [];
    if(messageKey){
      translationData.push(messageKey);
    }

    if(detailMessageKey){
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData)
    .subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey]: '',
        detailMessageKey ? data[detailMessageKey]: '',
        {
          duration: 2000
        }
      );
    });
  }

  getNext(event) {
    const offset = event.pageSize * event.pageIndex

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
