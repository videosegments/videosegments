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

class Player
{
    constructor(video)
    {
        // save video reference 
        this.video = video;

        // extract youtube video ID 
        let tmp = document.getElementsByClassName('ytp-title-link')[0];
        let src = (tmp?tmp.href:null) || (this.video?this.video.src:null);
        this.id = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)[1];

        let self = this;
        // play event will be called several times before video start 
        this.onPlayBeforeLoadedContext = () => {
            // if autopause enabled 
            if ( settings.autoPauseDuration > 0.0 ) {
                // round video's current time because it already played 0.0001'th of second  
                self.video.currentTime = Math.round(self.video.currentTime);
                log('autopausing video at: ', self.video.currentTime);
                
                // if video is not paused 
                if ( self.video.paused === false ) {
                    // pause video 
                    self.video.pause();
                    
                    // if autopause timer doesn't exists 
                    if ( !self.timer ) {
                        // set autopause timer 
                        self.timer = setTimeout(() => {
                            log('autopause timeout');
                            this.video.removeEventListener('play', this.onPlayBeforeLoadedContext);
                            self.video.play();
                        }, settings.autoPauseDuration*1000);
                    }
                }
            }
        }

        // listen for play events before segmentation is loaded 
        this.video.addEventListener('play', this.onPlayBeforeLoadedContext);
        // force pause for video (required for playlists)
        this.onPlayBeforeLoadedContext();

