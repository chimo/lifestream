( function() {
    /*global module: false, require: false*/
    "use strict";

    var exports = module.exports = {},
        getTitle,
        getContent,
        urlParser = require( "url" ),
        hostname;

    getTitle = function( $elm ) {
        var $title = $elm.find( ".news > p" ),
            $links = $title.find( "a" ),
            $branch = $links.eq( 1 ),
            $repo = $links.eq( 2 );

        return "Pushed to <a href='" + hostname + $branch.attr( "href" ) + "'>" + $branch.text() + "</a> at " +
            "<a href='" + hostname + $repo.attr( "href" ) + "'>" + $repo.text() + "</a>";
    };

    getContent = function( $commits, $ ) {
        var html = "<ul>";

        $commits.each( function() {
            var $commit = $( this ),
                $link = $commit.find( "a" ).first(),
                linkText = $link.text(),
                href = $link.attr( "href" ),
                $message = $commit.find( ".text" ).first();

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

    exports.parse = function( data, topic ) {
        var event = {},
            cheerio = require( "cheerio" ),
            $ = cheerio.load( data, { decodeEntities: true } ),
            $latest = $( ".feeds > .news" ).first(),
            $items = $latest.find( ".content li" ), // Commits + optional "compare" link
            $lastLink = $items.last().find( "a" ), // Either the last commit or the "compare" link
            urlParts = urlParser.parse( topic );

        hostname = urlParts.protocol + "//" + urlParts.host;

        event.title = getTitle( $latest );

        // We check if the last link is a "View comparison" link.
        // If so, use the "href" as the source link. If not, blank url (for now)
        event.foreign_url = ( $lastLink.text().match( /^View comparison/ ) ) ? $lastLink.attr( "href" ) : "";

        event.published = $( ".time-since" ).attr( "title" );
        event.content = getContent( $items, $ );
        event.objectType = "file"; // ?
        event.verb = "update"; // ?

        return event;
    };
}() );

