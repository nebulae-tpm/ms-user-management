"use strict";

const user = require("../../domain/User")();
const broker = require("../../tools/broker/BrokerFactory")();
const Rx = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

let instance;

class GraphQlService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
    return Rx.Observable.from(this.getSubscriptionDescriptors()).map(params =>
      this.subscribeEventHandler(params)
    );
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType])
      .mergeMap(message => this.verifyRequest$(message))
      .mergeMap(request => (request.failedValidations.length > 0)
        ? Rx.Observable.of(request.errorResponse)
        : Rx.Observable.of(request)
          //ROUTE MESSAGE TO RESOLVER
          .mergeMap(({ authToken, message }) =>
            handler.fn
              .call(handler.obj, message.data, authToken)
              .map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
          )
      )
      .mergeMap(msg => this.sendResponseBack$(msg))
      .subscribe(
        msg => {
          // console.log(`GraphQlService: ${messageType} process: ${msg}`);
        },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  /**
* send response back if neccesary
* @param {any} msg Object with data necessary  to send response
*/
  sendResponseBack$(msg) {
    return Rx.Observable.of(msg)
      .mergeMap(({ response, correlationId, replyTo }) =>
        replyTo
          ? broker.send$(replyTo, "emigateway.graphql.Query.response", response, { correlationId })
          : Rx.Observable.of(undefined)
      )
  }

  /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return Rx.Observable.of(request)
      //decode and verify the jwt token
      .mergeMap(message =>
        Rx.Observable.of(message)
          .map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] }))
          .catch(err =>
            user.handleError$(err)
              .map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT'] 
              }
              ))
          )
      );
  }

  stop$() {
    Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    //default on error handler
    const onErrorHandler = error => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };
    console.log("EMI GraphQl Service starting ...");

    return [
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.createUser",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.updateUserGeneralInfo",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.updateUserState",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.resetUserPassword",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.addRolesToTheUser",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.mutation.removeRolesFromUser",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.query.getUsers",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.query.getUser",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.query.getUserCount",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.query.getRoles",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "User",
        messageType: "emigateway.graphql.query.getUserRoleMapping",
        onErrorHandler,
        onCompleteHandler
      },
    ];
  }

  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    return {
      "emigateway.graphql.mutation.createUser": {
        fn: user.createUser$,
        obj: user
      },
      "emigateway.graphql.mutation.updateUserGeneralInfo": {
        fn: user.updateUserGeneralInfo$,
        obj: user
      },
      "emigateway.graphql.mutation.updateUserState": {
        fn: user.updateUserState$,
        obj: user
      },
      'emigateway.graphql.mutation.resetUserPassword': {
        fn: user.resetUserPassword$,
        obj: user
      },
      'emigateway.graphql.mutation.addRolesToTheUser': {
        fn: user.addRolesToTheUser$,
        obj: user
      },
      'emigateway.graphql.mutation.removeRolesFromUser': {
        fn: user.removeRolesFromUser$,
        obj: user
      },
      'emigateway.graphql.query.getUserCount': {
        fn: user.getUserCount$,
        obj: user
      },
      'emigateway.graphql.query.getUsers': {
        fn: user.getUsers$,
        obj: user
      },
      'emigateway.graphql.query.getUser': {
        fn: user.getUser$,
        obj: user
      },
      'emigateway.graphql.query.getRoles': {
        fn: user.getRoles$,
        obj: user
      },
      'emigateway.graphql.query.getUserRoleMapping': {
        fn: user.getUserRoleMapping$,
        obj: user
      }
    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
