"use strict";

const Rx = require("rxjs");
const KeycloakDA = require("./KeycloakDA").singleton();

class TokenDA {

  /**
   * Gets token to make operations that require authentication. 
   * If the refresh token is passed as a parameter, we'll try to refresh the access token; 
   * otherwise, we will generate a new access token with the user and password.
   * 
   * @param {*} username Username
   * @param {*} password Password
   * @param {*} refreshToken Token used to refresh the access token
   */
  static getToken$(username, password, refreshToken) {

    // realmName: process.env.KEYCLOAK_BACKEND_REALM_NAME,
    // baseUrl: process.env.KEYCLOAK_BACKEND_BASE_URL,
    // username: process.env.KEYCLOAK_BACKEND_USER, 
    // password: process.env.KEYCLOAK_BACKEND_PASSWORD,
    // grant_type: 'password',
    // client_id: process.env.KEYCLOAK_BACKEND_CLIENT_ID,

    const isRefreshToken = refreshToken != undefined;

    const settings = {
      client_id: process.env.KEYCLOAK_CLIENT_ID || 'emi',
      realmName: process.env.KEYCLOAK_BACKEND_REALM_NAME,
      grant_type: isRefreshToken ? 'refresh_token': 'password'
    };

    if(isRefreshToken){
      settings.refresh_token = refreshToken;
    } else {
      settings.username = username;
      settings.password = password;
    }

    //Gets all of the user roles registered on the Keycloak realm
    return Rx.Observable.defer(() => KeycloakDA.keycloakClient.token.getToken(process.env.KEYCLOAK_BACKEND_BASE_URL, settings))
        .map(token => {
          
          const result = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in,
            refreshExpiresIn: token.refresh_expires_in
          };
          return result;
        })
  }
}

module.exports = TokenDA;
