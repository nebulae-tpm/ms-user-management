import { query } from "@angular/animations";
import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot
} from "@angular/router";
import { GatewayService } from "../../../../api/gateway.service";
import * as Rx from "rxjs";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import {
  getUser,
  getRoles,
  getUserRoleMapping,
  createUser,
  createUserAuth,
  updateUserGeneralInfo,
  updateUserState,
  resetUserPassword,
  addRolesToTheUser,
  removeRolesFromUser
} from "../gql/UserManagement";

@Injectable()
export class UserFormService {
  routeParams: any;
  user: any;
  onUserChanged: BehaviorSubject<any> = new BehaviorSubject({});

  constructor(private gateway: GatewayService) {}

  /**
   * Route resolver
   * @param {ActivatedRouteSnapshot} route
   * @param {RouterStateSnapshot} state
   * @returns {Observable<any> | Promise<any> | any}
   */
  // resolve(
  //   route: ActivatedRouteSnapshot,
  //   state: RouterStateSnapshot
  // ): Observable<any> | Promise<any> | any {
  //   this.routeParams = route.params;
  //   if (this.routeParams.id === "new") {
  //     this.onUserChanged.next(false);
  //     return Rx.Observable.of(undefined);
  //   } else {
  //     return this.getUser$(this.routeParams.username);
  //   }
  // }

  /**
   * Gets the users by its id
   * @param id User ID
   * @param businessId Id of the business to which the user belongs
   */
  getUser$(id, businessId) {
    return this.gateway.apollo.query<any>({
      query: getUser,
      variables: {
        id: id,
        businessId: businessId
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * Gets the roles that the petitioner user can assign to other users.
   * @param username
   */
  getRoles$() {
    return this.gateway.apollo.query<any>({
      query: getRoles,
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * Gets the roles of the indicated user.
   * @param userId Id of the user to query
   * @param businessId Id of the business to which the user belongs
   */
  getUserRoleMapping$(userId, businessId) {
    return this.gateway.apollo.query<any>({
      query: getUserRoleMapping,
      variables: {
        userId: userId,
        businessId: businessId
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * Adds roles to the specified user
   * @param userId Id of the user to which the roles will be added
   * @param roles Roles to be added
   * @param businessId Id of the business to which the user belongs
   */
  addRolesToTheUser$(userId, roles, businessId): Observable<any> {
    const rolesInput = {
      roles: roles
    };

    return this.gateway.apollo.mutate<any>({
      mutation: addRolesToTheUser,
      variables: {
        userId: userId,
        businessId: businessId,
        input: rolesInput
      },
      errorPolicy: "all"
    });
  }

  /**
   * Removes roles to the specified user
   * @param userId Id of the user to which the roles will be removed
   * @param roles Roles to be removed
   * @param businessId Id of the business to which the user belongs
   */
  removeRolesFromUser$(userId, roles, businessId): Observable<any> {
    const rolesInput = {
      roles: roles
    };

    return this.gateway.apollo.mutate<any>({
      mutation: removeRolesFromUser,
      variables: {
        userId: userId,
        businessId: businessId,
        input: rolesInput
      },
      errorPolicy: "all"
    });
  }

  /**
   * Creates a new user
   * @param user user to be created
   * @param businessId Id of the business to which the user belongs
   */
  createUser$(user, businessId): Observable<any> {

    return this.gateway.apollo.mutate<any>({
      mutation: createUser,
      variables: {
        input: user,
        businessId: businessId
      },
      errorPolicy: "all"
    });
  }

  /**
   * Updates the user general info
   * @param userId Id of the user to be updated
   * @param user New general info of the user
   * @param businessId Id of the business to which the user belongs
   */
  updateUserGeneralInfo$(userId, user): Observable<any> {
    const userInput = {
      generalInfo: user.generalInfo
    };
console.log('FE updateUserGeneralInfo -> ', userInput);
    return this.gateway.apollo.mutate<any>({
      mutation: updateUserGeneralInfo,
      variables: {
        userId: userId,
        input: userInput
      },
      errorPolicy: "all"
    });
  }

  /**
   * Updates the user state
   * @param userId User ID
   * @param username username
   * @param newState New state of the user
   * @param businessId Id of the business to which the user belongs
   */
  updateUserState$(userId, username, newState, businessId): Observable<any> {
    return this.gateway.apollo.mutate<any>({
      mutation: updateUserState,
      variables: {
        userId: userId,
        username: username,
        businessId: businessId,
        state: newState
      },
      errorPolicy: "all"
    });
  }

  /**
   * Create auth for the user.
   * @param userId userId
   * @param userPassword Password object
   * @param userPassword.username username
   * @param userPassword.password new password
   * @param userPassword.temporary Booleand that indicates if the password is temporal
   */
  createUserAuth$(userId, userPassword): Observable<any> {
    const authInput = {
      username: userPassword.username,
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: createUserAuth,
      variables: {
        userId: userId,
        username: userPassword.username,
        input: authInput
      },
      errorPolicy: "all"
    });
  }

  /**
   * Resets the user password.
   * @param userId id of the user
   * @param userPassword new password
   * @param businessId Id of the business to which the user belongs
   */
  resetUserPassword$(userId, userPassword, businessId): Observable<any> {
    const userPasswordInput = {
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: resetUserPassword,
      variables: {
        userId: userId,
        businessId: businessId,
        input: userPasswordInput
      },
      errorPolicy: "all"
    });
  }
}
