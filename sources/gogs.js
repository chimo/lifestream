( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {},
        getTitle,
        getContent,
        urlParser = require( "url" ),
        hostname;

    getTitle = function( $elm ) {
        var $title = $elm.find( ".text-bold" ),
            $links = $title.find( "a" ),
            $branch = $links.eq( 1 ),
            $repo = $links.eq( 2 );

        return "Pushed to <a href='" + hostname + $branch.attr( "href" ) + "'>" + $branch.text() + "</a> at " +
            "<a href='" + hostname + $repo.attr( "href" ) + "'>" + $repo.text() + "</a>";
    };

    getContent = function( $elm, $ ) {
        var $commits = $elm.find( ".content li" ),
            html = "<ul>";

        $commits.each( function() {
            var $commit = $( this ),
                $link = $commit.find( "a" ).first(),
                linkText = $link.text(),
                href = $link.attr( "href" ),
                $message = $commit.find( ".text-truncate" ).first();

            if ( !href.match( /^https?:\/\// ) ) {
                href = hostname + href;
            }

            // Gogs always says "View comparison for these 2 commits"
            // regardless of how many commits there are.
            if ( linkText.match( /^View comparison/ ) ) {
                linkText = "View comparison";
            }

            html += "<li><a href='" + href + "'>" + linkText + "</a> " +
                "<span class='commit-message'>" + $message.text() + "</span></li>";
        } );

        return html + "</ul>";
    };

    exports.parse = function( subscription, data ) {
        var event = {},
            cheerio = require( "cheerio" ),
            $ = cheerio.load( data, { decodeEntities: true } ),
            $latest = $( ".news" ).first(),
            urlParts = urlParser.parse( subscription.topic );

        hostname = urlParts.protocol + urlParts.host;

        event.title = getTitle( $latest );
        event.source = ""; // TODO: Link to standalone page (lifestream event) -- once we create them for all event types(?)
        event.published = $( ".time-since" ).attr( "title" );
        event.content = getContent( $latest, $ );
        event.objectType = "file"; // ?
        event.verb = "update"; // ?

        return event;
    };
}() );

