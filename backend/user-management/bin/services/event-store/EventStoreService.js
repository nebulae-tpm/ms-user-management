"use strict";
const Rx = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const userEventConsumer = require("../../domain/UserEventConsumer")();

/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-user-management_mbe_user-management";

class EventStoreService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
    this.aggregateEventsArray = this.generateAggregateEventsArray();
  }

  /**
   * Starts listening to the EventStore
   * Returns observable that resolves to each subscribe agregate/event
   *    emit value: { aggregateType, eventType, handlerName}
   */
  start$() {
    //default error handler
    const onErrorHandler = error => {
      console.error("Error handling  EventStore incoming event: ", error);
      process.exit(1);
    };
    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("EventStore incoming event subscription completed");
    };
    console.log("EventStoreService starting ...");

    return Rx.Observable.from(this.aggregateEventsArray)
      .map(aggregateEvent => { return { ...aggregateEvent, onErrorHandler, onCompleteHandler } })
      .map(params => this.subscribeEventHandler(params));
  }

  /**
   * Stops listening to the Event store
   * Returns observable that resolves to each unsubscribed subscription as string
   */
  stop$() {
    return Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

  /**
     * Create a subscrition to the event store and returns the subscription info     
     * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
     * @return { aggregateType, eventType, handlerName  }
     */
  subscribeEventHandler({ aggregateType, eventType, onErrorHandler, onCompleteHandler }) {
    const handler = this.functionMap[eventType];
    const subscription =
      //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
      eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType)
        .mergeMap(() => eventSourcing.eventStore.getEventListener$(aggregateType, mbeKey, false))
        .filter(evt => evt.et === eventType)
        .mergeMap(evt => Rx.Observable.concat(
          handler.fn.call(handler.obj, evt),
          //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
          eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        ))
        .subscribe(
          (evt) => {
            // console.log(`EventStoreService: ${eventType} process: ${evt}`);
          },
          onErrorHandler,
          onCompleteHandler
        );
    this.subscriptions.push({ aggregateType, eventType, handlerName: handler.fn.name, subscription });
    return { aggregateType, eventType, handlerName: `${handler.obj.name}.${handler.fn.name}` };
  }

  /**
  * Starts listening to the EventStore
  * Returns observable that resolves to each subscribe agregate/event
  *    emit value: { aggregateType, eventType, handlerName}
  */
  syncState$() {
    return Rx.Observable.from(this.aggregateEventsArray)
      .concatMap(params => this.subscribeEventRetrieval$(params))
  }


  /**
   * Create a subscrition to the event store and returns the subscription info     
   * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
   * @return { aggregateType, eventType, handlerName  }
   */
  subscribeEventRetrieval$({ aggregateType, eventType }) {
    const handler = this.functionMap[eventType];
    //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
    return eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType)
      .switchMap(() => eventSourcing.eventStore.retrieveUnacknowledgedEvents$(aggregateType, mbeKey))
      .filter(evt => evt.et === eventType)
      .concatMap(evt => Rx.Observable.concat(
        handler.fn.call(handler.obj, evt),
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey)
      ));
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW     //////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  generateFunctionMap() {
    return {
      UserCreated:{
        fn: userEventConsumer.handleUserCreated$,
        obj: userEventConsumer 
      },
      UserGeneralInfoUpdated:{
        fn: userEventConsumer.handleUserGeneralInfoUpdated$,
        obj: userEventConsumer 
      },
      UserActivated:{
        fn: userEventConsumer.handleUserState$,
        obj: userEventConsumer 
      },
      UserDeactivated:{
        fn: userEventConsumer.handleUserState$,
        obj: userEventConsumer 
      },
      UserRolesAdded:{
        fn: userEventConsumer.handleUserRolesAdded$,
        obj: userEventConsumer 
      },
      UserRolesRemoved:{
        fn: userEventConsumer.handleUserRolesRemoved$,
        obj: userEventConsumer 
      },
      UserAuthCreated: {
        fn: userEventConsumer.handleUserAuthCreated$,
        obj: userEventConsumer 
      },
    };
  }

  /**
  * Generates a map that assocs each AggretateType withs its events
  */
  generateAggregateEventsArray() {
    return [
      {
        aggregateType: "User",
        eventType: "UserCreated"
      },
      {
        aggregateType: "User",
        eventType: "UserGeneralInfoUpdated"
      },
      {
        aggregateType: "User",
        eventType: "UserAuthCreated"
      },
      {
        aggregateType: "User",
        eventType: "UserActivated"
      },
      {
        aggregateType: "User",
        eventType: "UserDeactivated"
      },
      {
        aggregateType: "User",
        eventType: "UserRolesAdded"
      },
      {
        aggregateType: "User",
        eventType: "UserRolesRemoved"
      },

      // {
      //   aggregateType: "User",
      //   eventType: "UserPasswordChanged"
      // },
      // {
      //   aggregateType: "User",
      //   eventType: "UserRoleChanged"
      // },
    ]
  }
}



module.exports = () => {
  if (!instance) {
    instance = new EventStoreService();
    console.log("NEW  EventStore instance  !!");
  }
  return instance;
};

