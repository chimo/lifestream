( function() {
    /*global console: false, require: false, module: false*/
    "use strict";

    var Subscription,
        Event = require( "./Event.js" );

    /**
     * [[Description]]
     */
    Subscription = function( data ) {
        var that = this;

        Subscription.fields.forEach( function( field ) {
            that[ field ] = data[ field ];
        } );

        that.parser = require( "../sources/" + that.type + ".js" );
    };

    /*
     * SQL Columns
     */
    Subscription.fields = [
        "id",
        "topic",
        "type",
        "huburi",
        "secret",
        "state",
        "last_ping",
        "created",
        "modified",
        "sub_start",
        "sub_end"
    ];

    /**
     * [[Description]]
     * @param   {[[Type]]} data [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    Subscription.prototype.getEvent = function( data, topic ) {
        var obj = this.parser.parse( data, topic );

        return new Event( obj );
    };

    /**
     * [[Description]]
     * @param {[[Type]]} key      [[Description]]
     * @param {[[Type]]} value    [[Description]]
     * @param {[[Type]]} database [[Description]]
     * @param {[[Type]]} callback [[Description]]
     */
    Subscription.getKV = function( key, value, database, callback ) {
        database.getConnection( function( err, connection ) {
            if ( err ) {
                /* FIXME: logger.debug( "[onFeed] Couldn't connect to SQL: " + err.stack ); */
                console.log( "[onFeed] Couldn't connect to SQL: " + err.stack );
                return;
            }

            connection.query(
                "SELECT * FROM subscription WHERE ?? = ?",
                [ key, value ],
                function( err, res ) {
                    if ( err ) {
                        /* FIXME: logger.debug( "Couldn't fetch subscription from DB: " + err.stack ); */
                        console.log( "Couldn't fetch subscription from DB: " + err.stack );
                        callback( err );

                        return;
                    }

                    // Subscription doesn't exist
                    if ( res.length === 0 ) {
                        callback( null );

                        return;
                    }

                    // Build subscription
                    callback( new Subscription( res[ 0 ] ) );
                }
            );

            connection.release();
        } );
    };

    /**
     * [[Description]]
     * @param {[[Type]]} database [[Description]]
     */
    Subscription.prototype.renew = function( database ) {
        database.subscribe( this );
    };

    /**
     * [[Description]]
     * @param {[[Type]]} database [[Description]]
     */
    Subscription.prototype.insert = function( database, callback ) {
        var that = this;

        database.getConnection( function( err, connection ) {
            if ( err ) {
                /* FIXME: logger.debug( "[onSubscribe] Couldn't connect to SQL: " + err.stack ); */
                console.log( "[onSubscribe] Couldn't connect to SQL: " + err.stack );
                return;
            }

            connection.query(
                "INSERT INTO subscription(" +
                    "topic, huburi, type, secret, state, last_ping, created, " +
                    "modified, sub_start, sub_end " +
                ") VALUES( ?, ?, ?, ?, ?, ?, DEFAULT, ?, ?, ? )" +
                "ON DUPLICATE KEY UPDATE modified=NOW(), sub_start=NOW(), sub_end=?;",
                [
                    that.topic,
                    that.huburi,
                    that.type,
                    null,
                    "active",
                    null,
                    that.modified,
                    that.sub_start,
                    that.sub_end,
                    that.sub_end
                ],
                callback
            );

            connection.release();
        } );
    };

    module.exports = Subscription;
}() );
