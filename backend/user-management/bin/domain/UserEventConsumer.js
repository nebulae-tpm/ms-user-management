"use strict";

const Rx = require("rxjs");
const UserDA = require("../data/UserDA");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {}


  /**
   * Persists the user on the materialized view according to the received data from the event store.
   * @param {*} userCreatedEvent User created event
   */
  handleUserCreated$(userCreatedEvent) {
    const user = userCreatedEvent.data;
    return UserDA.getUsers$(0, 1, undefined, user.businessId)
    //First user of a business must be created with the preconfigured roles 
    .mergeMap(users => {
      if(users.length == 0){
        const ROLE_FIRST_USER_ASSIGN = JSON.parse(process.env.ROLE_FIRST_USER_ASSIGN);
        user.roles = ROLE_FIRST_USER_ASSIGN ? ROLE_FIRST_USER_ASSIGN.roles: [];    
      }            
      return Rx.Observable.of(user);          
    })
    .mergeMap(user => {
      return UserDA.createUser$(user)
    })
    .mergeMap(result => {
      return broker.send$(MATERIALIZED_VIEW_TOPIC, `UserUpdatedSubscription`, result.ops[0]);
    });
  }

  /**
   * updates the user general info on the materialized view according to the received data from the event store.
   * @param {*} userAttributesUpdatedEvent user general info updated event
   */
  handleUserGeneralInfoUpdated$(userGeneralInfoUpdatedEvent) {
    const userGeneralInfo = userGeneralInfoUpdatedEvent.data;
    return UserDA.updateUserGeneralInfo$(
      userGeneralInfo._id,
      userGeneralInfo.generalInfo
    ).mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserDA.getUserByUserId$(userGeneralInfo.id)
      );
    });
  }

  /**
  * updates the user state on the materialized view according to the received data from the event store.
  * @param {*} userAuthCreatedEvent events that indicates the new state of the user
  */
 handleUserAuthCreated$(userAuthCreatedEvent) {
   return UserDA.updateUserAuthMongo$(
    userAuthCreatedEvent.aid,
    userAuthCreatedEvent.data
   )
   .mergeMap(result => {
     return broker.send$(
       MATERIALIZED_VIEW_TOPIC,
       `UserUpdatedSubscription`,
       result
     );
   })
   ;
 }

   /**
  * Removes the user auth on the materialized view.
  * @param {*} userAuthDeletedEvent events that indicates the user to which the auth credentials will be deleted
  */
 handleUserAuthDeleted$(userAuthDeletedEvent) {
   return UserDA.removeUserAuthMongo$(
    userAuthDeletedEvent.aid,
    userAuthDeletedEvent.data
   )
   .mergeMap(result => {
     return broker.send$(
       MATERIALIZED_VIEW_TOPIC,
       `UserUpdatedSubscription`,
       result
     );
   })
   ;
 }

    /**
   * updates the user state on the materialized view according to the received data from the event store.
   * @param {*} userState events that indicates the new state of the user
   */
  handleUserState$(userStateEvent) {
    const userState = userStateEvent.data;
    return UserDA.updateUserState$(
      userState._id,
      userState.state
    )
    .mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserDA.getUserByUserId$(userState.id)
      );
    })
    ;
  }

  /**
   * updates the user password on the materialized view according to the received data from the event store.
   * @param {*} userAttributesUpdatedEvent user attributes updated event
   */
  handleUserPasswordChanged$(userPasswordChangedEvent) {
    const userPassword = userPasswordChangedEvent.data;
    return UserDA.updateUserPassword$(
      userPasswordChangedEvent.aid,
      userPassowrd
    ).mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserDA.getUserByUserId$(userPasswordChangedEvent.aid)
      );
    });
  }


/**
 * Adds the specified roles to the user
 * @param {*} userRolesAddedEvent 
 */
  handleUserRolesAdded$(userRolesAddedEvent) {
    const user = userRolesAddedEvent.data;
    return Rx.Observable.of(user)
    .mergeMap(user => UserDA.getUserById$(user._id))
    .mergeMap(userMongo => UserDA.addRolesToTheUser$(userMongo, user.userRoles.roles))
    .mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        result
      );
    });
  }

/**
 * Removes the specified roles to the user
 * @param {*} userRolesAddedEvent 
 */
handleUserRolesRemoved$(userRolesRemovedEvent) {
  const user = userRolesRemovedEvent.data;

  return UserDA.getRolesKeycloak$(user.userRoles.roles)
  .mergeMap(rolesKeycloak => UserDA.getUserById$(user._id).map(userMongo => [rolesKeycloak, userMongo]))
  .mergeMap(([rolesKeycloak, userMongo]) => UserDA.removeRolesFromUser$(userMongo._id, (userMongo.auth || {}).userKeycloakId, rolesKeycloak))
  .mergeMap(result => {
    return broker.send$(
      MATERIALIZED_VIEW_TOPIC,
      `UserUpdatedSubscription`,
      result
    );
  });
}

  
}

module.exports = () => {
  if (!instance) {
    instance = new UserEventConsumer();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
