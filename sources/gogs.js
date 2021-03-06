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
            $firstLink = $items.first().find( "a" ), // First commit in the list
            $lastLink = $items.last().find( "a" ), // Either the last commit or the "compare" link
            urlParts = urlParser.parse( topic );

        hostname = urlParts.protocol + "//" + urlParts.host;

        event.title = getTitle( $latest );

        // The last link is a "View comparison" link, or there's only one commit in the list.
        // In both cases, we use that as a permalink.
        if ( $lastLink.text().match( /^View comparison/ ) || $firstLink.is( $lastLink ) ) {
            event.foreign_url = hostname + $lastLink.attr( "href" );
        } else { // The last link is a commit, we'll have to build the "compare" URL ourselves
            event.foreign_url = hostname +
                $firstLink.attr( "href" ).replace( "/commit/", "/compare/" ) + "..." + // Change from 'commit' URL to 'compare'
                $lastLink.attr( "href" ).split( "/" ).splice( -1, 1 ); // Get the hash of the last commit
        }

        event.published = $( ".time-since" ).attr( "title" );
        event.content = getContent( $items, $ );
        event.object_type = "file"; // ?
        event.object_verb = "update"; // ?

        return event;
    };
}() );