        // if video is ready to play 
        if ( this.video.readyState > 3 ) {
            // request segmentation 
            this.getSegmentation();
            log('video stream is ready');
        }
        else {
            // when video is ready to play 
            let ctx = function() {
				self.video.removeEventListener('canplay', ctx);
				self.getSegmentation();
			}
            
            // wait for video 
            this.video.addEventListener('canplay', ctx);
            log('waiting for video to load...');
        }
    }

    getSegmentation() {
        let self = this;
        
        log('requesting segmentation...');
        this.segmentation = null;
        // request local and community segmentations 
        this.getCommunitySegmentation().then(segmentation => { 
            self.channel = segmentation.channel;
            if ( typeof segmentation.types === 'undefined' ) {
                self.onGotSegmentation('community', {}, 'local'); 
            }
            else {
                self.onGotSegmentation('community', {timestamps: segmentation.timestamps, types: segmentation.types}, 'local'); 
            }
        });
        this.getLocalSegmentation().then(segmentation => self.onGotSegmentation('local', segmentation, 'community'));

        // create segmentsbar 
        let progressBar = document.getElementsByClassName("ytp-progress-bar-container")[0] || document.getElementsByClassName("no-model cue-range-markers")[0];
        this.segmentsbar = new Segmentsbar(progressBar);
    }

    onGotSegmentation(origin, segmentation, secondaryOrigin) {
        log('got ' + ((settings.databasePriority === origin)?'primary':'secondary') + ' segmentation:', origin, segmentation);

        // save current segmentation 
        this[origin] = segmentation;
        // if this segmentation have priority 
        if ( settings.databasePriority === origin ) {
            // if this segmentation exists 
            if ( this[origin] && this[origin].types ) {
                // set as primary 
                this.segmentation = segmentation;
                this.segmentation.origin = origin;
                log('primary segmentation is ready');
            }
            // if secondary segmentation exists 
            else if ( this[secondaryOrigin] && this[secondaryOrigin].types ) {
                // set secondary segmentation as primary 
                this.segmentation = this[secondaryOrigin];
                this.segmentation.origin = origin;
                log('no primary segmentation exists, use secondary as primary');
            }
        }
        // save this segmentation as secondary 
        else {
            // if no primary segmentation exists 
            if ( typeof this[settings.databasePriority] !== 'undefined' && typeof this[settings.databasePriority].types !== 'undefined' ) {
                // set secondary segmentation as primary 
                this.segmentation = segmentation;
                this.segmentation.origin = origin;
                log('no primary segmentation exists, use secondary as primary');
            }
        }

        // if segmentation ready 
        if ( this.segmentation !== null ) {
            // remove filler for local unfinished segmentation 
            if ( (typeof this.segmentation.types !== 'undefined') && this.segmentation.types[this.segmentation.types.length-1] === '-' ) {
                this.segmentation.timestamps.pop();
                this.segmentation.types.pop();
            }

            this.onSegmentationReady();
        }
        // in case none of segmentations exists 
        else if ( typeof this[origin] !== 'undefined' && typeof this[secondaryOrigin] !== 'undefined' ) {
            log('no segmentations exists');
            this.segmentation = {origin: 'NoSegmentation'};
            this.onSegmentationReady();
        }
    }

    onSegmentationReady() {
        if ( typeof this.editor !== 'undefined' ) {
            return;
        }

        log(this.segmentation.origin);

        // remove play listener 
        this.video.removeEventListener('play', this.onPlayBeforeLoadedContext);

        // bind events so "this" will be reference to object instead of "video"
        this.onPlayEventContext = this.onPlayEvent.bind(this);
        this.onPauseEventContext = this.onPauseEvent.bind(this);
        this.onRateChangeEventContext = this.onRateChangeEvent.bind(this);

        // listen for events 
        this.video.addEventListener('play', this.onPlayEventContext);
        this.video.addEventListener('pause', this.onPauseEventContext);
        this.video.addEventListener('ratechange', this.onRateChangeEventContext);

        // if autopause timer is working 
        if ( this.timer ) {
            // round up time again  
            this.video.currentTime = Math.round(this.video.currentTime);

            // disable timer 
            clearTimeout(this.timer);
            this.timer = undefined;
            // start video playback 
            this.video.play();
        }
        else {
            // fake play event 
            this.onPlayEventContext();
        }

        if ( settings.mode === 'simplified' ) {
            this.originalSegmentation = this.segmentation;
            this.segmentation = this.simplifySegmentation(this.segmentation);
            this.segmentation.origin = this.originalSegmentation.origin;
        }

        this.segmentsbar.set(this.segmentation.timestamps, this.segmentation.types, this.video.duration);
        log('segmentsbar created');

        // start editor 
        this.editor = new Editor(this, this.segmentsbar, this.video, this.id, this.segmentation);
    }

    // TODO: move get request to utils 
    getCommunitySegmentation() {
        return new Promise(resolve => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://db.videosegments.org/api/v3/get.php?id=' + this.id + '&filter=' + (settings.filters.channelBased.enabled===true?'1':'0'));

            xhr.onreadystatechange = () => {
                if ( xhr.readyState == 4 ) {
                    if ( xhr.status == 200 ) {
                        let response = JSON.parse(xhr.responseText);
                        response = this.prepareSegmentation(response);
                        resolve(response || {});
                    }
                    else {
                        resolve({});
                    }
                }
            };

            xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
            xhr.send();
        });
    }

    getLocalSegmentation() {
        let self = this;
        return new Promise(resolve => {
            let storageId = 'youtube-' + self.id;
            browser.storage.local.get({[storageId]: ''}, function(result) {
                if ( result[storageId] !== '' ) {
                    let response = self.prepareSegmentation({timestamps: result[storageId].timestamps, types: result[storageId].types});
                    resolve(response || {});
                }
                else {
                    resolve({});
                }
            });
        });
    }

    getPendingSegmentation() {

    }

    prepareSegmentation(segmentation) {
        if ( typeof segmentation.types !== 'undefined' ) {
            segmentation.timestamps.unshift(0.0);
            segmentation.timestamps.push(parseFloat(this.video.duration));
        }
        
        return segmentation;
    }

    simplifySegmentation(segmentation)
    {
        if ( typeof segmentation.types === 'undefined' ) {
            return {timestamps: undefined, types: undefined};
        }

        let simplified = {timestamps: [0.0], types: []};

        let lastType = this.getSegmentSimplifiedType(segmentation.types[0]);
        for ( let i = 1; i < segmentation.types.length; ++i ) {
            if ( this.getSegmentSimplifiedType(segmentation.types[i]) !== lastType ) {
                simplified.timestamps.push(segmentation.timestamps[i]);
                simplified.types.push(lastType);

                lastType = this.getSegmentSimplifiedType(segmentation.types[i]);
            }
        }

        if ( this.getSegmentSimplifiedType(segmentation.types[segmentation.types.length - 1]) === lastType ) {
            simplified.timestamps.push(segmentation.timestamps[segmentation.timestamps.length - 1]);
            simplified.types.push(lastType);
        }

        return simplified;
    }

    restoreSegmentation(segmentation)
    {

    }

    getSegmentSimplifiedType(type)
    {
        if ( type === 'c' || type == 'ac' ) {
            return 'pl';
        }
        else {
            return 'sk';
        }
    }

    onPlayEvent() {
        log('player::onPlayEvent: ', this.video.currentTime);

        if ( this.segmentation ) {
            if ( this.timer ) {
                clearTimeout(this.timer);
                this.timer = undefined;
            }

            let segmentToRewind = this.findNextSegmentToRewind(0);
            if ( segmentToRewind !== null ) {
                this.tryRewind(segmentToRewind);
            }
        }
    }

    tryRewind(toSegmentNumber) {
        let delay = this.segmentation.timestamps[toSegmentNumber] - this.video.currentTime;
        if ( delay <= 0 ) {
            this.video.currentTime = this.segmentation.timestamps[toSegmentNumber+1];
            toSegmentNumber = this.findNextSegmentToRewind(toSegmentNumber);
            delay = this.segmentation.timestamps[toSegmentNumber] - this.video.currentTime;
        }

        if ( toSegmentNumber !== null ) {
            let self = this;
            this.timer = setTimeout(function() { self.tryRewind(toSegmentNumber); }, delay*(1000/this.video.playbackRate));
        }
    }

    findNextSegmentToRewind(currentSegmentNumber) {
        if (!this.segmentation || !this.segmentation.timestamps || !this.segmentation.types) return null;

        let currentTime = Math.round(this.video.currentTime * 100) / 100;
        for ( let i = currentSegmentNumber; i < this.segmentation.types.length; ++i ) {
			if ( settings.segments[this.segmentation.types[i]].skip == true && this.segmentation.timestamps[i] >= currentTime ) {
				return i;
			}
		}
		
		return null;
    }

    onRateChangeEvent() {
        onPlayEvent();
    }

    onPauseEvent() {
        if ( this.timer ) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    remove() {
        this.video.removeEventListener('play', this.onPlayEventContext);
        this.video.removeEventListener('pause', this.onPauseEventContext);
        this.video.removeEventListener('ratechange', this.onRateChangeEventContext);

        if ( this.timer ) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        this.segmentation = undefined;

        this.editor.remove();
        this.editor = undefined;

        this.segmentsbar.remove();
        this.segmentsbar = undefined;
    }
}