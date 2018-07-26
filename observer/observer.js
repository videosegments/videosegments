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

        let self = this;
        // observe mutations in window.body 
        this.observer = new MutationObserver(() => {
            self.onBodyMutations()
        });
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        log('looking for player...');
    }

    onBodyMutations() {
        // if "video" element exists 
        if (this.collection[0] && this.collection[0].src) {
            // disable observing of window.body mutations 
            this.observer.disconnect();

            log('player found');

            let self = this;
            // start observing for video.src changes 
            this.observer = new MutationObserver(() => {
                self.onVideoChanges()
            });
            this.observer.observe(self.collection[0], {
                attributes: true,
                attributeFilter: ['src']
            });

            // start video player wrapper 
            this.player = new Player(self.collection[0]);
        }
    }

    onVideoChanges() {
        // disconnect observer 
        this.observer.disconnect();

        log('video src changed');

        let self = this;
        // observe mutations in window.body 
        this.observer = new MutationObserver(() => {
            self.onBodyMutations()
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
}