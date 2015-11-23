( function() {
    /*global require: false, JSON: false, console: false*/
    "use strict";

    var ls,
        config,
        fs = require( "fs" ),
        Lifestream = require( "./classes/Lifestream.js" );

    /**
     * Read config file
     */

    try {
        config = fs.readFileSync( "./config.json" );
        config = JSON.parse( config );
    } catch ( err ) {
        if ( err.code === "ENOENT" ) {
            console.log( "Config file not found." );

            return;
        } else if ( err instanceof SyntaxError ) {
            console.log(
                "Config file malformed.\n" +
                err.message + "\n"
            );

            return;
        } else {
            throw err;
        }
    }

    ls = new Lifestream( config );

}() );
