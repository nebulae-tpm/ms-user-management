"use strict";

let mongoDB = undefined;
const Rx = require("rxjs");
const KeycloakDA = require("./KeycloakDA").singleton();
const CollectionName = "User";

class UserDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance ');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }

     /**
    * Adds the specified roles to the user on Keycloak and Mongo
    * @param {*} userId Id of the user 
    * @param {*} userKeycloakId Id of the user On Keycloak
    * @param {*} arrayRoles Roles to be added to the user
    */
   static addRolesToTheUser$(userId, userKeycloakId, arrayRoles) {
    console.log('addRolesToTheUser ----> ', userId, userKeycloakId, arrayRoles);
    return Rx.Observable.from(arrayRoles)
    .map(role => role.name)
    .toArray()
    .mergeMap(rolesMapped => this.addRolesToTheUserMongo$(userId, rolesMapped))
    .mergeMap(userMongo => this.addRolesToTheUserKeycloak$(userKeycloakId, arrayRoles).mapTo(userMongo));
  }

   /**
    * Adds the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be added to the user
    */
   static addRolesToTheUserMongo$(userId, arrayRoles) {

    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $addToSet: {roles: { $each: arrayRoles}}
          },{
            returnOriginal: false
          }
        )
    )
    .map(result => result && result.value ? result.value : undefined);
  }

  /**
    * Removes the specified roles to the user on Keycloak and Mongo
    * @param {*} userId Id of the user 
    * @param {*} userKeycloakId Id of the user On Keycloak
    * @param {*} arrayRoles Roles to be added to the user
    */
   static removeRolesFromUser$(userId, userKeycloakId, arrayRoles) {
    console.log('removeRolesToTheUser ----> ', userId, userKeycloakId, arrayRoles);
    return Rx.Observable.from(arrayRoles)
    .map(role => role.name)
    .toArray()
    .mergeMap(rolesMapped => this.removeRolesFromUserMongo$(userId, rolesMapped))
    .mergeMap(userMongo => this.removeRolesFromUserKeycloak$(userKeycloakId, arrayRoles).mapTo(userMongo));
  }
  
  /**
    * Removes the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be removed from the user
    */
   static removeRolesFromUserMongo$(userId, arrayRoles) {

    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $pull: {roles: {$in: arrayRoles}}
          },
          {
            returnOriginal: false
          }
        )
    )
    .map(result => result && result.value ? result.value : undefined);
  }

  /**
    * Removes the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be removed from the user
    */
   static removeRolesFromUserKeycloak$(userId, arrayRoles) {

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.maps.unmap(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        arrayRoles
      )
    );
  }

   /**
    * Adds the specified roles to the user
    * @param {*} userId Id of the user 
    * @param {*} arrayRoles Roles to be added to the user
    */
  static addRolesToTheUserKeycloak$(userId, arrayRoles) {

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.maps.map(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        arrayRoles
      )
    );
  }

    /**
   * Creates a new user on Keycloak and Mongo
   * @param {*} user user to create
   */
  static createUser$(user) {
    return Rx.Observable.of(user)
    .mergeMap(evt => UserDA.createUserMongo$(user));
  }

    /**
   * Creates a new user on Mongo
   * @param {*} business user to create
   */
  static createUserMongo$(user) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.insertOne(user));
  }

    /**
   * Creates a new user on Keycloak
   * @param {*} user user to create
   */
  static createUserKeycloak$(user, authInput) { 
    const attributes = {};
    attributes["businessId"] = user.businessId;
    

    const userKeycloak = {
      username: authInput.username,
      firstName: user.generalInfo.name,
      lastName: user.generalInfo.lastname,
      attributes: attributes,
      email: user.generalInfo.email,
      enabled: user.state,
      id: user._id
    };

    console.log('USER =>  => ', user);
    console.log('createUserKeycloak => ', userKeycloak);

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.create(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    )
    .map(user => {
      console.log('User create keycloak => ', user);
      return user;
    });
  }


   /**
   * Updates the user general info
   * @param {*} generalInfo user general info
   */
  static updateUserGeneralInfo$(userId, generalInfo) {
    return Rx.Observable.of(generalInfo)
    .mergeMap(evt => UserDA.updateUserGeneralInfoMongo$(userId, generalInfo))
    .mergeMap(user => {
      if(user && user.auth.userKeycloakId){
        return UserDA.updateUserGeneralInfoKeycloak$(user.auth.userKeycloakId, generalInfo).mapTo(user)
      }
      return Rx.Observable.of(user)
    });
  }

        /**
   * modifies the general info of the indicated msentitypascal 
   * @param {*} userId  User ID
   * @param {*} user  General info
   */
  static updateUserGeneralInfoMongo$(userId, generalInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $set: {generalInfo: generalInfo}
          },{
            returnOriginal: false
          }
        )
    )
    .map(result => result && result.value ? result.value : undefined);
  }

  /**
   * Updates the user
   * @param {*} userId User ID
   * @param {*} user user to updated
   */
  static updateUserGeneralInfoKeycloak$(userId, generalInfo) {
    //const attributes = {};
    //attributes["businessId"] = user.businessId;

    const userKeycloak = {
      id: userId,
      //username: user.auth.username,
      firstName: generalInfo.name,
      lastName: generalInfo.lastname,
      //attributes: attributes,
      email: generalInfo.email
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

/**
   * Updates the user auth
   * @param {*} userId User ID
   * @param {*} userAuth Object
   * @param {*} userAuth.userKeycloakId user keycloak ID
   * @param {*} userAuth.username username
   */
  static updateUserAuthMongo$(userId, userAuth) {
    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $set: {auth: userAuth}
          },{
            returnOriginal: false
          }
        )
    )
    .map(result => result && result.value ? result.value : undefined);
  }

  /**
   * Updates the user state
   * @param {*} userId User ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserState$(userId, newUserState) {
    return Rx.Observable.of(newUserState)
    .mergeMap(evt => UserDA.updateUserStateMongo$(userId, newUserState))
    .mergeMap(user => {
      if(user && user.auth.userKeycloakId){
        return UserDA.updateUserStateKeycloak$(user.auth.userKeycloakId, newUserState).mapTo(user)
      }
      return Rx.Observable.of(user);
    });
  }

  /**
   * Updates the user state on Mongo
   * @param {*} userId User ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserStateMongo$(userId, newUserState) {
    console.log('updateUserStateMongo => ', userId, newUserState);
    const collection = mongoDB.db.collection(CollectionName);
    
    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: userId},
          {
            $set: {state: newUserState}
          },{
            returnOriginal: false
          }
        )
    ).map(result => result && result.value ? result.value : undefined);
  }

  /**
   * Updates the user state
   * @param {*} userId User ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserStateKeycloak$(userId, newUserState) {
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
    console.log('resetUserPassword => ', userId, userPassword);
    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.resetPassword(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userId,
        userPassword
      )
    ).catch(error => {
      console.log('Error => ', error);
      throw error;
    });
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
   * gets all the users registered on the system.
   *
   * @param {int} page Indicates the page number which will be returned
   * @param {int} count Indicates the amount of rows that will be returned
   * @param {filter} filterText filter to apply to the query.
   */
  static getUsers$(page, count, filterText, businessId) {
    let filterObject = {};
    if (filterText) {
      filterObject = {
        $or: [
          { 'generalInfo.name': { $regex: `${filterText}.*`, $options: "i" } },
          { 'generalInfo.documentId': { $regex: `${filterText}.*`, $options: "i" } }
        ]
      };
    }
    
    if(businessId){
      filterObject.businessId = businessId;
    }

    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(()=>
      collection
        .find(filterObject)
        .sort({timestamp: -1})
        .skip(count * page)
        .limit(count)
        .toArray()
    );
  }


    /**
   * Gets the users paging
   * @param {*} username
   * @param {*} email
   */
  static getUserKeycloak$(username, email) {
    const optionsFilter = {
      max: 1
    };

    if(username){
      optionsFilter.username = username;      
    }

    if(email){
      optionsFilter.email = email;
    }
    return Rx.Observable.of(optionsFilter)
    .mergeMap(filter => {
      return KeycloakDA.keycloakClient.users.find(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        filter
      );
    })
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
  static getUsers1$(
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
   * Gets user by id
   * @param {String} id User ID
   * @param {String} businessId Business ID of the user
   */
  static getUserById$(id, businessId) {
    let query = {
      _id: id
    };

    if(businessId){
      query.businessId = businessId;
    }

    return this.getUserByFilter$(query);
  }

  /**
   * Gets user by email
   * @param {String} email User email
   * @param {String} ignoreUserId if this value is enter, this user will be ignore in the query 
   */
  static getUserByEmailMongo$(email, ignoreUserId) {
    let query = {      
      'generalInfo.email': email
    };
    if(ignoreUserId){
      query._id = {$ne: ignoreUserId};
    }
    return this.getUserByFilter$(query);
  }

    /**
   * Gets user by username
   * @param {String} username User username
   * @param {String} ignoreUserId if this value is enter, this user will be ignore in the query 
   */
  static getUserByUsernameMongo$(username, ignoreUserId) {
    let query = {
      'auth.username': username
    };

    if(ignoreUserId){
      query._id = {$ne: ignoreUserId};
    }
    return this.getUserByFilter$(query);
  }
  
  /**
   * Gets an user according to the query
   * @param {Object} filterQuery Query to filter
   */
  static getUserByFilter$(filterQuery) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne(filterQuery));
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

    console.log('userRolesAllowed => ', userRolesAllowed, '-- ', USER_ROLES_ALLOW_TO_ASSIGN);
    return Rx.Observable.of(userRolesAllowed);

    //Gets all of the user roles registered on the Keycloak realm
    // return (
    //   Rx.Observable.defer(() =>
    //     KeycloakDA.keycloakClient.realms.roles.find(
    //       process.env.KEYCLOAK_BACKEND_REALM_NAME
    //     )
    //   )
    //     .mergeMap(userRoles => Rx.Observable.from(userRoles))
    //     // We can only return the user roles that the petitioner user is allowed to assign to other users
    //     .filter(role => userRolesAllowed.includes(role.name))
    //     .map(result => {
    //       const role = {
    //         id: result.id,
    //         name: result.name
    //       };
    //       return role;
    //     })
    //     .toArray()
    // );
  }


  /**
   * Gets roles from Keycloak according to the roles to filter, 
   * if no filter is sent then this method will return all of the roles from Keycloak.
   * @param roles to filter
   */
  static getRolesKeycloak$(roles){
    //Gets all of the user roles registered on the Keycloak realm
    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.realms.roles.find(
        process.env.KEYCLOAK_BACKEND_REALM_NAME
      )
    ).mergeMap(roles => {
      console.log('getRolesKeycloak => ', roles);
      return Rx.Observable.from(roles);
    })
    .filter(roleKeycloak => {
      console.log('roleKeycloak --> ', roleKeycloak, roles);
      return roles == null || roles.includes(roleKeycloak.name);
    })
    .toArray();
  }
}

/**
 * @returns {UserDA}
 */
module.exports = UserDA;
