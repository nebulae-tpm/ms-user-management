import { query } from '@angular/animations';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getUsers,
  getBusinessByFilterText,
  getMyBusiness
} from './gql/UserManagement';

@Injectable()
export class UserManagementService {

  private selectedBusinessSubject$ = new BehaviorSubject<any>(undefined);

  constructor(private gateway: GatewayService) {

  }

  /**
   * Returns an observable
   */
  get selectedBusinessEvent$() {
    return this.selectedBusinessSubject$.asObservable();
  }

  /**
   * Set the selected business
   */
  selectBusiness(business) {
    this.selectedBusinessSubject$.next(business);
  }

  /**
   *
   * @param filterText
   * @param limit
   */
  getBusinessByFilter(filterText: String, limit: number): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: getBusinessByFilterText,
        variables: {
          filterText: filterText,
          limit: limit
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  /**
   * Get the business to which the user belongs
   * @returns {Observable}
   */
  getMyBusiness$(){
    return this.gateway.apollo
      .query<any>({
        query: getMyBusiness,
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

/**
 * Gets the users filtered by page, count and a search filter.
 * @param pageValue Page number of the user table that you want to recover.
 * @param countValue Max amount of user that will be return
 * @param searchFilter Search filter (Username, name, email)
 * @param businessId Id of the business which will be use to filter the users
 */
  getUsers$(pageValue, countValue, searchFilter, businessId){
    return this.gateway.apollo
    .query<any>({
      query: getUsers,
      variables: {
        page: pageValue,
        count: countValue,
        searchFilter: searchFilter,
        businessId: businessId
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

}

