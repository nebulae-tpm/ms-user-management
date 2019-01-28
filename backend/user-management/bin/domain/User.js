"use strict";

const Rx = require("rxjs");
const UserDA = require("../data/UserDA");
const broker = require("../tools/broker/BrokerFactory")();
const eventSourcing = require("../tools/EventSourcing")();
const RoleValidator = require("../tools/RoleValidator");
const UserValidatorHelper = require("./UserValidatorHelper");
const Event = require("@nebulae/event-store").Event;
const uuidv4 = require("uuid/v4");
const MATERIALIZED_VIEW_TOPIC = "emi-materialized-view-updates";
const { CustomError, DefaultError } = require("../tools/customError");
const {
  USER_MISSING_DATA_ERROR_CODE,
  USER_NAME_OR_EMAIL_EXISTS_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE
} = require("../tools/ErrorCodes");


/**
 * Singleton instance
 */
let instance;

class User {
  constructor() {}

  /**
   * Gets the useres filtered by page, count, textFilter, order and column
   *
   * @param {*} args args that contain the user filters
   */
  getUsers$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "UserManagement",
      "getUsers$()",
      PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    )
    // .do(roles => {
    //   UserValidatorHelper.checkBusiness(args, roles, authToken)
    // })
      .mergeMap(val => {
        return UserDA.getUsers$(
          args.page,
          args.count,
          args.searchFilter,
          args.businessId
        );
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Gets an user by its username
   *
   * @param {*} args args that contain the username of the user to query
   * @param {string} jwt JWT token
   * @param {string} fieldASTs indicates the user attributes that will be returned
   */
  getUser$({ args, jwt, fieldASTs }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "UserManagement",
      "getUser$()",
      PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    )
    .mergeMap(roles => {
      const isPlatformAdmin = roles["PLATFORM-ADMIN"];
      //If an user does not have the role, the query must be filtered with the businessId of the user
      const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return UserDA.getUserById$(
          args.id,
          businessId
        );
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

    /**
   * Gets roles that the petitioner user can assign to other users
   *
   * @param {*} args args
   * @param {*} authToken Token of the user that perform the request 
   */
  getRoles$({ args }, authToken) {    
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "UserManagement",
      "getUser$()",
      PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    )
      .mergeMap(val => {
        return UserDA.getRoles$(
          authToken.realm_access.roles
        );
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Gets the role mapping of the indicated user
   *
   * @param {*} args args
   * @param {*} authToken Token of the user that perform the request 
   */
  getUserRoleMapping$({ args }, authToken) {
    const userId = !args ? undefined : args.userId;
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "UserManagement",
      "getUser$()",
      PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    )
      .mergeMap(val => {
        return UserDA.getUserRoleMapping$(
          userId,
          authToken.realm_access.roles
        );
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Get the amount of rows from the user collection
   */
  getUserCount$(data, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "UserManagement",
      "changeUserState$()",
      PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    )
      .mergeMap(val => {
        return UserDA.getUserCount$();
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Adds roles to the user
   * @param data {args}
   * @param args.userId Id of the user which the roles will be added
   * @param args.input Array of roles
   * @param args.input.id Id of the roles to be added
   * @param args.input.name Name of the role to be added 
   * @param {*} authToken Token
   */
  addRolesToTheUser$(data, authToken) {
    return UserValidatorHelper.validateUserRoles$(data, authToken)
      .mergeMap(user => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserRolesAdded",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: user._id,
            data: user,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `User roles: ${data.args.input} had been added to the user with id: ${data.args.userId}`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Removes roles from the user
   * @param data {args}
   * @param args.userId Id of the user which the roles will be added
   * @param args.input Array of roles
   * @param args.input.id Id of the roles to be added
   * @param args.input.name Name of the role to be added 
   * @param {*} authToken Token
   */
  removeRolesFromUser$(data, authToken) {
    return UserValidatorHelper.validateUserRoles$(data, authToken)
      .mergeMap(user => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserRolesRemoved",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: user.id,
            data: user,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `User roles: ${data.args.input} had been removed from the user with id: ${data.args.userId}`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Creates a new user
   *
   * @param {*} data args that contain the user ID
   * @param {string} authToken JWT token
   */
  createUser$(data, authToken) {
    const id = uuidv4();
    //Verify if all of the info that was enter is valid
    return UserValidatorHelper.validateUserCreation$(data, authToken)
      .mergeMap(user => {
        user._id = id;
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserCreated",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: user._id,
            data: user,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `User with id: ${id} has been created`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Updates the user general info
   *
   * @param {*} data args that contain the user ID
   * @param {string} jwt JWT token
   */
  updateUserGeneralInfo$(data, authToken) {
    //Verify if all of the info that was enter is valid
    return UserValidatorHelper.validateUpdateUser$(data, authToken)
      .mergeMap(user => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserGeneralInfoUpdated",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: user._id,
            data: user,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `User general info with id: ${data.args.userId} has been updated`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }


  /**
   * Updates the user state
   *
   * @param {*} data args that contain the user ID and the new state
   * @param {string} authToken JWT token
   */
  updateUserState$(data, authToken) {
    return UserValidatorHelper.validateUpdateUserState$(data, authToken)
      //.mergeM
      .mergeMap(user => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: user.state ? "UserActivated" : "UserDeactivated",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: user._id,
            data: user,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `User status of the user with id: ${data.args.userId} has been updated`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Create the user auth
   *
   * @param {*} data args that contain the user ID
   * @param {string} jwt JWT token
   */
  createUserAuth$(data, authToken) {
    //Checks if the user that is performing this actions has the needed role to execute the operation.
    return UserValidatorHelper.validateCreateUserAuth$(data, authToken)
    .mergeMap(user => UserDA.getUserById$(user._id))
    .mergeMap(userMongo => {
      return UserDA.createUserKeycloak$(userMongo, data.args.input)
      .mergeMap(userKeycloak => { 
        const password = {
          temporary: data.args.input.temporary || false,
          value: data.args.input.password
        }
        //Set password
        return UserDA.resetUserPasswordKeycloak$(userKeycloak.id, password)
        //Add roles to the user on Keycloak
        .mergeMap(result =>{
          return  UserDA.addRolesToTheUserKeycloak$(userKeycloak.id, userMongo.roles);
        })
        .mapTo(userKeycloak);
      })      
      .mergeMap(userKeycloak => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserAuthCreated",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: userMongo._id,
            data: {
              userKeycloakId: userKeycloak.id,
              username: userKeycloak.username
            },
            user: authToken.preferred_username
          })
        );
      })
    })
    .map(result => {
      return {
        code: 200,
        message: `User auth of the user with id: ${data.args.userId} has been created`
      };
    })
    .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
    .catch(err => this.handleError$(err));
  }

  /**
   * Create the user auth
   *
   * @param {*} data args that contain the user ID
   * @param {string} jwt JWT token
   */
  removeUserAuth$(data, authToken) {
    //Checks if the user that is performing this actions has the needed role to execute the operation.
    return UserValidatorHelper.validateRemoveUserAuth$(data, authToken)
    .mergeMap(user => UserDA.getUserById$(user._id))
    .mergeMap(userMongo => {
      return UserDA.removeUserKeycloak$(userMongo.auth.userKeycloakId)   
      .catch(error => {
        return UserValidatorHelper.checkIfUserWasDeletedOnKeycloak$(userMongo.auth.userKeycloakId);
      })
      .mergeMap(userKeycloak => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "UserAuthDeleted",
            eventTypeVersion: 1,
            aggregateType: "User",
            aggregateId: userMongo._id,
            data: {
              userKeycloakId: userMongo.auth.userKeycloak,
              username: userMongo.auth.username
            },
            user: authToken.preferred_username
          })
        );
      })
    })
    .map(result => {
      return {
        code: 200,
        message: `User auth of the user with id: ${data.args.userId} has been deleted`
      };
    })
    .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
    .catch(err => this.handleError$(err));
  }

  /**
   * Reset the user passowrd
   *
   * @param {*} data args that contain the user ID
   * @param {string} jwt JWT token
   */
  resetUserPassword$(data, authToken) {
    //Checks if the user that is performing this actions has the needed role to execute the operation.
    return UserValidatorHelper.validatePasswordReset$(data, authToken)
      .mergeMap(user => {
        return UserDA.resetUserPasswordKeycloak$(user.userKeycloakId, user.password)
        .mergeMap(() => {
          return eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "UserAuthPasswordUpdated",
              eventTypeVersion: 1,
              aggregateType: "User",
              aggregateId: user._id,
              data: {},
              user: authToken.preferred_username
            })
          );
        })
      })
      .map(result => {
        return {
          code: 200,
          message: `Password of the user with id: ${data.args.userId} has been changed`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  //#region  mappers for API responses

  handleError$(err) {
    console.log('handleError$ ==> ', err);
    return Rx.Observable.of(err).map(err => {
      const exception = { data: null, result: {} };
      const isCustomError = err instanceof CustomError;
      if (!isCustomError) {
        err = new DefaultError(err);
      }
      exception.result = {
        code: err.code,
        error: { ...err.getContent() }
      };
      return exception;
    });
  }

  buildSuccessResponse$(rawRespponse) {
    return Rx.Observable.of(rawRespponse).map(resp => {
      return {
        data: resp,
        result: {
          code: 200
        }
      };
    });
  }

  //#endregion
}
/**
 * @returns {User}
 */
module.exports = () => {
  if (!instance) {
    instance = new User();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
