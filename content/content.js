/*
    VideoSegments. Extension to Cut YouTube Videos. 
    Copyright (C) 2017-2018  Alex Lys

    This file is part of VideoSegments.

    VideoSegments is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    VideoSegments is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with VideoSegments. If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

// cross browser support 
window.browser = window.browser || window.chrome;

// global variables for settings and console.log output 
let settings, log, observer;
// load settings 
getSettings().then((result) => {
    // enable debug 
    if (result.debug === true) {
        log = console.log.bind(console);
        log('settings loaded');
    } else {
        log = function () {};
    }

    // save settings 
    settings = result;
    // start observer 
    observer = new Observer();
});

browser.runtime.onMessage.addListener(request => {
    if (typeof request.getChannel !== 'undefined') {
        let container = document.querySelector('yt-formatted-string#owner-name.style-scope.ytd-video-owner-renderer');
        if (container) {
            browser.runtime.sendMessage({
                gotChannel: container.getElementsByTagName('a')[0].innerHTML
            });
        }
    }
    else if ( typeof request.prop !== 'undefined' ) {
        observer.updateSettings(request.prop, request.value);
    }
});