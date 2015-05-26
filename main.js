( function() {
    /*global require: false, JSON: false*/
    "use strict";

    var mysql = require( "mysql" ),
        WebSocketServer = require( "ws" ).Server,
        winston = require( "winston" ),
        fs = require( "fs" ),
        wss,
        sqlPool,
        setupSubscriber,
        formatDate,
        sources = [],
        setupLogger,
        logger,
        config,
        setupWebSockets,
        setupSQL;

    setupSQL = function() {
        return sqlPool = mysql.createPool( {
            host: config.db.host,
            database: config.db.name,
            user: config.db.user,
            password: config.db.password
        } );
    };

    setupWebSockets = function() {
        wss = new WebSocketServer( { port: config.websockets.port } );

        // Broadcast
        wss.broadcast = function broadcast( data ) {
            wss.clients.forEach( function each( client ) {
                client.send( data );
            } );
        };

        return wss;
    };

    setupLogger = function() {
        var transports = [],
            transport,
            len,
            i,
            type,
            logger;

        if ( !config.log || !config.log.transports ) {
            logger = {};
            logger.debug = function() { };
            logger.log = logger.debug;
            logger.info = logger.debug;

            return logger;
        }

        for ( i = 0, len = config.log.transports.length; i < len; i += 1 ) {
            transport = config.log.transports[ i ];

            type = transport.type || "Console";
            type = type.charAt( 0 ).toUpperCase() + type.slice( 1 ); /* ucfirst() */

            delete transport.type;

            // TODO: Handle cases where call() fails due to bad "type" value
            transports.push( new winston.transports[ type ]( transport ) );
        }

        logger = new ( winston.Logger )(
                {
                    transports: transports,
                    exitOnError: false
                }
            );

        return logger;
    };

    // ISO String to MySQL DATETIME format
    // YYYY-MM-DDTHH:MM:SS.sssZ to YYYY-MM-DD HH:MM:SS
    // TODO: convert all dates to the same timezone (UTC? EST? EDT? GMT? wat.)
    formatDate = function( date ) {
        var d = new Date( date );

        // Invalide date, fallback to "now"
        if ( isNaN( d.getTime() ) ) {
            d = new Date();
        }

        return d.toISOString().slice( 0, -5 ).replace( "T", " " );
    };

    setupSubscriber = function() {
        var http = require( "http" ),
            pubSubHubbub = require( "pubsubhubbub" ),
            pubSubSubscriber = pubSubHubbub.createServer( {
                "callbackUrl": "http://chromic.org:1337/"/*,
                "secret": "secret" // TODO: do we need this? is it used?
                */
            } );

        pubSubSubscriber.on( "error", function( err ) {
            logger.debug( "An error as occured: " );
            logger.debug( err );
        } );

        pubSubSubscriber.on( "listen", function() {
            /**
             * Sub / Unsub
             */
            pubSubSubscriber.on( "subscribe", function( data ) {
                var tmpDate = formatDate( new Date() );

                sqlPool.getConnection( function( err, connection ) {
                    if ( err ) {
                        logger.debug( "[onSubscribe] Coulnd't connect to SQL: " + err.stack );
                        return;
                    }

                    connection.query(
                        /* TODO: should we also refresh sub_start, sub_end (?) -- does the hub see it as a "extend my subscription" deal? */
                        "INSERT INTO subscription( topic, huburi, type, secret, state, last_ping, created, modified, sub_start, sub_end ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )" +
                        "ON DUPLICATE KEY UPDATE modified=NOW();",
                        [ data.topic, "FIXME: should be huburi", sub.type, null, "active", null, tmpDate, null, tmpDate, tmpDate ],
                        function( err ) {
                            if ( err ) {
                                logger.debug( "Error inserting subscription: " + err.stack );
                                return;
                            }

                            logger.debug( "Inserted subscription in SQL table" );
                        }
                    );

                    connection.release();
                } );

                logger.debug( data.topic + " subscribed" );

            } );

            // Subscribe
            var subs = config.subs, /* TODO: error handling */
                len = subs.length,
                i,
                sub;

            for ( i = 0; i < len; i += 1 ) {
                sub = subs[ i ];

                if ( !sources[ sub.topic] ) {
                    sources[ sub.topic ] = require( "./sources/" + sub.type + ".js" );
                }

                pubSubSubscriber.subscribe( sub.topic, sub.hub );
            }

            /**
             * Setup PuSH
             */

            pubSubSubscriber.on( "feed", function( response ) {
                var subscription,
                    topic = response.topic,
                    url = topic;

                logger.debug( "feed event" );

                // TODO: do we need make sure we're subscribed to this thing?
                //       anybody could send (fake) ping request to our callback
                //       is there any kind of security in the PuSH spec -- HMAC, secret, ...?
                sqlPool.getConnection( function( err, connection ) {
                    if ( err ) {
                        logger.debug( "[onFeed] Couldn't connect to SQL: " + err.stack );
                        return;
                    }

                    connection.query(
                        "SELECT id, topic, last_ping FROM subscription WHERE topic = ?",
                        [ topic ],
                        function( err, res ) {
                            if ( err ) {
                                logger.debug( "Couldn't fetch subscription from DB: " + err.stack );
                                return;
                            }

                            if ( res.length === 0 ) {
                                logger.debug( "Received a ping from a topic we're not subscribed to." );
                                logger.debug( "Topic: " + topic );

                                return;
                            }

                            subscription = res[ 0 ];

                            // FIXME: tmp exception for GS; we parse .as instead of .atom for now
                            // TODO:  use DOMParser like we do for the blog
                            if ( topic === "http://sn.chromic.org/api/statuses/user_timeline/1.atom" ) {
                                url = "http://sn.chromic.org/api/statuses/user_timeline/1.as";
                            }

                            // Get feed
                            http.get( url, function( res ) {
                                var data = "",
                                    event;

                                res.on( "data", function( chunk ) {
                                    data += chunk;
                                } );

                                res.on( "end", function() {
                                    logger.debug( "got data" );
                                    event = sources[ subscription.topic ].parse( subscription, data );

                                    if ( event === null ) {
                                        logger.debug( "Got a ping, but nothing to insert" );
                                        logger.debug( "Topic: " + topic );

                                        return;
                                    }

                                    /**
                                     * Insert new event in DB
                                     */

                                    var published = formatDate( event.published );

                                    // TODO: Update date

                                    sqlPool.getConnection( function( err, connection ) {
                                        if ( err ) {
                                            logger.debug( "[parseData] Couln't connect to sql: " + err.stack );
                                            return;
                                        }

                                        connection.query(
                                            "INSERT INTO event( subscription_id, title, content, published, updated, foreign_url, object_type, object_verb ) VALUES( ?, ?, ?, ?, ?, ?, ?, ? );",
                                            [ subscription.id, event.title, event.content, published, null, event.source, event.type, event.verb ],
                                            function( err ) {
                                                if ( err ) {
                                                    logger.debug( "Error inserting event: " + err.stack );
                                                    return;
                                                }

                                                // Notify websockets
                                                wss.broadcast( JSON.stringify( event ) );
                                            }
                                        );

                                        connection.release();
                                    } );
                                } );
                            } ).on( "error", function( e ) {
                                logger.debug( "Got error trying to fetch topic: " + e.message );
                                logger.debug( "Topic: " + topic );
                            } );
                        }
                    );

                    connection.release();
                } );
            } );
        } );

        // Start listening for pings
        pubSubSubscriber.listen( config.port );
    };

    /**
     * Read config file
     * TODO: error handling
     */
    config = fs.readFileSync( "./config.json" );
    config = JSON.parse( config );

    wss = setupWebSockets();

    sqlPool = setupSQL();

    logger = setupLogger();

    setupSubscriber();
}() );

