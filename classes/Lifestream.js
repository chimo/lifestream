( function() {
    /*global require: false, console: false, JSON: false, module: false*/
    "use strict";

    var Lifestream,
        mysql = require( "mysql" ),
        WebSocketServer = require( "ws" ).Server,
        pubSubHubbub = require( "pubsubhubbub" ),
        extend = require( "extend" ),
        Subscription = require( "./Subscription.js" ),
        fs = require( "fs" ),
        winston = require( "winston" ),
        /* Utils: */
        format_date,
        http_get,
        http_post,
        ping_hub,
        _setTimeout;

    /**
     * Constructor
     * @param {Object} options configurations
     */
    Lifestream = function( options ) {
        var that = this;

        // Set config values
        that.config = extend( true, Lifestream.defaults, options );

        // Setup logger
        that.logger = ( function() {
            var transports = [],
                transport,
                len,
                i,
                type,
                logger;

            if ( !that.config.log || !that.config.log.transports ) {
                logger = {};
                logger.debug = function() { };
                logger.log = logger.debug;
                logger.info = logger.debug;

                return logger;
            }

            for ( i = 0, len = that.config.log.transports.length; i < len; i += 1 ) {
                transport = that.config.log.transports[ i ];

                type = transport.type || "Console";
                type = type.charAt( 0 ).toUpperCase() + type.slice( 1 ); /* ucfirst() */

                delete transport.type;

                // TODO: Handle cases where call() fails due to bad "type" value
                transports.push( new winston.transports[ type ]( transport ) )
            }

            logger = new ( winston.Logger )(
                    {
                        transports: transports,
                        exitOnError: false
                    }
                );

            return logger;
        }() );

        // Setup things
        that.sql = that._setupSQL();
        that.ws = that._setupWebsockets();

        if ( that.config.secure_websockets ) {
            that.wss = that._setupSecureWebsockets();
        }

        that.subscriber = that._setupSubscriber();
        that.subscriptions = [];

    };

    /**
     * Default configuration values
     */
    Lifestream.defaults = {
        "callback": {
            "port": 1337,
            "url": "http://example.org"
        },

        "db": {
            "host": "localhost",
            "name": "lifestream",
            "user": "lifestream",
            "password": ""
        },

        "subs": [],

        "websockets": {
            "port": 8090
        },

        "log": {
            "transports": [
                {
                    "type": "console",
                    "level": "error",
                    "handleExceptions": true
                },
                {
                    "type": "file",
                    "level": "error",
                    "handleExceptions": true,
                    "filename": "lifestream.log"
                }
            ]
        }
    };

    /**
     * [[Description]]
     * @param {Object} subscription [[Description]]
     */
    Lifestream.prototype.subscribe = function( subscription ) {
        this.subscriber.subscribe( subscription.topic, subscription.huburi );
    };

    /**
     * Setup MySQL pool connection
     *
     * https://www.npmjs.com/package/mysql#pooling-connections
     * @returns {Object} SQL pool
     */
    Lifestream.prototype._setupSQL = function() {
        var db = this.config.db;

        return mysql.createPool( {
            host: db.host,
            database: db.name,
            user: db.user,
            password: db.password,
            charset: db.charset || "UTF8_GENERAL_CI"
        } );
    };

    /**
     * Setup websockets
     *
     * https://www.npmjs.com/package/ws
     * @returns {Object} websocket
     */
    Lifestream.prototype._setupWebsockets = function() {
        var configs = this.config.websockets,
            ws = new WebSocketServer( { port: configs.port, host: configs.host } );

        ws.broadcast = function broadcast( data ) {
            ws.clients.forEach( function each( client ) {
                client.send( data );
            } );
        };

        return ws;
    };

    /**
     * [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    Lifestream.prototype._setupSecureWebsockets = function() {
        var app,
            configs = this.config.secure_websockets,
            https = require( "https" ),
            wss;

        app = https.createServer( {
            key: fs.readFileSync( configs.key ),
            cert: fs.readFileSync( configs.cert ),
            ca: fs.readFileSync( configs.ca )
        } ).listen( configs.port, configs.host );

        wss = new WebSocketServer( { server: app } );

        wss.broadcast = function broadcast( data ) {
            wss.clients.forEach( function each( client ) {
                client.send( data );
            } );
        };

        return wss;
    };

    /**
     * After subscription
     */
    Lifestream.prototype._subscribed = function( subscription, data ) {
        var lifestream = this,
            now = new Date(),
            expires = new Date( data.lease * 1000 ), // 'lease' is in seconds, Date() needs ms
            timeUntilExpiration = Math.max( expires - now, 1000 * 60 * 60 ); // FIXME: My GS lease is messed up

        // Update subscriptions datetimes
        subscription.modified = now;
        subscription.sub_start = now;
        subscription.sub_end = expires;

        // Renew when expires
        _setTimeout.call( subscription, subscription.renew, timeUntilExpiration, this );

        // Insert/update in DB
        subscription.insert( this.sql, function( err ) {
            if ( err ) {
                lifestream.logger.debug( "Error inserting subscription: " + err.stack );
                return;
            }

            lifestream.logger.debug( "Inserted subscription '" + subscription.topic + "' in SQL table" );
        } );
    };

    /**
     * Setup subscriber
     */
    Lifestream.prototype._setupSubscriber = function() {
        var that = this,
            callback = that.config.callback,
            subscriber = pubSubHubbub.createServer( {
                "callbackUrl": callback.url + ":" + callback.port
            } );

        subscriber.on( "listen", function() {
            // Subscribe to things
            that.config.subs.forEach( function( sub ) {
                var subscription = new Subscription( {
                    topic: sub.topic,
                    huburi: sub.hub,
                    type: sub.type
                } );

                that.subscriptions[ sub.topic ] = subscription;
                that.subscribe( subscription );
            } );
        } );

        subscriber.on( "error", function() {
            console.log( "error" );
        } );

        subscriber.on( "subscribe", function( data ) {
            that._subscribed( that.subscriptions[ data.topic ], data );
        } );

        subscriber.on( "feed", function( response ) {
            var topic = response.topic;

            Subscription.getKV( "topic",  topic, that.sql, function( subscription ) {
                if ( subscription === null ) {
                    that.logger.debug( "Sub doesn't exist" );
                    return;
                }

                http_get( topic, function( data ) {
                    var event = subscription.getEvent( data, topic );

                    if ( event === null ) {
                        that.logger.debug( "Got a ping, but nothing to insert" );
                        that.logger.debug( "Topic: " + topic );

                        return;
                    }

                    event.subscription_id = subscription.id;
                    event.published = format_date( event.published );

                    event.insert( that.sql, function( err, result ) {
                        if ( err ) {
                            that.logger.debug( "Error inserting event: " + err.stack );
                            return;
                        }

                        // Tell websockets what type of event this is
                        event.type = subscription.type;

                        // Tell websockets the id of the new item we inserted
                        event.id = result.insertId;

                        // Notify websockets
                        that.ws.broadcast( JSON.stringify( event ) );
                        that.wss.broadcast( JSON.stringify( event ) );

                        // Notify hub that our topic(s) have been updated
                        that.config.pubs.forEach( function( pub ) {
                            ping_hub( pub.hub, pub.topic );
                        } );
                    } );
                } );
            } );
        } );

        subscriber.listen( callback.port );

        return subscriber;
    };

    // ############# UTILS #############

    ping_hub = function( hub, topic ) {
        var post_data,
            post_options,
            post_req,
            req = require( "https" ), // TODO: support http hubs
            querystring = require( "querystring" );

        post_data = querystring.stringify( {
            "hub.mode": "publish",
            "hub.url": topic
        } );

        console.log( "POST data: " + post_data );

        post_options = {
            host: hub,
            port: 443, // TODO: support http hubs
            followAllRedirects: true,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": post_data.length
            }
        };

        post_req = req.request(post_options, function( res ) {
            res.setEncoding( "utf8" );
            res.on( "data", function ( chunk ) {
                console.log( "Response: " + chunk );
            });
        });

        post_req.on( "error", function ( e ) {
            console.log( e );
        } );

        post_req.write( post_data );
        post_req.end();
    };

    // From: https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout#A_possible_solution
    // TODO: We don't need to keep original functionality since we're calling it a different name
    _setTimeout = function( vCallback, nDelay ) {
        var oThis = this,
            aArgs = Array.prototype.slice.call( arguments, 2 );

        return setTimeout( vCallback instanceof Function ? function() {
                vCallback.apply( oThis, aArgs );
            } : vCallback, nDelay );
    };

    /**
     * Date string to MySQL DATETIME format
     *
     * @param   {String} date A date to convert
     * @returns {String} MySQL DATETIME format
     */
    format_date = function( date ) {
        var d = new Date( date );

        // Invalide date, fallback to "now"
        if ( isNaN( d.getTime() ) ) {
            d = new Date();
        }

        return d.toISOString().slice( 0, -5 ).replace( "T", " " );
    };

    /**
     * [[Description]]
     * @param {String}   url      [[Description]]
     * @param {[[Type]]} callback [[Description]]
     */
    http_get = function( url, callback ) {
        var req = ( url.substr( 0, 8 ) === "https://" ) ? require( "https" ) : require( "http" ),
            handleResponse;

        handleResponse = function( response ) {
            var data = "";

            response.on( "data", function( chunk ) {
                data += chunk;
            } );

            response.on( "end", function() {
                callback( data );
            } );
        };

        req.get( url, handleResponse )
            .on( "error", function( e ) {
                /* FIXME: logger.debug( "Error trying to fetch topic: " + e.message );
                logger.debug( "Topic: " + url ); */
                console.log( "Got error trying to fetch topic: " + e.message );
                console.log( "Topic: " + url );
            } );
    };

    http_post = function( url, callback ) {
        var req = ( url.substr( 0, 8 ) === "https://" ) ? require( "https" ) : require( "http" ),
            handleResponse;

        handleResponse = function( response ) {
            var data = "";

            response.on( "data", function( chunk ) {
                data += chunk;
            } );

            response.on( "end", function() {
                callback( data );
            } );
        };

        req.post( url, handleResponse )
            .on( "error", function( e ) {
                /* FIXME: logger.debug( "Error trying to fetch topic: " + e.message );
                logger.debug( "Topic: " + url ); */
                console.log( "Got error trying to fetch topic: " + e.message );
                console.log( "Topic: " + url );
            } );
    };

    module.exports = Lifestream;
}() );
