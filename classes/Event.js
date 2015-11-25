( function() {
    /*global console: false, module: false*/
    "use strict";

    var Event;

    /**
     * [[Description]]
     * @param {[[Type]]} data [[Description]]
     */
    Event = function( data ) {
        var that = this;

        Event.fields.forEach( function( field ) {
            that[ field ] = data[ field ];
        } );
    };

    /*
     * SQL columns
     */
    Event.fields = [
        "id",
        "subscription_id",
        "title",
        "content",
        "published",
        "updated",
        "foreign_url",
        "object_type",
        "object_verb"
    ];

    /**
     * [[Description]]
     * @param {[[Type]]} database [[Description]]
     * @param {[[Type]]} callback [[Description]]
     */
    Event.prototype.insert = function( database, callback ) {
        var that = this;

        database.getConnection( function( err, connection ) {
            if ( err ) {
                /* FIXME: logger.debug( "[Event::insert] Couldn't connect to SQL: " + err.stack ); */
                console.log( "[Event::insert] Couldn't connect to SQL: " + err.stack );
                return;
            }

            connection.query(
                "INSERT INTO event(" +
                    "subscription_id, title, content, published, updated, " +
                    "foreign_url, object_type, object_verb " +
                ") VALUES( ?, ?, ?, ?, ?, ?, ?, ? );",
                [
                    that.subscription_id,
                    that.title,
                    that.content,
                    that.published,
                    null,
                    that.foreign_url,
                    that.objectType,
                    that.verb
                ],
                callback
            );

            connection.release();
        } );
    };

    module.exports = Event;
}() );
