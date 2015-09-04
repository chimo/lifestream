( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( subscription, data ) {
        var event = {},
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item;

        item = doc.getElementsByTagName( "entry" )[ 0 ];

        event.title = "Checked-in to a location";
        event.source = item.getElementsByTagName( "link" )[ 0 ].getAttribute( "href" );
        event.published = item.getElementsByTagName( "published" )[ 0 ].textContent;
        event.content = item.getElementsByTagName( "content" )[ 0 ].textContent;
        event.objectType = "place";
        event.verb = "checkin";

        return event;
    };
}() );

