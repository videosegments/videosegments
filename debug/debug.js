'use strict';

function dbgmsg(...args) {
    if ( settings.debug === true ) {
        console.log(...args);
    }
}