( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( data ) {
        var event = {},
            item,
            json = null,
            html = "",
            showdown  = require( "showdown" ),
            converter = new showdown.Converter(),
            episodeDescHtml = "";

        try {
            json = JSON.parse( data );
        } catch(e) {
            console.log( e.message );

            return null;
        }

        item = json.episodes[ 0 ]; // TODO: Error handling

        // FIXME: We probably shouldn't blindly trust the markdown coming from mygpo
        // TODO: Sanitize resulting HTML to be safe
        episodeDescHtml = converter.makeHtml( item.episode.description );

        event.title = "Listened to";
        event.foreign_url = "https://podcasts.chromic.org/user/chimo";

        html = "<div class='podcast'><h3 class='podcast__title'><a href='" +
            item.podcast.homepage  + "'>" + item.podcast.title + "</a></h3>";

        html += "<div class='podcast__content episode'><h4 class='episode__title'>" +
            "<a href='" + item.episode.homepage + "'>" + item.episode.title + "</a></h4>";

        html += episodeDescHtml + "</div></div>";

        event.content = html;

        var published = new Date(item.timestamp + "+0000"); // This mygpo timestamp is UTC
        event.published = published.toISOString();

        event.object_type = "audio";
        event.object_verb = "listen";

        return event;
    };
}() );

