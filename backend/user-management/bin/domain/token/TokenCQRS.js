const Rx = require("rxjs");
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const TokenDA = require("../../data/TokenDA");
//  const RoleValidator = require("../../tools/RoleValidator");
const { CustomError, DefaultError } = require("../../tools/customError");
const {
  PERMISSION_DENIED_ERROR_CODE,
  INTERNAL_SERVER_ERROR_CODE,
  INVALID_USER__OR_TOKEN_ERROR_CODE
} = require("../../tools/ErrorCodes");
const context = "User-management"

let instance;

class TokenCQRS {
  constructor() { }
  
  /**
   * Gets token to make operations that require authentication. 
   * If the refresh token is passed as a parameter, we'll try to refresh the access token; 
   * otherwise, we will generate a new access token with the user and password.
   *
   * @param args args
   * @param args.username username
   * @param args.password password
   * @param args.refreshToken Token to refresh the access token
   */
  getToken$({ args }, authToken) {
    return Rx.Observable.of(args)
      .mergeMap(({username, password, refreshToken}) => {
        return TokenDA.getToken$(username, password, refreshToken)
      })      
      .catch(err => {
        if(err.error == 'invalid_grant'){
          return this.createCustomError$(
            INVALID_USER__OR_TOKEN_ERROR_CODE,
            'getToken'
          );
        }else{
          const error = new Error();
          error.name = "Error";
          error.message =  {"code":INTERNAL_SERVER_ERROR_CODE.code,"name":"Token","msg": `error: ${err.error} - ${err.error_description}`};
          return Rx.Observable.throw(error);
        }
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  //#region  mappers for API responses
  
  /**
   * Creates a custom error observable
   * @param {*} errorCode Error code
   * @param {*} methodError Method where the error was generated
   */
  createCustomError$(errorCode, methodError) {
    return Rx.Observable.throw(
      new CustomError(
        context,
        methodError || "",
        errorCode.code,
        errorCode.description
      )
    );
  }

  handleError$(err) {
    console.log('Handle error => ', err);
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

  /**
   * 
   * @param {*} rawRespponse 
   * @returns {Observable}
   */
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

}

/**
 * Token event consumer
 * @returns {TokenCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new TokenCQRS();
    console.log("TokenCQRS Singleton created ");
  }
  return instance;
};
