'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const KeycloakDA = require('./data/KeycloakDA').singleton();
const emiGatewayGraphQlService = require('./services/emi-gateway/GraphQlService')();
const salesGatewayGraphQlService = require('./services/sales-gateway/GraphQlService')();
const Rx = require('rxjs');

const start = () => {
    Rx.Observable.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        emiGatewayGraphQlService.start$(),
        salesGatewayGraphQlService.start$(),
        KeycloakDA.checkKeycloakToken$()
    ).subscribe(
        (evt) => {
            //console.log('Subscribe =========>' , evt)
        },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('user-management started')
    );
};

start();



