// TODO: convert gnufm rss to atom

( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( data ) {
        var event = {},
            DOMParser = require( "xmldom" ).DOMParser,
            doc = new DOMParser().parseFromString( data ),
            item = doc.getElementsByTagName( "scrobble" )[ 0 ],
            track = item.getElementsByTagName( "track" )[ 0 ],
            trackUrl = track.getAttribute( "url" ),
            artist = item.getElementsByTagName( "artist" )[ 0 ],
            album = item.getElementsByTagName( "album" )[ 0 ],
            albumUrl = album.getAttribute( "url" ),
            albumTitle = album.textContent,
            onAlbum = ( albumUrl && albumTitle ) ? " on <a href='" + album.getAttribute( "url" ) + "'>" + album.textContent + "</a>" : "";

        event.title = "Listened to";
        event.foreign_url = trackUrl; // TODO
        event.content = "<a href='" + trackUrl + "'>" + track.textContent + "</a>" +
            " by <a href='" + artist.getAttribute( "url" ) + "'>" + artist.textContent + "</a>" +
            onAlbum;

        event.published = item.getElementsByTagName( "published" )[ 0 ].textContent;
        event.object_type = "audio";
        event.object_verb = "listen";

        return event;
    };
}() );

