( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    // TODO: cleanup
    // TODO: error handling

    exports.parse = function( data ) {
        var activityRE = /([^\/]+)$/,
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item = doc.getElementsByTagName( "entry" )[ 0 ],
            by,
            activityNS = "http://activitystrea.ms/spec/1.0/",
            pocoNS = "http://portablecontacts.net/spec/1.0",
            reply_to,
            event = {};

        event.published = item.getElementsByTagName( "published" )[ 0 ].textContent;
        event.object_verb = activityRE.exec( item.getElementsByTagNameNS( activityNS, "verb" )[ 0 ].textContent )[ 0 ];
        event.object_type = activityRE.exec( item.getElementsByTagNameNS( activityNS, "object-type" )[ 0 ].textContent )[ 0 ];
        event.foreign_url = item.getElementsByTagName( "link" )[ 0 ].getAttribute( "href" );

        switch ( event.object_verb ) {
            case "favorite":
                reply_to = item.getElementsByTagName( "link" )[ 2 ].getAttribute( "href" );
                by = / by ([^:]+)/.exec( item.getElementsByTagName( "content" )[ 0 ].textContent )[ 0 ];
                event.title = "Favorited a <a class='u-like-of' href='" + reply_to + "'>" + event.object_type + "</a>" + by;
                event.content = item.getElementsByTagNameNS( activityNS, "object" )[ 0 ].getElementsByTagName( "content" )[ 0 ].textContent;
                break;
            case "share": /* repeat */
                event.title = "Repeated a " +
                    activityRE.exec(
                        item
                            .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                            .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                            .getElementsByTagNameNS( activityNS, "object-type" )[ 0 ].textContent
                    )[ 0 ] +
                    " by " +
                    "<a href='" + item.getElementsByTagName( "uri" )[ 0 ].textContent + "'>" +
                    item.getElementsByTagName( "name" )[ 0 ].textContent +
                    "</a>";
                event.content = item
                    .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                    .getElementsByTagName( "content" )[ 0 ].textContent;
                break;
            case "post":
                event.title = "Posted a " + event.object_type;

                if ( event.object_type === "bookmark" ) {
                    event.content = item.getElementsByTagNameNS( activityNS, "object" )[ 0 ].getElementsByTagName( "content" )[ 0 ].textContent;
                } else { /* note, comment */
                    event.content = item.getElementsByTagName( "content" )[ 0 ].textContent;
                }
                break;
            case "join":
                event.title = "Joined a " + event.object_type;
                event.content = "<a href='" +
                    item
                        .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                        .getElementsByTagName( "link" )[ 0 ]
                        .getAttribute( "href" ) +
                    "'>" +
                    item.getElementsByTagNameNS( pocoNS, "displayName" )[ 0 ].textContent + "</a> " +
                    "(" + item.getElementsByTagNameNS( pocoNS, "preferredUsername" )[ 0 ].textContent + ")<br />" +
                    ( item.getElementsByTagNameNS( pocoNS, "note" )[ 0 ].textContent || "" );
                break;
            case "follow":
                event.title = "Started following";
                event.content = "<a class='h-card u-url' href='" +
                    item
                        .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                        .getElementsByTagName( "link" )[ 0 ]
                        .getAttribute( "href" ) +
                    "'>" +
                    "<img class='u-photo' src='" +
                    item
                        .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                        .getElementsByTagName( "link" )[ 1 ]
                        .getAttribute( "href" ) +
                    "' alt='" +
                    item
                        .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                        .getElementsByTagNameNS( pocoNS, "displayName" )[ 0 ].textContent +
                    "&#39;s avatar'>" +
                    "<span class='p-nickname'>" +
                    item
                        .getElementsByTagNameNS( activityNS, "object" )[ 0 ]
                        .getElementsByTagNameNS( pocoNS, "displayName" )[ 0 ].textContent +
                    "</span></a>";
                break;
            default:
                event.title = item.getElementsByTagName( "title" )[ 0 ].textContent;
                event.content = item.getElementsByTagName( "content" )[ 0 ].textContent;
                break;
        }

        return event;
    };
}() );

