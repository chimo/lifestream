( function() {
    /*global module: false, JSON: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( subscription, data ) {
        var last_ping = subscription.last_ping,
            activityRE = /([^\/]+)$/,
            item,
            by,
            event = {};

        data = JSON.parse( data );

        // TODO: Maybe we should get all items we don't have, not just most recent one
        /* This is the first time we get data from the hub.
           Only get the latest item. */
        if ( last_ping === null ) {
            item = data.items[ 0 ];

            event.published = item.published;
            /* event.updated = formatDate( item.updated ); */
            event.verb = activityRE.exec( item.verb )[ 0 ];
            event.objectType = activityRE.exec( item.object.objectType )[ 0 ];
            event.source = item.url;

            switch ( event.verb ) {
                case "favorite":
                    by = / by ([^:]+)/.exec( item.content )[ 0 ];
                    event.title = "Favorited a " + event.objectType + by;
                    event.content = item.object.content;
                    event.source = item.object.url; /* Link to foreign instance (favs don't have local urls) */
                    break;
                case "share": /* repeat */
                    event.title = "Repeated a " + event.objectType;
                    event.content = item.content;
                    break;
                case "post":
                    event.title = "Posted a " + event.objectType;

                    if ( event.objectType === "bookmark" ) {
                        event.content = item.content;
                    } else { /* note, comment */
                        event.content = item.object.content;
                    }
                    break;
                case "join":
                    event.title = "Joined a " + event.objectType;
                    event.content = "<a href='" + item.object.url + "'>" +
                        item.object.portablecontacts_net.displayName + "</a> " +
                        "(" + item.object.portablecontacts_net.preferredUsername + ")<br />" +
                        ( item.object.portablecontacts_net.note || "" );
                    break;
                case "follow":
                    event.title = "Started following";
                    event.content = "<a class='h-card u-url' href='" + item.object.url + "'>" +
                                        "<img class='u-photo' src='" + item.object.image.url + "' alt='" + item.object.displayName + "&#39;s avatar'>" +
                                        "<span class='p-nickname'>" + item.object.displayName +
                                    "</span></a>";
                    break;
                default:
                    event.title = item.title;
                    event.content = item.content;
                    break;
            }
        }

        return event;
    };
}() );

