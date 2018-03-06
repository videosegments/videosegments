/**
 * VideoSegments. Browser extension to skip automatically unwanted content in videos
 * Copyright (C) 2017-2018  VideoSegments Team
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

'use strict';

if ( typeof this.chrome !== 'undefined' ) {
	this.browser = this.chrome;
}

var Wrapper = {
	/* video element */
	video: null,
	/* video id */
	id: null,
	/* settings */
	settings: null,
	
	/* events contexts */
	onPlayContext: null,
	onPauseContext: null,
	onRateChangeContext: null,
	
	/* current time of video when segmentation was requested */
	requestTime: null,
	
	/* segments data */
	timestampsCopy: null, // for simplified mode 
	timestamps: null,
	typesCopy: null, // for simplified mode 
	types: null,
	origin: null,
	
	/* timer */
	timer: null,
	
	/* playback */
	playbackRate: null,
	preventPlaybackRateUpdate: null,
	muteFirstEvents: null,	
		
	// called when "video" element appears on page 
	start: function(video, settings, muteFirstEvents) {
		log('Wrapper::start()');
		let self = this;
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		// save references
		this.video = video;
		this.settings = settings;
		
		// craete editor 
		this.editor = new Object(Editor);
		
		// bind events 
		this.onPlayContext = this.onPlay.bind(this);
		this.onPauseContext = this.onPause.bind(this);
		this.onRateChangeContext = this.onRateChange.bind(this);
		
		this.timestamps = [];
		this.types = [];
		this.origin = 'none';
		
		if ( muteFirstEvents ) {
			// chrome calls pause/play event at video start
			// workaround to fix it 
			this.muteFirstEvents = 2;
			// setTimeout(function() { self.muteFirstEvents = 0; }, 1000);
		}
		else {
			this.muteFirstEvents = 0;
		}
		
		this.preventPlaybackRateUpdate = false;
		
		// if video is ready to play (otherwise we can't get video id)
		if ( this.video.readyState > 3 ) {
			// get segmentation 
			this.getSegmentation();
		}
		else {
			// context of canplay event handler 
			let ctx = function() {
				self.video.removeEventListener('canplay', ctx);
				self.getSegmentation();
			}
			
			// wait for canplay event 
			this.video.addEventListener('canplay', ctx);
		}
	},
	
	// request segmentation from server 
	getSegmentation: function() {
		log('Wrapper::getSegmentation()');
		let self = this;
		
		this.requestTime = this.video.currentTime;
		
		let url = document.getElementsByClassName('ytp-title-link')[0].href;
		let match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
		if ( match && match[1].length == 11 ) { /* youtube video id == 11 */
			this.domain = 'youtube';
			this.id = match[1];
			
			if ( this.settings.autoPauseDuration > 0.0 ) {
				if ( this.video.paused === false ) {
					this.video.pause();
					
					this.timer = setTimeout(function() {
						self.video.play();
					}, this.settings.autoPauseDuration*1000);
				}
			}
			
			let pipelineFn = function(self, pipe) {
				pipe[0](self, function() {
					pipelineFn(self, pipe.slice(1));
				});
			}
			
			if ( this.settings.databasePriority === 'local' ) {
				pipelineFn(this, [this.getPendingSegmentation, this.getLocalSegmentation, this.getOfficialSegmentation, this.clearPauseTimer]);
			}
			else {
				pipelineFn(this, [this.getPendingSegmentation, this.getOfficialSegmentation, this.getLocalSegmentation, this.clearPauseTimer]);
			}
		}
	},
	
	getPendingSegmentation: function(self, callback) {
		log('Wrapper::getPendingSegmentation()');
		
		browser.storage.local.get({ pending: '' }, function(result) {
			if ( result.pending !== '' ) {
				var response = result.pending;
				if ( response.timestamps.indexOf(',') > 0 ) {
					response.timestamps = response.timestamps.split(',').map(parseFloat);
				}
				else {
					if ( response.timestamps === '' ) {
						response.timestamps = [];
					}
					else {
						response.timestamps = [parseFloat(response.timestamps)];
					}
				}
				response.types = response.types.split(',');
				browser.storage.local.remove(['pending']);
				
				self.timestamps = response.timestamps;
				self.timestamps.unshift(0.0);
				self.timestamps.push(parseFloat(self.video.duration.toFixed(2)));
						
				self.types = response.types;
				self.origin = 'pendingDatabase';
				self.onSegmentationReady();
			}
			else {
				callback();
			}
		});
	},
	
	getLocalSegmentation: function(self, callback) {
		log('Wrapper::getLocalSegmentation()');
		
		let video_id = self.domain + '-' + self.id;
		browser.storage.local.get({[video_id]: ''}, function(result) {
			if ( result[video_id] !== '' ) {
				self.timestamps = result[video_id].timestamps;
				self.timestamps.unshift(0.0);
				self.timestamps.push(parseFloat(self.video.duration.toFixed(2)));
						
				self.types = result[video_id].types;
				self.origin = 'localDatabase';
				self.onSegmentationReady();
			}
			else {
				callback();
			}
		});
	},
	
	getOfficialSegmentation: function(self, callback) {
		log('Wrapper::getOfficialSegmentation()', 'https://db.videosegments.org/api/v3/get.php?id=' + self.id);
		
		let xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://db.videosegments.org/api/v3/get.php?id=' + self.id);
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					let response = JSON.parse(xhr.responseText);
					if ( typeof response.timestamps !== 'undefined' ) {
						self.timestamps = response.timestamps;
						
						if ( self.timestamps[0] !== 0.0 ) {
							self.timestamps.unshift(0.0);
							self.timestamps.push(self.video.duration);
						}
						else {
							self.timestamps = [0.0, self.video.duration];
						}
						
						self.types = response.types;
						self.origin = 'officialDatabase';
						self.onSegmentationReady();
					}
					else {
						callback();
					}
				}
				else {
					callback();
				}
			}
		}
		
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send();
	},
	
	clearPauseTimer: function(self) {
		log('Wrapper::clearPauseTimer()');
		
		self.timer = null;
		self.video.play();
		
		self.origin = 'noSegmentation';
		self.onSegmentationReady();
	},
	
	onSegmentationReady: function() {
		log('Wrapper::onSegmentationReady()');
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
			
			this.video.play();
		}
		
		if ( this.timestamps ) {
			if ( this.types[this.types.length-1] === '-' ) {
				this.timestamps.pop();
				this.types.pop();
			}
			
			if ( this.settings.mode === 'simplified' ) {
				this.simplifySegmentation();
			}
			else {
				this.restoreSegmentation();
			}
			// do not merge to see duplicates 
			// this.mergeDuplicateSegments();
			
			this.insertSegmentsBar();
			
			if ( this.requestTime !== null ) {
				this.video.currentTime = Math.floor(this.requestTime);
			}
		}
		
		// this.onPlay();
		
		// hook essential events 
		this.video.addEventListener('play', this.onPlayContext);
		this.video.addEventListener('pause', this.onPauseContext);
		this.video.addEventListener('ratechange', this.onRateChangeContext);
		
		// if it's not iframe 
		if ( window.parent === window ) {
			this.editor.start(this, this.timestamps, this.types, this.origin, this.settings, 'youtube', this.id);
		}
	},
	
	insertSegmentsBar: function() {
		log('Wrapper::insertSegmentsBar()');
		
		if ( this.settings.segmentsBarLocation === 'none' ) {
			return;
		}
		
		let progressBar = document.getElementsByClassName("ytp-progress-bar-container")[0];
		let segmentsBar = document.createElement('ul');
		segmentsBar.id = 'vs-segmentsbar';
		
		if ( this.settings.segmentsBarLocation === 'separated' ) {
			progressBar.insertAdjacentElement("afterEnd", segmentsBar);
			// segmentsBar.style.marginTop = '1px';
		}
		else {
			progressBar.insertAdjacentElement("afterBegin", segmentsBar);
			if ( this.settings.segmentsBarLocation === 'overlay' ) {
				segmentsBar.style.zIndex = '100';
				segmentsBar.style.opacity = '0.5';
			}
		}
		
		let width, left = 0.0;
		for ( let i = 0; i < this.types.length; ++i ) {
			width = (this.timestamps[i+1] - this.timestamps[i]) / this.video.duration * 100;
			
			let segment = document.createElement('li');
			segment.style.width = width+'%';
			segment.style.backgroundColor = this.settings.segments[this.types[i]].color;
			segment.innerHTML = '&nbsp;';
			segmentsBar.insertAdjacentElement('beforeEnd', segment);
		}
	},
	
	removeSegmentsBar: function() {
		log('Wrapper::removeSegmentsBar()');
	
		let segmentsBar = document.getElementById('vs-segmentsbar');
		if ( segmentsBar ) {
			segmentsBar.remove();
		}
	},
	
	updateSegmentsBar: function(leftButton=true) {
		this.removeSegmentsBar();
		this.mergeDuplicateSegments(leftButton);
		this.insertSegmentsBar();
	},
	
	simplifySegmentation: function() {
		if ( this.types.length == 0 || this.types[0] == 'sk' || this.types[0] == 'pl' ) return;
		
		this.timestampsCopy = this.timestamps.slice();
		this.typesCopy = this.types.slice();
		for ( let i = 0; i < this.types.length ; ++i ) {
			if ( this.types[i] == 'c' || this.types[i] == 'ac' ) {
				this.types[i] = 'pl';
			}
			else { 
				this.types[i] = 'sk';
			}
		}
		this.mergeDuplicateSegments();
	},
	
	restoreSegmentation: function() {
		if ( this.types.length == 0 || (this.types[0] != 'sk' && this.types[0] != 'pl') ) return;
		
		if ( this.typesCopy && this.timestampsCopy ) {
			this.timestamps = this.timestampsCopy.slice();
			this.types = this.typesCopy.slice();
			this.timestampsCopy = null;
			this.typesCopy = null;
		}
		else {
			for ( let i = 0; i < this.types.length ; ++i ) {
				if ( this.types[i] == 'pl' ) {
					this.types[i] = 'c';
				}
				else { 
					this.types[i] = 'cs';
				}
			}
		}
	},
	
	mergeDuplicateSegments: function(leftMerge) {
		if ( leftMerge ) {
			for ( let i = 1; i < this.types.length ; ++i ) {
				if ( this.types[i] === this.types[i-1] ) {
					this.timestamps.splice(i, 1);
					this.types.splice(i, 1);
				}
			}
		}
		else {
			for ( let i = this.types.length-2; i >= 0; --i ) {
				if ( this.types[i+1] === this.types[i] ) {
					this.timestamps.splice(i+1, 1);
					this.types.splice(i+1, 1);
				}
			}
		}
	},
	
	onPlay: function() {
		log('Wrapper::onPlay()');
		
		// first call is nessesary and second one is false so mute him
		if ( this.muteFirstEvents == 1 ) {
			// log('*************');
			// log('*** muted ***');
			// log('*************');
			this.muteFirstEvents -= 1;
			return;
		}
		else {
			this.muteFirstEvents -= 1;
		}
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		if ( this.timestamps ) {
			let rewindSegment = this.getNextRewindSegment(0);
			if ( rewindSegment !== null ) {
				this.tryRewind(rewindSegment);
			}
		}
	},
	
	getNextRewindSegment: function(startSegment) {
		log('Wrapper::getNextRewindSegment()');
		
		let currentTime = Math.round(this.video.currentTime * 1e2) / 1e2;
		for ( let i = startSegment; i < this.types.length; ++i ) {
			if ( this.settings.segments[this.types[i]].skip == true && this.timestamps[i] >= currentTime ) {
				return i;
			}
		}
		
		return null;
	},
	
	tryRewind: function(rewindSegment) {
		log('Wrapper::tryRewind()');
		let self = this;
		
		let delay = this.timestamps[rewindSegment] - this.video.currentTime;
		if ( delay > 0 ) {
			this.timer = setTimeout(function() { self.tryRewind(rewindSegment); }, delay*(1000/this.video.playbackRate));
		}
		else {
			this.processSegment(this.video.currentTime, rewindSegment);
		}
	},
	
	processSegment: function(currentTime, segment) {
		log('Wrapper::processSegment()');
		let self = this;
		
		let duration = this.timestamps[segment+1] - currentTime;
		if ( duration > this.settings.segments[this.types[segment]].duration ) {
			browser.runtime.sendMessage({ 'updateTotalTime': this.timestamps[segment+1] - this.video.currentTime });
			this.video.currentTime = this.timestamps[segment+1];
			
			segment = this.getNextRewindSegment(segment+1);
			if ( segment !== null ) {
				this.tryRewind(segment);
			}
		}
		else {
			this.playbackRate = parseFloat(this.video.playbackRate);
			this.preventPlaybackRateUpdate = true;
			
			this.video.playbackRate = this.settings.segments[this.types[segment]].speed;
			
			let delay = duration*(1000/this.video.playbackRate);
			if ( delay > 500 ) delay -= 500; // timers have awful precision so start a little bit earlier
			this.timer = setTimeout(function() { self.restoreSpeed(segment); }, delay);
		}
	},
	
	restoreSpeed: function(segment) {
		log('Wrapper::restoreSpeed()');
		var self = this;
		
		let delay = this.timestamps[segment+1] - this.video.currentTime;
		if ( delay > 0 ) {
			this.timer = setTimeout(function() { self.restoreSpeed(segment); }, delay*(1000/this.video.playbackRate));
		}
		else {
			this.preventPlaybackRateUpdate = true;
			this.video.playbackRate = this.playbackRate;
			this.playbackRate = null;
			
			let nextSegment = this.getNextRewindSegment(segment+1);
			if ( nextSegment !== null ) {
				let delay = this.timestamps[nextSegment] - this.video.currentTime;
				if ( delay < 0 ) {
					this.processSegment(this.timestamps[nextSegment], nextSegment);
				}
				else {
					this.tryRewind(nextSegment);
				}
			}
		}
	},
	
	onPause: function() {
		log('Wrapper::onPause()');
		
		if ( this.muteFirstEvents == 1 ) {
			return;
		}
		
		if ( this.playbackRate ) {
			this.preventPlaybackRateUpdate = true;
			this.video.playbackRate = this.playbackRate;
			this.playbackRate = null;
		}
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
	
	onRateChange: function() {
		log('Wrapper::onRateChange()', this.preventPlaybackRateUpdate);
		
		if ( this.preventPlaybackRateUpdate === false ) {
			if ( this.timer ) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			
			let rewindSegment = this.getNextRewindSegment(0);
			this.tryRewind(rewindSegment);
		}
		else {
			this.preventPlaybackRateUpdate = false;
		}
	},
	
	updateSettings: function(settings) {
		let modeChanged = settings.mode != this.settings.mode;
		this.settings = settings;
		
		if ( modeChanged ) {
			if ( this.settings.mode === 'simplified' ) {
				this.simplifySegmentation();
				this.mergeDuplicateSegments();
			}
			else {
				this.restoreSegmentation();
			}
		}
		this.updateSegmentsBar();
		
		if ( window.parent === window ) {
			this.editor.end();
			this.editor.start(this, this.timestamps, this.types, this.origin, this.settings, 'youtube', this.id);
		}
	},
	
	// getCategory: function() {
		// let moreButton = document.getElementById('more');
		// moreButton.click();
		
		// let container = document.getElementsByTagName('ytd-video-secondary-info-renderer')[0].getElementsByTagName('ytd-metadata-row-renderer')[0];
		// if ( container ) {
			// browser.runtime.sendMessage( { gotCategory: container.getElementsByTagName('a')[0].innerHTML } );
		// }
		
		// let lessButton = document.getElementById('less');
		// lessButton.click();
	// },
	
	// getChannel: function() {
		// let container = document.getElementById('owner-name');
		// if ( container ) {
			// browser.runtime.sendMessage( { gotChannel: container.getElementsByTagName('a')[0].innerHTML } );
		// }
	// },
	
	// called when "video" element "src" is changed
	end: function() {
		log('Wrapper::end()');
		
		if ( this.playbackRate ) {
			this.preventPlaybackRateUpdate = true;
			this.video.playbackRate = this.playbackRate;
			this.playbackRate = null;
		}
		
		// remove hooks 
		this.video.removeEventListener('play', this.onPlayContext);
		this.video.removeEventListener('pause', this.onPauseContext);
		this.video.removeEventListener('ratechange', this.onRateChangeContext);
		
		this.requestTime = null;
		
		this.timestamps = null;
		this.types = null;
		this.origin = null;
		
		this.removeSegmentsBar();
		
		// if it's not iframe 
		if ( window.parent === window ) {
			this.editor.end();
		}
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
};