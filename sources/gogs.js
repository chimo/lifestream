// FIMXE: hard-coded hostname

( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {},
        getTitle,
        getContent;

    getTitle = function( $elm ) {
        var $title = $elm.find( ".text-bold" ),
            $links = $title.find( "a" ),
            $branch = $links.eq( 1 ),
            $repo = $links.eq( 2 );

        return "Pushed to <a href='http://code.chromic.org" + $branch.attr( "href" ) + "'>" + $branch.text() + "</a> at " +
            "<a href='http://code.chromic.org" + $repo.attr( "href" ) + "'>" + $repo.text() + "</a>";
    };

    getContent = function( $elm, $ ) {
        var $commits = $elm.find( ".content li" ),
            html = "<ul>";

        $commits.each( function() {
            var $commit = $( this ),
                $link = $commit.find( "a" ).first(),
                href = $link.attr( "href" ),
                $message = $commit.find( ".text-truncate" ).first();

            // TODO: should check for http:// as well
            //       replace with regex
            if ( href.substr( 0, 8 ) !== "https://" ) {
                href = "http://code.chromic.org" + href;
            }

            html += "<li><a href='" + href + "'>" + $link.text() + "</a> " +
                "<span class='commit-message'>" + $message.text() + "</span></li>";
        } );

        return html + "</ul>";
    };

    exports.parse = function( subscription, data ) {
        var event = {},
            cheerio = require( "cheerio" ),
            $ = cheerio.load( data ),
            $latest = $( ".news" ).first();

        event.title = getTitle( $latest );
        event.source = ""; // TODO: Link to standalone page (lifestream event) -- once we create them for all event types(?)
        event.published = $( ".time-since" ).attr( "title" );
        event.content = getContent( $latest, $ );
        event.objectType = "file"; // ?
        event.verb = "update"; // ?

        return event;
    };
}() );

