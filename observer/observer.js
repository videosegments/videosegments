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

class Observer {
    constructor() {
        // look into HTMLcollection instead of hundreds of mutations 
        // https://stackoverflow.com/a/39332340
        this.collection = document.getElementsByTagName('video');
        this.player = null;

        // observe mutations in window.body 
        this.observer = new MutationObserver(() => {
            this.onBodyMutations()
        });
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // youtube throw second "play" event in chrome if new tab is video 
        this.mutePlayEvent = false;
        if (typeof InstallTrigger === 'undefined') {
            let match = window.location.href.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
            if (match && match[1].length == 11) { 
                this.mutePlayEvent = true;
            }
        }
        log('looking for player...');        
    }

    onBodyMutations() {
        // if "video" element exists 
        if (this.collection[0] && this.collection[0].src) {
            // disable observing of window.body mutations 
            this.observer.disconnect();

            log('player found');

            // start observing for video.src changes 
            this.observer = new MutationObserver(() => {
                this.onVideoChanges()
            });
            this.observer.observe(this.collection[0], {
                attributes: true,
                attributeFilter: ['src']
            });

            // start video player wrapper 
            this.player = new Player(this.collection[0], this.mutePlayEvent);
            this.mutePlayEvent = false;
        }
    }

    onVideoChanges() {
        // disconnect observer 
        this.observer.disconnect();

        log('video src changed');

        // observe mutations in window.body 
        this.observer = new MutationObserver(() => {
            this.onBodyMutations()
        });
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // cleanup player 
        this.player.remove();
        // clear reference 
        this.player = null;
    }

    updateSettings(prop, value) {
        if (this.player !== null) {
            this.player.updateSettings(prop, value);
        }
    }
}