/*

Apache 2.0 License

Copyright(c) 2018 - 2022 Chris Love

*/

( function () {

    "use strict";

    //push key
    var applicationServerPublicKey = "BOEjZtDuk1Y2gH6P_fjqoWzMynscp-4GF9nKQxqzcnFmcyHnUo3AgMEgRs3ge7FcLwROOoT8pMJ9wQt8AYxVdS8";

    var swRegistration;

    navigator.serviceWorker.getRegistration()
        .then( function ( registration ) {

            if ( registration ) {

                swRegistration = registration;

            }
        } );

    var pushMgr = {

        _isSubscribed: false,
        subscription: undefined,

        askPermission: function () {

            return Notification.requestPermission()
                .then( function ( permissionResult ) {
                    if ( permissionResult !== "granted" ) {
                        return false;
                    } else {
                        return true;
                    }
                } );

        },

        updateSubscriptionOnServer: function ( subscription ) {
            // TODO: Send subscription to application server

            console.log( "user subscription state set ", !!subscription );

            console.log( "Received PushSubscription: ", JSON.stringify( subscription ) );

            return !!subscription;
        },

        getSubscription: function () {

            if ( swRegistration ) {

                return swRegistration.pushManager.getSubscription();

            } else {
                return Promise.resolve();
            }

        },

        getIsSubscribed: function () {

            var self = this;

            if ( Notification.permission === "default" ) {

                return Promise.resolve( false );

            }

            if ( self._isSubscribed && self.subscription ) {
                return Promise.resolve( self._isSubscribed );
            }

            return self.getSubscription()
                .then( function ( subscription ) {

                    console.log( "subscription" );
                    console.log( subscription );

                    if ( subscription ) {

                        self.subscription = subscription;

                        self._isSubscribed = ( subscription );

                    } else {

                        self._isSubscribed = false;
                    }

                    return self._isSubscribed;

                } );

        },

        initialisePush: function () {
            // Set the initial subscription value

            var self = this;

            if ( swRegistration ) {

                return self.getSubscription()
                    .then( function ( subscription ) {

                        console.log( "subscription" );
                        console.log( subscription );

                        if ( !subscription ) {
                            return self.subscribeUser();
                        }

                    } );

            }

        },

        urlB64ToUint8Array: function ( base64String ) {
            //assume const support if push is supported ;)
            var padding = "=".repeat( ( 4 - base64String.length % 4 ) % 4 ),
                base64 = ( base64String + padding )
                .replace( /\-/g, "+" )
                .replace( /_/g, "/" ),

                rawData = window.atob( base64 ),
                outputArray = new Uint8Array( rawData.length );

            for ( var i = 0; i < rawData.length; ++i ) {
                outputArray[ i ] = rawData.charCodeAt( i );
            }

            return outputArray;

        },

        unsubscribeUser: function () {

            var self = this;

            return self.getSubscription()
                .then( function ( subscription ) {

                    return subscription.unsubscribe();

                } )
                .catch( function ( error ) {
                    console.log( "Error unsubscribing", error );
                } )
                .then( function () {

                    self.isSubscribed = false;

                    return self.updateSubscriptionOnServer( null );

                } );

        },

        subscribeUser: function () {

            var self = this;

            return self.getIsSubscribed()
                .then( function ( subscription ) {

                    if ( subscription ) {

                        self._isSubscribed = true;

                        return subscription;

                    } else {

                        return self.askPermission()
                            .then( function ( permission ) {

                                if ( permission ) {

                                    return swRegistration.pushManager.subscribe( {
                                        userVisibleOnly: true,
                                        applicationServerKey: self.urlB64ToUint8Array( applicationServerPublicKey )
                                    } ).then( function ( subscription ) {

                                        self._isSubscribed = true;

                                        console.info( subscription.toJSON() );

                                        return subscription;

                                    } ).catch( function ( err ) {
                                        console.log( "dang, Failed to subscribe the user: ", err );
                                        return false;
                                    } );

                                } else {
                                    return undefined;
                                }

                            } );

                    }

                } );

        }

    };

    var smsMgr = {

        _isSubscribed: false,

        updateSubscriptionOnServer: function ( subscription ) {
            // TODO: Send subscription to application server

            console.log( "user subscription state set ", !!subscription );

            console.log( "Received PushSubscription: ", JSON.stringify( subscription ) );

            return;
        },

        getSubscription: function () {

            return navigator.serviceWorker.getRegistration()
                .then( function ( registration ) {

                    return registration.pushManager.getSubscription();

                } );

        },

        getIsSubscribed: function () {

            var self = this;

            return self.getSubscription()
                .then( function ( subscription ) {

                    console.log( "subscription" );
                    console.log( subscription );


                    self._isSubscribed = ( subscription );

                    return self._isSubscribed;

                } );

        },

        unsubscribeUser: function () {

            var self = this;

            self.getSubscription()
                .then( function ( subscription ) {

                    return subscription.unsubscribe();

                } )
                .catch( function ( error ) {
                    console.log( "Error unsubscribing", error );
                } )
                .then( function () {

                    self.updateSubscriptionOnServer( null );

                    self.isSubscribed = false;

                } );

        },

        subscribeUser: function () {

            var self = this;

            return self.getIsSubscribed()
                .then( function ( subscription ) {

                    return subscription;

                } );

        }

    };

    var emailMgr = {

        _isSubscribed: false,

        updateSubscriptionOnServer: function ( subscription ) {
            // TODO: Send subscription to application server

            console.log( "user subscription state set ", !!subscription );

            console.log( "Received PushSubscription: ", JSON.stringify( subscription ) );

            return;

        },

        getSubscription: function () {

            return Promise.resolve( {} );

        },

        getIsSubscribed: function () {

            var self = this;

            return self.getSubscription()
                .then( function ( subscription ) {

                    self._isSubscribed = ( subscription );

                    return self._isSubscribed;

                } );

        },

        unsubscribeUser: function () {

            var self = this;

            self.getSubscription()
                .then( function ( subscription ) {

                    return subscription.unsubscribe();

                } )
                .catch( function ( error ) {
                    console.log( "Error unsubscribing", error );
                } )
                .then( function () {

                    self.isSubscribed = false;

                    return self.updateSubscriptionOnServer( null );

                } );

        },

        subscribeUser: function () {

            var self = this;

            return self.getIsSubscribed()
                .then( function ( subscription ) {

                    return subscription;

                } );

        }

    };

    window.pushMgr = pushMgr;
    window.smsMgr = smsMgr;
    window.emailMgr = emailMgr;

} )();