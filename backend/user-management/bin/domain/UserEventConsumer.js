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
      console.log('Create user => ', user);
      return UserDA.createUser$(user)
      // .mergeMap(user=>{
      //   //If this is the first user of a business, the user must be preconfigured with the roles specified in the envirment variable and a random password
      //   if(users.length == 0){
      //     const ROLE_FIRST_USER_ASSIGN = JSON.parse(process.env.ROLE_FIRST_USER_ASSIGN);
      //     return UserDA.getRolesKeycloak$()
      //     .mergeMap(roles => {
      //       const rolesToAdd = roles.map(role => {
      //         return {
      //           id: role.id,
      //           name: role.name
      //         }
      //       }).filter(role => ROLE_FIRST_USER_ASSIGN.roles.includes(role.name));

      //       const randomPassword = {
      //         temporary: true,
      //         value: (Math.floor(Math.random()*90000000) + 10000000)+''
      //       };

      //       console.log('randomPassword => ', randomPassword);

      //       //Adds default roles and temporal password
      //       return Rx.Observable.forkJoin(
      //         UserDA.addRolesToTheUser$(user.id, rolesToAdd),
      //         UserDA.resetUserPassword$(user.id, randomPassword)  
      //       ).mapTo(user)

      //       //return UserDA.addRolesToTheUser$(user.id, rolesToAdd).mapTo(user)
      //     })
      //   }
      //   return Rx.Observable.of(user);
      // });
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
    console.log('handleUserGeneralInfoUpdated => ', userGeneralInfoUpdatedEvent);
    const userGeneralInfo = userGeneralInfoUpdatedEvent.data;
    return UserDA.updateUserGeneralInfo$(
      userGeneralInfo._id,
      userGeneralInfo.generalInfo
    ).mergeMap(result => {
      console.log('update result => ', result);
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
  console.log('handleUserAuthCreated => ', userAuthCreatedEvent);
   return UserDA.updateUserAuthMongo$(
    userAuthCreatedEvent.aid,
    userAuthCreatedEvent.data
   )
   .mergeMap(result => {
     console.log('result => ', result);
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
    return UserDA.getRolesKeycloak$(user.userRoles.roles)
    .mergeMap(rolesKeycloak => UserDA.getUserById$(user._id).map(userMongo => [rolesKeycloak, userMongo]))
    .mergeMap(([rolesKeycloak, userMongo]) => UserDA.addRolesToTheUser$(userMongo._id, userMongo.auth.userKeycloakId, rolesKeycloak))
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
  const data = userRolesRemovedEvent.data;
  return UserDA.removeRolesFromUser$(
    userRolesRemovedEvent.aid,
    data.userRoles.roles
  ).mergeMap(result => {
    return broker.send$(
      MATERIALIZED_VIEW_TOPIC,
      `UserUpdatedSubscription`,
      UserDA.getUserByUserId$(userRolesRemovedEvent.aid)
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
