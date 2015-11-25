( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( data ) {
        var DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            contentTitle,
            event = {},
            item = doc.getElementsByTagName( "entry" )[ 0 ],
            links = item.getElementsByTagName( "link" ),
            img;

        // TODO: might not be an image -- check type once it's in the feed
        event.title = "Posted an image";

        // FIXME: should fetch based on "type" attr, not node position
        event.foreign_url = links[ 0 ].getAttribute( "href" );
        img = "<img src='" + links[ 1 ].getAttribute( "href" ) + "'>";

        event.published = item.getElementsByTagName( "updated" )[ 0 ].textContent;

        contentTitle = "<h2>" + item.getElementsByTagName( "title" )[ 0 ].textContent + "</h2>";

        // Might not be present
        event.content = item.getElementsByTagName( "content" ).item( 0 );
        if ( event.content ) {
            event.content = event.content.textContent;
        } else {
            event.content = "";
        }

        event.content = contentTitle + event.content + "<br>" + img;

        event.objectType = "image";
        event.verb = "post";

        return event;
    };

}() );

