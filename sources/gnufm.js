// TODO: convert gnufm rss to atom

( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( subscription, data ) {
        var event = {},
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item = doc.getElementsByTagName( "scrobble" )[ 0 ],
            track = item.getElementsByTagName( "track" )[ 0 ],
            artist = item.getElementsByTagName( "artist" )[ 0 ],
            album = item.getElementsByTagName( "album" )[ 0 ];

        event.title = "Listened to";
        event.source = ""; // TODO
        event.content = "<a href='" + track.getAttribute( "url" ) + "'>" + track.textContent + "</a>" +
            " by <a href='" + artist.getAttribute( "url" ) + "'>" + artist.textContent + "</a>" +
            " on <a href='" + album.getAttribute( "url" ) + "'>" + album.textContent + "</a>";
        event.published = item.getElementsByTagName( "published" )[0].textContent;
        event.objectType = "audio";
        event.verb = "listen";

        return event;
    };
}() );

