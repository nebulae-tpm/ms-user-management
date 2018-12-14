"use strict";

const Rx = require("rxjs");
const UserKeycloakDA = require("../data/UserKeycloakDA");
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

    return UserKeycloakDA.getUsers$(0, 1, undefined, user.businessId, undefined, undefined)
    .mergeMap(users => {
      console.log('Amount users => ', users);
      
      return UserKeycloakDA.createUser$(user)
      .mergeMap(user=>{
        //If this is the first user of a business, the user must be preconfigured with the roles specified in the envirment variable and a random password
        if(users.length == 0){
          const ROLE_FIRST_USER_ASSIGN = JSON.parse(process.env.ROLE_FIRST_USER_ASSIGN);
          return UserKeycloakDA.getRolesKeycloak$()
          .mergeMap(roles => {

            const rolesToAdd = roles.map(role => {
              return {
                id: role.id,
                name: role.name
              }
            }).filter(role => ROLE_FIRST_USER_ASSIGN.roles.includes(role.name));

            const randomPassword = {
              temporary: true,
              value: (Math.floor(Math.random()*90000000) + 10000000)+''
            };

            console.log('randomPassword => ', randomPassword);

            //Adds default roles and temporal password
            return Rx.Observable.forkJoin(
              UserKeycloakDA.addRolesToTheUser$(user.id, rolesToAdd),
              UserKeycloakDA.resetUserPassword$(user.id, randomPassword)  
            ).mapTo(user)

            //return UserKeycloakDA.addRolesToTheUser$(user.id, rolesToAdd).mapTo(user)
          })
        }
        return Rx.Observable.of(user);
      });
    })
    .mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserKeycloakDA.getUserByUserId$(user.id)
      );
    });
  }

  /**
   * updates the user general info on the materialized view according to the received data from the event store.
   * @param {*} userAttributesUpdatedEvent user general info updated event
   */
  handleUserGeneralInfoUpdated$(userGeneralInfoUpdatedEvent) {
    const userGeneralInfo = userGeneralInfoUpdatedEvent.data;
    return UserKeycloakDA.updateUserGeneralInfo$(
      userGeneralInfo.id,
      userGeneralInfo
    ).mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserKeycloakDA.getUserByUserId$(userGeneralInfo.id)
      );
    });
  }

    /**
   * updates the user state on the materialized view according to the received data from the event store.
   * @param {*} userState events that indicates the new state of the user
   */
  handleUserState$(userStateEvent) {
    const userState = userStateEvent.data;
    return UserKeycloakDA.updateUserState$(
      userState.id,
      userState.state
    )
    .mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserKeycloakDA.getUserByUserId$(userState.id)
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
    return UserKeycloakDA.updateUserPassword$(
      userPasswordChangedEvent.aid,
      userPassowrd
    ).mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserKeycloakDA.getUserByUserId$(userPasswordChangedEvent.aid)
      );
    });
  }


/**
 * Adds the specified roles to the user
 * @param {*} userRolesAddedEvent 
 */
  handleUserRolesAdded$(userRolesAddedEvent) {
    const data = userRolesAddedEvent.data;
    return UserKeycloakDA.addRolesToTheUser$(
      userRolesAddedEvent.aid,
      data.userRoles.roles
    ).mergeMap(result => {
      return broker.send$(
        MATERIALIZED_VIEW_TOPIC,
        `UserUpdatedSubscription`,
        UserKeycloakDA.getUserByUserId$(userRolesAddedEvent.aid)
      );
    });
  }

/**
 * Removes the specified roles to the user
 * @param {*} userRolesAddedEvent 
 */
handleUserRolesRemoved$(userRolesRemovedEvent) {
  const data = userRolesRemovedEvent.data;
  return UserKeycloakDA.removeRolesFromUser$(
    userRolesRemovedEvent.aid,
    data.userRoles.roles
  ).mergeMap(result => {
    return broker.send$(
      MATERIALIZED_VIEW_TOPIC,
      `UserUpdatedSubscription`,
      UserKeycloakDA.getUserByUserId$(userRolesRemovedEvent.aid)
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
