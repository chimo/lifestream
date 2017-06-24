( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {};

    exports.parse = function( data ) {
        var event = {},
            json = null,
            html = '';

        try {
            json = JSON.parse( data );
        } catch(e) {
            console.log( e.message );

            return null;
        }

        json = json.data[ 0 ];

        event.title = "Watched";
        event.foreign_url = "https://watching.chromic.org";

        html = "<div class='watching'><h3 class='watching__title'>" + json.title + "</h3>";
        html += "<div class='watching__content'><div class='watching__details-wrapper'>";

        if ( json.media_type === "tv" ) {
            var episode = json.latest_episode;

            html += "<p class='episode__name'><span class='dim'>Episode title: </span>" +
                episode.name + "</p>";
            html += "<p class='episode__season-number'><span class='dim'>Season: </span>" +
                episode.season_number + "</p>";
            html += "<p class='episode__episode-number'><span class='dim'>Episode: </span>" +
                episode.episode_number + "</p>";
        }

        html += "<p class='watching__genre'><span class='dim'>Genre: </span>" + json.genre + "</p>";
        html += "</div>";

        html += "<div class='watching__poster-wrapper'><img src='https://watching.chromic.org/assets/poster/"
            + json.poster.substr(1) + "' alt='Poster'></div></div>";

        event.content = html;

        var published = new Date(json.created_at * 1000);
        event.published = published.toISOString();

        event.object_type = "video";
        event.object_verb = "watch";

        return event;
    };
}() );

