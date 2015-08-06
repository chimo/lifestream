( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    // TODO: cleanup
    // TODO: error handling

    exports.parse = function( subscription, data ) {
        var activityRE = /([^\/]+)$/,
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item = doc.getElementsByTagName( "entry" )[ 0 ],
            by,
            activityNS = "http://activitystrea.ms/spec/1.0/",
            event = {};

        event.published = item.getElementsByTagName( "published" )[ 0 ].textContent;
        event.verb = activityRE.exec( item.getElementsByTagNameNS( activityNS, "verb" )[ 0 ].textContent )[ 0 ];
        event.objectType = activityRE.exec( item.getElementsByTagNameNS( activityNS, "object-type" )[ 0 ].textContent )[ 0 ];
        event.source = item.getElementsByTagName( "link" )[ 0 ].getAttribute( "href" );

        switch ( event.verb ) {
            case "favorite":
                by = / by ([^:]+)/.exec( item.getElementsByTagName( "content" )[ 0 ].textContent )[ 0 ];
                event.title = "Favorited a " + event.objectType + by;
                event.content = item.getElementsByTagNameNS( activityNS, "object" )[ 0 ].getElementsByTagName( "content" )[ 0 ].textContent;
                break;
            case "share": /* repeat */
                event.title = "Repeated a " + event.objectType;
                event.content = item.content;
                break;
            case "post":
                event.title = "Posted a " + event.objectType;

                if ( event.objectType === "bookmark" ) {
                    event.content = item.getElementsByTagNameNS( activityNS, "object" )[ 0 ].getElementsByTagName( "content" )[ 0 ].textContent;
                } else { /* note, comment */
                    event.content = item.getElementsByTagName( "content" )[ 0 ].textContent;
                }
                break;
            case "join": // TODO: Change to atom
                event.title = "Joined a " + event.objectType;
                event.content = "<a href='" + item.object.url + "'>" +
                    item.object.portablecontacts_net.displayName + "</a> " +
                    "(" + item.object.portablecontacts_net.preferredUsername + ")<br />" +
                    ( item.object.portablecontacts_net.note || "" );
                break;
            case "follow": // TODO: Change to atom
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

        return event;
    };
}() );

