const UserKeycloakDA = require("../data/UserKeycloakDA");
const Rx = require("rxjs");
const RoleValidator = require("../tools/RoleValidator");
const { CustomError, DefaultError } = require("../tools/customError");
const {
  USER_MISSING_DATA_ERROR_CODE,
  USER_NAME_ALREADY_USED_CODE,
  EMAIL_ALREADY_USED_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE,
  INVALID_USERNAME_FORMAT_ERROR_CODE,
  MISSING_BUSINESS_ERROR_CODE,
  USER_UPDATE_OWN_INFO_ERROR_CODE,
  USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE
} = require("../tools/ErrorCodes");
const context = "UserManagement";
const userNameRegex = /^[a-zA-Z0-9._-]{8,}$/;

class UserValidatorHelper {
  //Validates if the user can be created checking if the info
  // is valid and the username and email have not been used
  static validateUserCreation$(data, authToken) {
    const method = "createUser$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const user = !data.args ? undefined : data.args.input;
          const businessId = !data.args
            ? undefined
            : data.args.businessId.trim();
          //Validate if required parameters were sent
          const invalidUserMissingData =
            !user ||
            !user.username ||
            !user.name ||
            !user.lastname ||
            user.username.trim().length == 0;
          //Evaluate if the username has a valid format
          const invalidUserNameFormat =
            !user ||
            !user.username ||
            !user.username.trim().match(userNameRegex);

          if (invalidUserMissingData || invalidUserNameFormat) {
            return this.createCustomError$(
              invalidUserMissingData
                ? USER_MISSING_DATA_ERROR_CODE
                : INVALID_USERNAME_FORMAT_ERROR_CODE,
              method
            );
          }

          //If the business ID to which the user belongs is not indicated, we must throw an error indicating the problem.
          if (!businessId || businessId == "") {
            return this.createCustomError$(MISSING_BUSINESS_ERROR_CODE, method);
          }

          //If the user that is performing the operation is not PLATFORM-ADMIN or platfrom-admin,
          // we must check that the business id match with the id of the token
          if (!roles["PLATFORM-ADMIN"]) {
            if (businessId != authToken.businessId) {
              return this.createCustomError$(
                USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
                method
              );
            }
          }

          user.businessId = businessId;
          user.username = user.username.trim();

          return Rx.Observable.of(user);
        })
        //Checks if the username already was used
        .mergeMap(user => {
          return this.checkUserExists$(user, user.username, null, method);
        })
        //Checks if the email already was used
        .mergeMap(user => {
          return this.checkUserExists$(user, null, user.email, method);
        })
    );
  }

  //Validates if the user can be updated checking if the info
  // is valid and the username and email have not been used
  static validateUpdateUser$(data, authToken) {
    const method = "updateUserGeneralInfo$() -> ";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const user = {
            generalInfo: !data.args ? undefined : data.args.input,
            id: !data.args ? undefined : data.args.userId
          };
          const businessId = !data.args
            ? undefined
            : data.args.businessId.trim();

          if (
            !user.id ||
            !user.generalInfo ||
            !user.generalInfo.name ||
            !user.generalInfo.lastname
          ) {
            return this.createCustomError$(
              USER_MISSING_DATA_ERROR_CODE,
              method
            );
          }

          //If the business ID to which the user belongs is not indicated, we must throw an error indicating the problem.
          if (!businessId || businessId == "") {
            return this.createCustomError$(MISSING_BUSINESS_ERROR_CODE, method);
          }

          //If the user that is performing the operation is not PLATFORM-ADMIN,
          // we must check that the business id match with the id of the token
          console.log("Roles ======> ", roles);
          if (!roles["PLATFORM-ADMIN"]) {
            if (businessId != authToken.businessId) {
              return this.createCustomError$(
                USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
                method
              );
            }
          }

          user.businessId = businessId;
          return Rx.Observable.of(user);
        })
        //Checks if the user that is being updated exists on the same business of the user that is performing the operation
        .mergeMap(user => {
          return this.checkIfUserBelongsToTheSameBusiness$(user, method);
        })
        .mergeMap(user =>
          this.checkIfUserIsTheSameUserLogged$(user, authToken, method)
        )
        //Checks if the new email is already used by other user
        .mergeMap(user => {
          return UserKeycloakDA.getUser$(
            null,
            user.generalInfo.email,
            null
          ).mergeMap(userEmailFound => {
            if (userEmailFound && user.id != userEmailFound.id) {
              return this.createCustomError$(
                EMAIL_ALREADY_USED_ERROR_CODE,
                method
              );
            }
            return Rx.Observable.of(user);
          });
        })
    );
  }

  //Validates if the user can update its state
  static validateUpdateUserState$(data, authToken) {
    const method = "updateUserState$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)

        .mergeMap(roles => {
          const user = {
            id: !data.args ? undefined : data.args.userId,
            state: !data.args ? undefined : data.args.state
          };
          const businessId = !data.args
            ? undefined
            : data.args.businessId.trim();
          if (!user.id || user.state == null) {
            return this.createCustomError$(
              USER_MISSING_DATA_ERROR_CODE,
              method
            );
          }

          //If the business ID to which the user belongs is not indicated, we must throw an error indicating the problem.
          if (!businessId || businessId == "") {
            return this.createCustomError$(MISSING_BUSINESS_ERROR_CODE, method);
          }

          //Only user with PLATFORM-ADMIN role can update user that belongs to another businesses
          if (!roles["PLATFORM-ADMIN"]) {
            if (businessId != authToken.businessId) {
              return this.createCustomError$(
                USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
                method
              );
            }
          }

          user.businessId = businessId;
          return Rx.Observable.of(user);
        })
        //Checks if the user that is being updated exists on the same business of the user that is performing the operation
        .mergeMap(user => {
          return this.checkIfUserBelongsToTheSameBusiness$(user, method);
        })
    );
  }

  static checkBusiness(args, roles, authToken) {
    //If the business ID to which the user belongs is not indicated, we must throw an error indicating the problem.
    if (!args.businessId || args.businessId.trim() == "") {
      return this.createCustomError$(MISSING_BUSINESS_ERROR_CODE, 'Debe indicar la unidad de negocio del usuario');
    }

    //Only user with PLATFORM-ADMIN role can update user that belongs to another businesses
    if (!roles["PLATFORM-ADMIN"]) {
      if (args.businessId.trim() != authToken.businessId) {
        return this.createCustomError$(
          USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
          'Debe indicar la unidad de negocio del usuario'
        );
      }
    }   
    
  }

  //Validates if the user can resset its password
  static validatePasswordReset$(data, authToken) {
    const method = "resetUserPassword$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const userPassword = !data.args ? undefined : data.args.input;

          const user = {
            id: !data.args ? undefined : data.args.userId,
            password: {
              temporary: userPassword.temporary || false,
              value: userPassword.password
            },
            businessId: !data.args ? undefined : (data.args.businessId ? data.args.businessId.trim(): undefined)
          };

          if (!user.id || !userPassword || !userPassword.password) {
            return this.createCustomError$(
              USER_MISSING_DATA_ERROR_CODE,
              method
            );
          }

          this.checkBusiness(user, roles, authToken);
          console.log("resetPassword => ", user);

          return Rx.Observable.of(user);
        })
        .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))
        //Checks if the user that is being updated exists on the same business of the user that is performing the operation
        .mergeMap(user => {
          return this.checkIfUserBelongsToTheSameBusiness$(
            user,
            authToken,
            method
          );
        })
    );
  }

  //Validates if info to update the roles of an user
  static validateUserRoles$(data, authToken) {
    const method = "addRolesToTheUser$() | removeRolesFromUser$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const user = {
            id: !data.args ? undefined : data.args.userId,
            userRoles: !data.args ? undefined : data.args.input,
            businessId: !data.args ? undefined : (data.args.businessId ? data.args.businessId.trim(): undefined)
          };
          if (!user.id || !user.userRoles) {
            return this.createCustomError$(
              USER_MISSING_DATA_ERROR_CODE,
              method
            );
          }

          this.checkBusiness(user, roles, authToken);
          console.log("validateUserRoles => ", user);

          return Rx.Observable.of(user);
        })
        .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))
        //Checks if the user that is being updated exists on the same business of the user that is performing the operation
        .mergeMap(user => {
          return this.checkIfUserBelongsToTheSameBusiness$(
            user,
            authToken,
            method
          );
        })
    );
  }

  /**
   * Checks if the user that is performing the operation is the same user that is going to be updated.
   * @param {*} user
   * @param {*} authToken
   * @returns error if its trying to update its user
   */
  static checkIfUserIsTheSameUserLogged$(user, authToken, method) {
    if (user.id == authToken.sub) {
      return this.createCustomError$(USER_UPDATE_OWN_INFO_ERROR_CODE, method);
    }
    return Rx.Observable.of(user);
  }

  /**
   * Checks if the user belongs to the same business of the user that is performing the operation
   * @param {*} userId User ID
   */
  static checkIfUserBelongsToTheSameBusiness$(user, method) {
    return UserKeycloakDA.getUserByUserId$(user.id).mergeMap(userFound => {
      if (userFound && userFound.businessId != user.businessId) {
        return this.createCustomError$(
          USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
          method
        );
      }
      return Rx.Observable.of(user);
    });
  }

  /**
   * Checks if the user that is performing the operation has the needed permissions to execute the operation
   * @param {*} authToken Token of the user
   * @param {*} context Name of the microservice
   * @param {*} method Method where the verification is being done
   */
  static checkRole$(authToken, method) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      context,
      method,
      PERMISSION_DENIED_ERROR_CODE.code,
      PERMISSION_DENIED_ERROR_CODE.description,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    );
  }

  /**
   * Checks if the user exists according to the username or email
   * @param {*} user User data
   * @param {*} username Username to check
   * @param {*} email Email to check
   */
  static checkUserExists$(user, username, email, method) {
    console.log('checkUserExists => ', username, email);
    return UserKeycloakDA.getUser$(username, email, null).mergeMap(
      userUsernameFound => {
        console.log('userUsernameFound => ', userUsernameFound);
        if (userUsernameFound && username) {
          return this.createCustomError$(USER_NAME_ALREADY_USED_CODE, method);
        }else if(userUsernameFound){
          return this.createCustomError$(EMAIL_ALREADY_USED_ERROR_CODE, method);
        }
        return Rx.Observable.of(user);
      }
    );
  }

  /**
   * Creates a custom error observable
   * @param {*} errorCode Error code
   * @param {*} methodError Method where the error was generated
   */
  static createCustomError$(errorCode, methodError) {
    return Rx.Observable.throw(
      new CustomError(
        context,
        methodError || "",
        errorCode.code,
        errorCode.description
      )
    );
  }
}

module.exports = UserValidatorHelper;
