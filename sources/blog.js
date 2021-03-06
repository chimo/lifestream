( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( data ) {
        var event = {},
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item;

        item = doc.getElementsByTagName( "entry" )[ 0 ];

        event.title = "Posted an article";
        event.foreign_url = item.getElementsByTagName( "link" )[ 0 ].getAttribute( "href" );
        event.published = item.getElementsByTagName( "published" )[ 0 ].textContent;
        event.content = "<h2>" + item.getElementsByTagName( "title" )[ 0 ].textContent + "</h2>" +
                        item.getElementsByTagName( "summary" )[ 0 ].textContent +
                        "<p><a href='" + event.foreign_url + "'>read more...</a></p>";
        event.object_type = "article";
        event.object_verb = "post";

        return event;
    };
}() );

