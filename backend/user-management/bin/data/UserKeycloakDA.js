"use strict";

const Rx = require("rxjs");
const KeycloakDA = require("./KeycloakDA").singleton();

class UserKeycloakDA {


   /**
    * Adds the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be added to the user
    */
  static addRolesToTheUser$(userId, arrayRoles) {

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.maps.map(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        arrayRoles
      )
    );
  }

    /**
    * Removes the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be removed from the user
    */
   static removeRolesFromUser$(userId, arrayRoles) {

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.maps.unmap(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        arrayRoles
      )
    );
  }

  /**
   * Creates a new user
   * @param {*} user user to create
   */
  static createUser$(user) {
    //const USER_ROLES_ALLOW_TO_ASSIGN = JSON.parse(process.env.USER_ROLES_ALLOW_TO_ASSIGN);

    const attributes = {};
    attributes["documentType"] = user.documentType;
    attributes["documentId"] = user.documentId;
    attributes["phone"] = user.phone;
    attributes["businessId"] = user.businessId;

    const userKeycloak = {
      username: user.username,
      firstName: user.name,
      lastName: user.lastname,
      attributes: attributes,
      email: user.email,
      enabled: user.state,
      id: user.id
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.create(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

  /**
   * Updates the user
   * @param {*} userId User ID
   * @param {*} user user to updated
   */
  static updateUserGeneralInfo$(userId, user) {
    const attributes = {};
    attributes["documentType"] = user.generalInfo.documentType;
    attributes["documentId"] = user.generalInfo.documentId;
    attributes["phone"] = user.generalInfo.phone;
    attributes["businessId"] = user.businessId;

    const userKeycloak = {
      id: userId,
      username: user.username,
      firstName: user.generalInfo.name,
      lastName: user.generalInfo.lastname,
      attributes: attributes,
      email: user.generalInfo.email
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

  /**
   * Updates the user state
   * @param {*} userId User ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserState$(userId, newUserState) {
    const userKeycloak = {
      id: userId,
      enabled: newUserState
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

  /**
   * Resets the user password
   * @param {*} userId
   * @param {*} userPassword
   */
  static resetUserPassword$(userId, userPassword) {
    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.resetPassword(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        userPassword
      )
    );
  }

/**
   * Gets the users by user ID
   */
  static getUserByUserId$(userId) {
    //Gets the amount of user registered on Keycloak
    return (
      Rx.Observable.defer(() => {
        const optionsFilter = {
          userId: userId
        };
        return KeycloakDA.keycloakClient.users.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME,
          optionsFilter);
      }).map(result => {
          const attributes = result.attributes;
          const user = {
            id: result.id,
            businessId: !attributes || !attributes.businessId
            ? undefined
            : attributes.businessId[0],
            username: result.username,
            generalInfo: {
              name: result.firstName ? result.firstName : "",
              lastname: result.lastName ? result.lastName : "",
              documentType:
                !attributes || !attributes.documentType
                  ? undefined
                  : attributes.documentType[0],
              documentId:
                !attributes || !attributes.documentId
                  ? undefined
                  : attributes.documentId[0],
              email: result.email,
              phone:
                !attributes || !attributes.phone
                  ? undefined
                  : attributes.phone[0]
            },
            state: result.enabled
          };
          return user;
        })
    );
  }

  /**
   * Gets the users paging
   * @param {*} page
   * @param {*} paginationCount
   * @param {*} searchFilter
   * @param {*} businessId
   * @param {*} username
   * @param {*} email
   * @param {*} userId
   */
  static getUsers$(
    page,
    paginationCount,
    searchFilter,
    businessId,
    username,
    email,
  ) {
    //Gets the amount of user registered on Keycloak
    return (
      Rx.Observable.defer(() =>
        KeycloakDA.keycloakClient.users.count(
          process.env.KEYCLOAK_BACKEND_REALM_NAME
        )
      )
        //According to the amount of user, it generates ranges which will help us to get the users by batches
        .mergeMap(usersCount => Rx.Observable.range(0, Math.ceil(usersCount / paginationCount)))
        //Gets the users from Keycloak
        .concatMap(range => {          
          const optionsFilter = {
            first: 100 * range,
            max: 100,
            search: searchFilter,
            username: username,
            email: email
          };
          return KeycloakDA.keycloakClient.users.find(
            process.env.KEYCLOAK_BACKEND_REALM_NAME,
            optionsFilter
          );
        })
        .mergeMap(users => {
          return Rx.Observable.from(users)
        })
        // We can only return the users belonging to the indicated business.
        .filter(
          user => {
            return businessId == null ||
            (user.attributes &&
              user.attributes.businessId &&
              user.attributes.businessId[0] == businessId);
          }
        )
        .map(result => {
          const attributes = result.attributes;
          const user = {
            id: result.id,
            username: result.username,
            generalInfo: {
              name: result.firstName ? result.firstName : "",
              lastname: result.lastName ? result.lastName : "",
              documentType:
                !attributes || !attributes.documentType
                  ? undefined
                  : attributes.documentType[0],
              documentId:
                !attributes || !attributes.documentId
                  ? undefined
                  : attributes.documentId[0],
              email: result.email,
              phone:
                !attributes || !attributes.phone
                  ? undefined
                  : attributes.phone[0]
            },
            state: result.enabled
          };
          return user;
        })
        .skip(paginationCount * page)
        .take(paginationCount)
        .toArray()
    );
  }

  /**
   * Gets an user by its username
   */
  static getUser$(username, email, businessId) {
    return this.getUsers$(0, 1, undefined, businessId, username, email).map(
      users => {
        if (!users || users.length == 0) {
          return null;
        }
        return users[0];
      }
    );
  }

  /**
   * Gets the roles of the specified user.
   * @param {*} userId ID of the user to be query
   * @param {*} userRolesRequester Roles of the user that is requesting the user info
   */
  static getUserRoleMapping$(userId, userRolesRequester) {
    const USER_ROLES_ALLOW_TO_ASSIGN = JSON.parse(process.env.USER_ROLES_ALLOW_TO_ASSIGN);

    let userRolesAllowed = [];
    if(userRolesRequester && USER_ROLES_ALLOW_TO_ASSIGN){
      userRolesRequester.forEach(role => {
        const data = USER_ROLES_ALLOW_TO_ASSIGN[role];
        if(data){
          userRolesAllowed = userRolesAllowed.concat(data);
        }
      });
    }

    //Gets the role mapping of the specified user
    return (
      Rx.Observable.defer(() =>
        KeycloakDA.keycloakClient.users.roleMappings.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME,
          userId
        )
      )
        .map(roleMapping => {
          return roleMapping.realmMappings;
        })
        .mergeMap(userRoleMapping => Rx.Observable.from(userRoleMapping))
        // We can only return the user roles that the petitioner user is allowed to assign to other users
        .filter(role => userRolesAllowed.includes(role.name))
        .map(result => {
          const role = {
            id: result.id,
            name: result.name
          };
          return role;
        })
        .toArray()
    );
  }

  /**
   * Gets the roles that the user can assign to another users.
   * @param {*} userRolesRequester Array of roles of the user that perform the request
   */
  static getRoles$(userRolesRequester) {
    const USER_ROLES_ALLOW_TO_ASSIGN = JSON.parse(process.env.USER_ROLES_ALLOW_TO_ASSIGN);
    let userRolesAllowed = [];
    if(userRolesRequester && USER_ROLES_ALLOW_TO_ASSIGN){
      userRolesRequester.forEach(role => {        
        const data = USER_ROLES_ALLOW_TO_ASSIGN[role];
        
        if(data){
          userRolesAllowed = userRolesAllowed.concat(data);
        }
      });
    }

    //Gets all of the user roles registered on the Keycloak realm
    return (
      Rx.Observable.defer(() =>
        KeycloakDA.keycloakClient.realms.roles.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME
        )
      )
        .mergeMap(userRoles => Rx.Observable.from(userRoles))
        // We can only return the user roles that the petitioner user is allowed to assign to other users
        .filter(role => userRolesAllowed.includes(role.name))
        .map(result => {
          const role = {
            id: result.id,
            name: result.name
          };
          return role;
        })
        .toArray()
    );
  }


  /**
   * get roles from Keycloak
   */
  static getRolesKeycloak$(){
    //Gets all of the user roles registered on the Keycloak realm
    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.roles.find(
        process.env.KEYCLOAK_BACKEND_REALM_NAME
      )
    );
  }
}

/**
 * @returns {UserKeycloakDA}
 */
module.exports = UserKeycloakDA;
