/**
 * VideoSegments. Browser extension to skip automatically unwanted content in videos
 * Copyright (C) 2017  VideoSegments Team
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


/**
 * test urls
 * cutscene - content - cutscene https://www.youtube.com/watch?v=QIedr_9_9hA
 * content - credits https://www.youtube.com/watch?v=OLqeAH5D1uo
 *
 * github: https://github.com/videosegments/videosegments
 */
 
'use strict';
 
// debug message to be sure script is loaded 
// console.log('[VideoSegments] index.js injected');

// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}
// var browser = this.browser;

/**
 * Main class to handle media player
 */
var mediaPlayerWrapper = {
	/* player element */
	mediaPlayer: null,
	/* url of video */
	url: null,
	/* user settings */
	settings: null,
	/* information about source of video */
	sourceInformation: null,
	
	/* events contexts */
	eventContexts: {},
	
	/* json-like object with segments data */
	segmentsData: null,
	/* segments data from second-priority database */
	secondPrioritySegmentsData: null,
	
	/* segments bar */
	segmentsBar: null,
	
	/* time of segments request */
	requestTime: null,
	/* timer for rewinding */
	rewindTimer: null,
	/* pause timer for loading */
	pauseTimer: null,
	
	/* defaultSpeed */
	defaultSpeed: null,
	/* do not update default playback rate */
	preventUpdate: null,
	/* number of previous segment */
	previousSegment: null,
	
	/* segmentation tools */
	editor: null,
	/* fullscreen URI */
	fullScreenURI: null,
	/* was created after fullscreen */
	afterFullScreen: null,
	
	/* 
	 * check if video hosted on supported domain 
	 * and load user settings 
	 */
	init: function(mediaPlayer, settings) {
		// console.log('mediaPlayerWrapper::init()');
		
		// save mediaPlayer reference
		this.mediaPlayer = mediaPlayer;
		// save user settings 
		this.settings = settings;
		// reset url
		this.url = null;
		
		this.sourceInformation = {domain:null, id:null};
		this.editor = Object.create(editorWrapper);
		this.afterFullScreen = false;
		
		// bind contexts to remove them if unnesessary
		// this.eventContexts.onDurationChange = this.onDurationChange.bind(this);
		this.eventContexts.onPlay = this.onPlay.bind(this);
		this.eventContexts.onPause = this.onPause.bind(this);
		this.eventContexts.onRateChange = this.onRateChange.bind(this);
		// this.eventContexts.onSegmentsUpdated = this.onSegmentsUpdated.bind(this);
		this.eventContexts.onCanPlay = this.onCanPlay.bind(this);
		// this.eventContexts.onDurationChange = this.onDurationChange.bind(this);
		
		// there is several events related to video status update:
		// loadstart - duration is NaN for several browsers
		// durationchange - may be called with NaN duration but will be called again with proper duration 
		// other events being called later 
		// listen for duration change
		// this.mediaPlayer.addEventListener("durationchange", this.eventContexts.onDurationChange);
		this.mediaPlayer.addEventListener("canplay", this.eventContexts.onCanPlay);
		// althrough loading of preferances can take time and video already playing 
		// so in this case we have to start manually
		// console.log('this.mediaPlayer.readyState:', this.mediaPlayer.readyState);
		if ( this.mediaPlayer.readyState >= 3 ) {
			// console.log('Forcing canplay event');
			this.onCanPlay();
			// this.onDurationChange();
		}
		
		var fullscreenEvent;
		if ( typeof InstallTrigger == 'undefined' ) {
			fullscreenEvent = 'webkitfullscreenchange';
		}
		else {
			fullscreenEvent = 'mozfullscreenchange';
		}
		
		var self = this;
		document.addEventListener(fullscreenEvent, function() {
			var isFullScreen = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
			if ( !isFullScreen ) {
				self.fullScreenURI = self.mediaPlayer.baseURI;
			}
		});
		
		// console.log(this.mediaPlayer.duration + ' ' + this.mediaPlayer.baseURI + ' ' + this.url);
	},
	
	onCanPlay: function() {
		// console.log('mediaPlayerWrapper::onCanPlay()', this.settings.showSegmentationTools, this.fullScreenURI, this.fullScreenURI != this.mediaPlayer.baseURI);
		
		// reset fullscreen state 
		this.afterFullScreen = false;
		// if video changed during fullscreen 
		if ( this.settings.showSegmentationTools && this.fullScreenURI && this.fullScreenURI != this.mediaPlayer.baseURI ) {
			this.createSegmentationTools();
			this.fullScreenURI = null;
			// prevent second segmentation tools after video change in fullscreen 
			this.afterFullScreen = true;
		}
		
		// when video is changed baseURI changed too 
		if ( this.url == this.getVideoUrl() ) {
			// do nothing if urls matches 
			return;
		}
		
		// if called before duration is set 
		if ( isNaN(this.mediaPlayer.duration) ) {
			// console.log('nan duration');
			// wait for proper duration 
			return;
		}
		
		// console.log('mediaPlayerWrapper::onCanPlay()');
		if ( this.requestTime === null ) {
			this.requestTime = this.mediaPlayer.currentTime.toFixed();
		}
		
		// remove segment bar 
		this.removeSegmentBar();
		
		// clear segments data 
		this.segmentsData = null;
		this.secondPrioritySegmentsData = null;
		
		if ( this.defaultSpeed ) {
			this.preventUpdate = true;
			this.mediaPlayer.playbackRate = this.defaultSpeed;
			this.defaultSpeed = null;
		}
		
		// reset previous segment 
		this.previousSegment = null;
		
		// remove event listeners 
		this.mediaPlayer.removeEventListener("play", this.eventContexts.onPlay);
		this.mediaPlayer.removeEventListener("pause", this.eventContexts.onPause);
		this.mediaPlayer.removeEventListener("ratechange", this.eventContexts.onRateChange);
				
		// get video source information (domain and id)
		this.sourceInformation = this.getVideoSourceInformation();
		
		// if supported domain and id found
		if ( this.sourceInformation ) {
			// update url 
			// this.url = this.mediaPlayer.baseURI;
			this.url = this.getVideoUrl();
			
			/* request segments */
			// 3th argument is current time because request will take time and 
			// we may have to rewind it with rounding in case of first segment must be skipped
			// now handled by variable 
			this.requestSegments(this.sourceInformation.domain, this.sourceInformation.id);
		}
	},
	
	/* 
	 * extract domain and id from baseURI of media player 
	 * will growth when other domains will be added
	 */
	getVideoSourceInformation: function() {
		// console.log('mediaPlayerWrapper::getVideoSourceInformation()');
		
		// youtube https://stackoverflow.com/a/6904504
		var match = this.getVideoUrl().match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
		if ( match && match[1].length == 11 /* youtube video id length == 11 */ ) {
			return {domain: 'youtube', id: match[1]};
		}
		
		return null;
	},
	
	getVideoUrl: function() {
		if ( this.sourceInformation.domain === 'youtube' ) {
			// return this.mediaPlayer.baseURI;
			// if video is in fullscreen mode baseURI will remain unchanged so as
			// workaround url can be extracted from video title 
			return document.getElementsByClassName('ytp-title-link')[0].href;
		}
		
		return this.mediaPlayer.baseURI;
	},
	
	/* 
	 * request segments from database 
	 */
	requestSegments: function(domain, id) {
		// console.log('mediaPlayerWrapper::requestSegments()');
		
		var self = this;
		// if user prefer to wait until segments are loaded 
		if ( this.settings.autoPauseDuration > 0.0 ) {
			// prevent resuming of user-paused videos
			if ( !this.mediaPlayer.paused ) {
				// pause player  
				this.mediaPlayer.pause();
				// start timer 
				this.pauseTimer = setTimeout(function() {
					self.mediaPlayer.play();
					// console.log('requestSegments() timeout');
				}, this.settings.autoPauseDuration*1000);
			}
		}
		
		// console.log('request: https://db.videosegments.org/get_segments.php?domain=' + domain + '&' + 'video_id=' + id);
		this.editor.destroy();
		
		// pipeline to bypass callback hell
		// https://www.pluralsight.com/guides/front-end-javascript/introduction-to-asynchronous-javascript
		if ( this.settings.databasePriority === 'local' ) {
			this.getSegmentation(self, domain, id, [this.getLocalSegmentation, this.getOfficialSegmentation, this.getPendingSegmentation, this.killAutoPauseTimer]);
		}
		else {
			this.getSegmentation(self, domain, id, [this.getOfficialSegmentation, this.getLocalSegmentation, this.getPendingSegmentation, this.killAutoPauseTimer]);
		}
	},
	
	getSegmentation: function(self, domain, id, tasks) {
		// console.log('mediaPlayerWrapper::getSegmentation()');
		
		tasks[0](self, domain, id, function() {
			self.getSegmentation(self, domain, id, tasks.slice(1));  
		});
	},
	
	getOfficialSegmentation: function(self, domain, id, callback) {
		// console.log('mediaPlayerWrapper::getOfficialSegmentation()');
		
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://db.videosegments.org/get.php?domain=' + domain + '&' + 'id=' + id);
		xhr.onreadystatechange = function() { 
			// console.log(xhr);
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log(xhr.responseText);
					
					var response = JSON.parse(xhr.responseText);
					var votes = response.votes;
					if ( typeof response.timestamps !== 'undefined' ) {
						if ( self.segmentsData === null ) {
							self.onGotSegments(response, 'officialDatabase', votes);
						}
						else {
							self.secondPrioritySegmentsData = response;
							if ( self.secondPrioritySegmentsData.timestamps[0] != 0.0 ) {
								self.secondPrioritySegmentsData.timestamps.unshift(0.0);
								self.secondPrioritySegmentsData.timestamps.push(self.mediaPlayer.duration);
							}
							else {
								self.secondPrioritySegmentsData.timestamps = [0.0, self.mediaPlayer.duration];
							}
						}
					}
				}
				
				if ( callback ) {
					callback();
				}
			}
		}
		
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send();
	},
	
	getLocalSegmentation: function(self, domain, id, callback) {
		// console.log('mediaPlayerWrapper::getLocalSegmentation()');
		
		var video_id = domain + '-' + id;
		browser.storage.local.get({ [video_id]: '' }, function(result) {
			if ( result[video_id] !== '' ) {
				var response = result[video_id];
				if ( self.segmentsData === null ) {
					self.onGotSegments(response, 'localDatabase', 0);
				}
				else {
					self.secondPrioritySegmentsData = response;
					if ( self.secondPrioritySegmentsData.timestamps[0] != 0.0 ) {
						self.secondPrioritySegmentsData.timestamps.unshift(0.0);
						self.secondPrioritySegmentsData.timestamps.push(self.mediaPlayer.duration);
					}
					else {
						self.secondPrioritySegmentsData.timestamps = [0.0, self.mediaPlayer.duration];
					}
				}
			}
			
			if ( callback ) {
				callback();
			}
		});
	},
	
	getPendingSegmentation: function(self, domain, id, callback) {
		// console.log('mediaPlayerWrapper::getPendingSegmentation()');
		
		browser.storage.local.get({ pending: '' }, function(result) {
			if ( result.pending !== '' ) {
				response = result.pending;
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
				
				// override segments data 
				self.onGotSegments(response, 'pendingDatabase', 0);
			}
			
			if ( callback ) {
				callback();
			}
		});
	},
	
	killAutoPauseTimer: function(self) {
		// console.log('mediaPlayerWrapper::killAutoPauseTimer()');
		
		// if user waiting for segments 
		if ( self.pauseTimer ) {
			// if video paused (and is not loading)
			if ( self.mediaPlayer.paused ) {
				clearTimeout(self.pauseTimer);
				self.pauseTimer = null;
				self.mediaPlayer.play();
			}
		}
	},
	
	onGotSegments: function(response, origin, votes) {
		// console.log('onGotSegments');
		var self = this;
		
		// if there are segments 
		if ( response.types && response.types.length !== 0 ) {
			//console.log(response);
			
			// convert json-response into object
			this.segmentsData = response;
			this.segmentsData.origin = origin;
			
			// add 0 and duration to json array of timestamps (db doesn't contain this information)
			// if there is more than one segment
			if ( this.segmentsData.timestamps[0] != 0.0 ) {
				// database doesn't contain first segment start time 
				this.segmentsData.timestamps.unshift(0.0);
				//  and last segment end time 
				this.segmentsData.timestamps.push(this.mediaPlayer.duration);
			}
			else {
				// if there is only one segment exists
				this.segmentsData.timestamps = [0.0, this.mediaPlayer.duration];
			}
			
			// insert segment bar 
			this.insertSegmentBar();
			
			// if user waiting for segments 
			if ( this.pauseTimer ) {
				// if video paused (and is not loading)
				if ( this.mediaPlayer.paused ) {
					clearTimeout(this.pauseTimer);
					this.pauseTimer = null;
					this.mediaPlayer.play();
				}
			}
			
			// prevent shivering on rewind to same time 
			// if ( self.requestTime != null && self.requestTime != self.mediaPlayer.currentTime ) {
			if ( this.requestTime != null ) {
				// these operations will take time so go back and round load time for rewind
				this.mediaPlayer.currentTime = this.requestTime;
				this.requestTime = null;
			}
			
			this.mediaPlayer.addEventListener("play", this.eventContexts.onPlay);
			if ( !this.mediaPlayer.paused ) {
				this.onPlay();
			}
			
			// force call for play event due to bug 
			// when it isn't fired sometimes
			// and also because of this:
			// https://stackoverflow.com/questions/36803176/
			// changing order between pause and set currentTime fixes error
			
			// add listeners for events
			this.mediaPlayer.addEventListener("ratechange", this.eventContexts.onRateChange);
			// chrome send "pause()" event with playbackRate change 
			// idk why but this poor workaround seems to be working...
			// setTimeout(function() {
				this.mediaPlayer.addEventListener("pause", this.eventContexts.onPause);
			// }, 100);
		}
		else {
			this.segmentsData = null;
			
			// due to rare bug where play event doesn't fire 
			// timer check is separated
			if ( this.pauseTimer ) {
				clearTimeout(this.pauseTimer);
				this.pauseTimer = null;
				this.mediaPlayer.play();
			}
		}
		
		if ( this.afterFullScreen ) {
			this.afterFullScreen = false;
		}
		else {
			this.createSegmentationTools(votes);
		}
	},
	
	/*
	 * Create segmentation tools 
	 */
	createSegmentationTools: function(votes) {
		// console.log('createSegmentationTools');
		var self = this;
		
		if ( this.settings.showSegmentationTools ) {
			// if it's not iframe 
			if ( window.parent === window ) {
				// very hardcoded 
				var subtimer = setInterval(function() {
					var attachTo;
					attachTo = document.getElementById('info-contents');
					if ( attachTo ) {
						setTimeout(function() {
							self.editor.init(self, self.segmentsData, self.settings, self.sourceInformation.domain, self.sourceInformation.id);
							setTimeout(function() {
								if ( votes == 0 ) {
									// insert request segmentation button 
									self.insertMenu(false);
								}
								else {
									// insert request segmentation button 
									self.insertMenu(true);
								}
							}, 500);
							
						}, 500);
						clearInterval(subtimer);
					}
					else {
						// old desing
						attachTo = document.getElementById('watch-header');
						if ( attachTo ) {
							setTimeout(function() {
								self.editor.init(self, self.segmentsData, self.settings, self.sourceInformation.domain, self.sourceInformation.id);
								setTimeout(function() {
									if ( votes == 0 ) {
										// insert request segmentation button 
										self.insertMenu(false);
									}
									else {
										// insert request segmentation button 
										self.insertMenu(true);
									}
								}, 500);
								
							}, 500);
							clearInterval(subtimer);
						}
					}
				}, 100);
			}
		}
	},
	
	/*
	 * Called when player start to play or after seeking (called before many events)
	 */
	onPlay: function() {
		// console.log('mediaPlayerWrapper::onPlay()', this.mediaPlayer.playbackRate);
		// this event is called before "durationchange" event during ajax redirection so we have to stop it manually
		if ( this.url != this.getVideoUrl() ) {
			// console.log(this.url + ' ' + this.mediaPlayer.baseURI);
			return;
		}
		
		// if loading and user rewinds 
		if ( this.requestTime !== null ) {
			this.requestTime = this.mediaPlayer.currentTime.toFixed();
		}
		
		// console.log('mediaPlayerWrapper::onPlay()', this.mediaPlayer.playbackRate);
		
		// find segment to rewind
		var rewindSegment = this.getNextSegment(0);
		// if found
		if ( rewindSegment != null ) {
			this.tryRewind(rewindSegment);
		}
	},
	
	/*
	 * Make attempt to rewind segment. If too early then wait 
	 */
	tryRewind: function(rewindSegment) {
		// firefox will call it on video change
		if ( this.url != this.getVideoUrl() ) {
			return;
		}
		
		// console.log('mediaPlayerWrapper::tryRewind()', this.mediaPlayer.currentTime);
		
		// kill rewind timer
		if ( this.rewindTimer ) {
			clearTimeout(this.rewindTimer);
			this.rewindTimer = null;
		}
		
		if ( this.previousSegment != null ) {
			var self = this;
			var segmentLength = this.segmentsData.timestamps[this.previousSegment+1] - this.mediaPlayer.currentTime;
			if ( segmentLength > 0.0 ) {
				this.rewindTimer = setTimeout(function() { self.tryRewind(rewindSegment); }, segmentLength*(1000/this.mediaPlayer.playbackRate));
				return;
			}
			else {
				this.previousSegment = null;
			}
			
			if ( rewindSegment == null ) {
				this.preventUpdate = true;
				this.mediaPlayer.playbackRate = this.defaultSpeed;
				this.defaultSpeed = null;
				return;
			}
		}
		
		// 2 digits precision is enough
		var currentTime = this.mediaPlayer.currentTime.toFixed(2);
		// console.log('current time: ' + currentTime, ', rewind time: ' + this.segmentsData.timestamps[rewindSegment]);
		// get difference between segment start time and current time
		var delay = this.segmentsData.timestamps[rewindSegment] - currentTime;
		// if called earlier (timeouts are inaccurate)
		if ( delay > 0 ) {
			if ( this.defaultSpeed ) {
				this.preventUpdate = true;
				this.mediaPlayer.playbackRate = this.defaultSpeed;
				this.defaultSpeed = null;
			}
			
			var self = this;
			// wait 
			this.rewindTimer = setTimeout(function() { self.tryRewind(rewindSegment); }, delay*(1000/this.mediaPlayer.playbackRate));
		}
		else {
			var segmentLength = this.segmentsData.timestamps[rewindSegment+1] - this.mediaPlayer.currentTime;
			if ( segmentLength > this.settings.segments[this.segmentsData.types[rewindSegment]].duration ) {
				if ( this.defaultSpeed ) {
					this.preventUpdate = true;
					this.mediaPlayer.playbackRate = this.defaultSpeed;
					this.defaultSpeed = null;
				}
				
				// rewind to segment end time
				console.log(this.segmentsData.timestamps[rewindSegment+1], this.mediaPlayer.currentTime);
				browser.runtime.sendMessage({ 'updateTotalTime': this.segmentsData.timestamps[rewindSegment+1] - this.mediaPlayer.currentTime });
				this.mediaPlayer.currentTime = this.segmentsData.timestamps[rewindSegment+1];
				
				// look for next segment
				rewindSegment = this.getNextSegment(rewindSegment+1);
				if ( rewindSegment ) {
					var self = this;
					// calculate delay 
					delay = this.segmentsData.timestamps[rewindSegment] - this.mediaPlayer.currentTime;
					// wait for next segment
					this.rewindTimer = setTimeout(function() { self.tryRewind(rewindSegment); }, delay*(1000/this.mediaPlayer.playbackRate));
				}
			}
			else {
				// if current playing speed is slower than desired fast forward speed
				if ( this.defaultSpeed < this.settings.segments[this.segmentsData.types[rewindSegment]].speed ) {
					if ( this.defaultSpeed == null ) {
						this.defaultSpeed = this.mediaPlayer.playbackRate;
					}
					
					this.preventUpdate = true;
					this.mediaPlayer.playbackRate = this.settings.segments[this.segmentsData.types[rewindSegment]].speed;
				}
				this.previousSegment = rewindSegment;
				
				// console.log(segmentLength*(1000/this.mediaPlayer.playbackRate), this.mediaPlayer.playbackRate, this.defaultSpeed);
				
				var self = this;
				this.rewindTimer = setTimeout(function() { 
					var rewindSegment = self.getNextSegment(0);
					self.tryRewind(rewindSegment);
				}, segmentLength*(1000/this.mediaPlayer.playbackRate));
			}
		}
	},
	
	/*
	 * Returns next segment to skip. Null if nothing found 
	 */
	getNextSegment: function(startSegment) {
		if ( this.segmentsData == null || this.segmentsData.timestamps == null ) {
			return null;
		}
		
		// console.log('mediaPlayerWrapper::getNextSegment()');
		
		// for each segment from initial segment
		for ( let i = startSegment; i < this.segmentsData.types.length; ++i ) {
			// if requirements met
			if ( this.settings.segments[this.segmentsData.types[i]].skip == true && this.segmentsData.timestamps[i] >= this.mediaPlayer.currentTime.toFixed(2) ) {
				// return segment number
				return i;
			}
		}
		// return null if there is no more segments to skip
		return null;
	},
	
	/*
	 * Called when player paused. Kill rewind timer
	 */
	onPause: function() {
		// console.log('mediaPlayerWrapper::onPause()', this.mediaPlayer.playbackRate);
		
		if ( this.rewindTimer ) {
			clearTimeout(this.rewindTimer);
			this.rewindTimer = null;
		}
		
		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
			this.pauseTimer = null;
		}
		
		if ( this.defaultSpeed ) {
			this.preventUpdate = true;
			this.mediaPlayer.playbackRate = this.defaultSpeed;
		}
		
		this.previousSegment = null;
	},
	
	/*
	 * Called when player play speed was changed. Update rewind delay
	 */
	onRateChange: function() {
		// console.log('mediaPlayerWrapper::onRateChange()', this.mediaPlayer.playbackRate);
		
		// do not update on playback increase 
		if ( this.preventUpdate ) {
			this.preventUpdate = false;
		}
		else {
			// idk why but this event will be called on video change when playrate > 100% 
			if ( this.mediaPlayer.currentTime > 0.0 ) {
				this.defaultSpeed = this.mediaPlayer.playbackRate;
				// console.log('rt:', this.defaultSpeed);
			}
			
			if ( !this.mediaPlayer.paused ) {
				// get next segment to rewind (TODO: optimize?)
				var rewindSegment = this.getNextSegment(0);
				if ( rewindSegment ) {
					// try to rewind 
					this.tryRewind(rewindSegment);
				}
			}
		}
	},
	
	/*
	 * Adds a segment bar after progress bar 
	 */
	insertSegmentBar: function() {
		// console.log('mediaPlayerWrapper::insertSegmentBar()');
		
		// if user doesn't want to see progress bar 
		if ( !this.settings.showSegmentsbar ) {
			// do nothing 
			return;
		}
		
		// if segments doesn't exists 
		if ( !this.segmentsData ) {
			return;
		}
		
		// get youtube progress bar
		var segmentsBar = document.getElementsByClassName("ytp-progress-list")[0];
		// get segments count
		var segmentsCount = this.segmentsData.types.length;
		
		// bar width  
		var width = 0;
		// bar offset from left  
		var left = 0;
		// for each segment
		for ( let i = 0; i < segmentsCount; ++i ) {
			// calculate width 
			width = (this.segmentsData.timestamps[i+1] - this.segmentsData.timestamps[i]) / this.mediaPlayer.duration * 100;
			
			// create div element
			var div = document.createElement('div');
			// set classname with segment number
			div.className = 'vs_progressbar' + i;
			// set div style
			// 0.12 - some kind of manual-found offset, 
			// isn't perfect but fine for now 
			div.style = 'position: absolute; left: ' + (left-0.12) + '%; width: ' + width + '%; height: 50%; background-color: ' + this.settings.segments[this.segmentsData.types[i]].color + '; border: solid 1px black;';
			
			// insert to end of progress bar
			segmentsBar.insertAdjacentElement("afterEnd", div);
			// update offset
			left = left + width;
		}
	},
	
	/*
	 * Removes a segment bar after progress bar 
	 */
	removeSegmentBar: function() {
		// console.log('mediaPlayerWrapper::removeSegmentBar()');
		
		// if segments for video exists
		if ( this.segmentsData ) {
			// segment element
			var segment;
			// segments count 
			var segmentsCount = this.segmentsData.timestamps.length - 1;
			// for each div segment
			for ( let i = 0; i < segmentsCount; ++i ) {
				// get element
				segment = document.getElementsByClassName("vs_progressbar" + i)[0];
				if ( segment ) {
					// remove 
					segment.remove();
				}
			}
		}
	},
	
	/*
	 * Create button for segmentation request (maybe will be menu later)
	 */
	insertMenu: function(requested) {
		if ( this.segmentsData ) {
			return;
		}
		
		// old design 
		var prevMenuItem = document.getElementById('watch8-secondary-actions'), buttonStyle = {}, css;
		// new design 
		if ( prevMenuItem ) {
			buttonStyle.color = 'gray';
			css = '#vs-request-segmentation-button:hover {cursor: pointer} #vs-request-segmentation-button:hover > span {color: black}';
		}
		else {
			var container = document.getElementById('menu-container');
			if ( container ) {
				prevMenuItem = container.getElementsByClassName('style-scope ytd-menu-renderer force-icon-button style-default')[0];
				buttonStyle.backgroundColor = 'white';
				buttonStyle.color = 'rgb(150, 150, 150)';
				buttonStyle.border = 'none';
				buttonStyle.padding = '0 0 5px 0';
				buttonStyle.margin = '0 10px 0 10px';
				css = '#vs-request-segmentation-button:hover {cursor: pointer} #vs-request-segmentation-button:hover > span {color: black}';
			}
		}
		
		if ( prevMenuItem ) {
			// create button 
			var button = document.createElement('button');
		
			// modal for captcha 
			var modal = document.createElement('div');
			var modalContent = document.createElement('div');
			
			modal.id = 'vs-captcha-modal';
			modal.style = 'display: none; position: fixed; z-index: 2000000000; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.8);';
			modalContent.style = 'background-color: #fefefe; margin: auto; border: 1px solid #888; width: 350px; ';
			
			modal.appendChild(modalContent);
			prevMenuItem.appendChild(modal);
			
			// create image 
			var img = document.createElement('img');
			img.src = 'https://db.videosegments.org/images/icon_wb.png';
			img.style.height = '20px';
			img.style.width = '20px';
			img.style.position = 'absolute';
			
			// text 
			var span = document.createElement('span');
			span.style.marginLeft = '25px';
			span.style.font = '11px YouTube Noto,Roboto,arial,sans-serif';
			
			// add to button
			button.appendChild(img);
			button.appendChild(span);
			
			Object.assign(button.style, buttonStyle);
			
			if ( requested ) {
				span.appendChild(document.createTextNode(browser.i18n.getMessage('segmentationRequestedLabel')));
			}
			else {
				button.id = 'vs-request-segmentation-button';
				
				// add pseudorule :hover 
				var style = document.createElement('style');
				if ( style.styleSheet ) {
					style.styleSheet.cssText = css;
				} else {
					style.appendChild(document.createTextNode(css));
				}

				document.getElementsByTagName('head')[0].appendChild(style);
				span.appendChild(document.createTextNode(browser.i18n.getMessage('requestSegmentationLabel')));
			
				// button click handler
				var self = this;
				var clickContext = function() {
					modal.style.display = "block";
							
					var iframe = document.createElement("iframe");
					iframe.src = 'https://db.videosegments.org/captcha2.php';
					iframe.width  = 350;
					iframe.height = 500;
					iframe.id = 'vs-captcha-iframe';
					modal.childNodes[0].appendChild(iframe);
					
					var messageContext = function(event) { 
						if ( event.origin === 'https://db.videosegments.org' ) {
							var xhr = new XMLHttpRequest();
							xhr.open('POST', 'https://db.videosegments.org/request.php');
							xhr.onreadystatechange = function() { 
								if ( xhr.readyState == 4 ) {
									if ( xhr.status == 200 ) {
										// console.log(xhr.responseText);
										
										modal.style.display = "none";
										modal.childNodes[0].childNodes[0].remove();
										
										button.childNodes[1].textContent = browser.i18n.getMessage('segmentationRequestedLabel');
										button.childNodes[1].removeEventListener('click', clickContext);
										button.id = '';
									}
								}
							}
							
							var post = 'domain='+self.sourceInformation.domain+'&id='+self.sourceInformation.id+'&captcha='+event.data;
							xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
							xhr.send(post);
						}
					}
					
					var clickContext = function(event) { 
						if ( event.target == modal ) {
							modal.style.display = "none";
							modal.childNodes[0].childNodes[0].remove();
							window.removeEventListener('message', messageContext);
							window.removeEventListener('click', clickContext);
						}
					}
					
					window.addEventListener('message', messageContext);
					window.addEventListener('click', clickContext);
				};
				
				button.addEventListener('click', clickContext);
			}
			
			prevMenuItem.insertAdjacentElement('afterEnd', button);
		}
	},
	
	/*
	 * Called when segments in editor were changed
	 */ 
	updateSegmentsData: function(segmentsData, saveLocally) 
	{
		if ( !this.segmentsData ) {
			this.mediaPlayer.addEventListener("play", this.eventContexts.onPlay);
			this.mediaPlayer.addEventListener("pause", this.eventContexts.onPause);
			this.mediaPlayer.addEventListener("ratechange", this.eventContexts.onRateChange);
		}
		
		// update visual part 
		this.removeSegmentBar();
		this.segmentsData = segmentsData;
		this.insertSegmentBar();
		
		if ( saveLocally ) {
			// save locally 
			var video_id = this.sourceInformation.domain + '-' + this.sourceInformation.id;
			// if segmentation doesn't exists 
			if ( segmentsData.types.length == 0 ) {
				// remove it from local database 
				browser.storage.local.remove([video_id]);
			}
			else {
				// save locally
				var temp = JSON.parse(JSON.stringify(segmentsData)); // break link between segments data and saved data 
				temp.timestamps.shift(); // remove first 
				temp.timestamps.pop(); // remove last 
				
				browser.storage.local.set({
					[video_id]: temp
				});
			}
		}
	}
};

/**
 * Main class to handle segmentation. 
 * Should be rewritten for better look. 
 * Right now too much hardcoded
 */
var editorWrapper = {
	/* media player wrapper */
	mediaPlayerWrapper: null,
	/* media player */
	mediaPlayer: null,
	/* DOM-element of editor */
	editorDiv: null,
	/* user preferences */
	settings: null,
	/* current video domain */
	domain: null,
	/* current video id */
	id: null,
	/* translation of segments names */
	segmentsNames: null,
	/* modal window for captcha */
	modal: null,
	
	/*
	 * Initializes class variables, create UI 
	 */
	init: function(mediaPlayerWrapper, segmentsData, settings, domain, id) {
		// console.log('editorWrapper::init()');
		
		// for iframe this will be undefined
		var watchHeader = document.getElementById('info-contents');
		if ( !watchHeader ) {
			// console.log('watch-header not found');
			
			// old desing
			watchHeader = document.getElementById('watch-header');
			if ( !watchHeader ) {
				return;
			}
		}
		
		// save variables
		this.mediaPlayerWrapper = mediaPlayerWrapper;
		this.mediaPlayer = this.mediaPlayerWrapper.mediaPlayer;
		this.settings = settings;
		this.domain = domain;
		this.id = id;
		
		var self = this;
		
		// create div for editor
		this.editorDiv = document.createElement('div');
		this.editorDiv.id = 'vs-editor';
		this.editorDiv.style = 'text-align: center; background: white; box-shadow: 0 1px 2px rgba(0,0,0,.1); padding: 10px;';
		
		// div for segments data 
		var segmentsEditor = document.createElement('div');
		segmentsEditor.id = 'vs-editor-entries';
		
		// create buttons for each type of segments 
		// c  - content 
		// ac - adcontent 
		// a  - advertisement 
		// i  - intro 
		// cs - cutscene 
		// ia - interactive
		// cr - credits 
		// o  - offtop 
		// s  - scam		
		var segmentsButtons = document.createElement('div');
		segmentsButtons.id = 'vs-segments-buttons';
		segmentsButtons.style = 'display: flex; justify-content: space-between;';
		var segmentsTypes = ['c', 'ac', 'a', 'i', 'cs', 'ia', 'cr', 'o', 's'];
		this.segmentsNames = ['content', 'adcontent', 'advertisement', 'intro', 'cutscene', 'interactive', 'credits', 'offtop', 'scam'];
				
		// translate button captions
		for ( let i = 0; i < this.segmentsNames.length; ++i ) {
			this.segmentsNames[i] = browser.i18n.getMessage(this.segmentsNames[i]);
		}
		
		for ( let i = 0; i < segmentsTypes.length; ++i ) {
			// define is color dark or light  
			// https://stackoverflow.com/a/12043228
			var c = this.settings.segments[segmentsTypes[i]].color.slice(1);
			var rgb = parseInt(c, 16);   // convert rrggbb to decimal
			var r = (rgb >> 16) & 0xff;  // extract red
			var g = (rgb >>  8) & 0xff;  // extract green
			var b = (rgb >>  0) & 0xff;  // extract blue
			
			var textColor;
			var light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			if (light < 60) {
				textColor = 'white';
			}
			else {
				textColor = 'black';
			}
			
			// add segment from previos to current time 
			var buttonCurrentPos = this.createButton(segmentsTypes[i], this.segmentsNames[i], function() {
				var entries = self.editorDiv.getElementsByClassName('vs-editor-entry');
				if ( entries.length == 0 ) {
					self.addSegmentEntry(segmentsEditor, 0.0, self.mediaPlayer.currentTime, this.name);
				}
				else {
					var entry, j;
					for ( j = 0; j < entries.length; ++j ) {
						entry = entries[j];
						if ( entry.getElementsByClassName('vs-editor-end-time')[0].value > self.mediaPlayer.currentTime ) {
							break;
						}
					}
					
					if ( j == 0 ) {
						self.insertBeforeSegmentEntry(entry, 0, self.mediaPlayer.currentTime, this.name);
						// entry.getElementsByClassName('vs-editor-start-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
					}
					else {
						self.insertSegmentEntry(entries[j-1], parseFloat(entries[j-1].getElementsByClassName('vs-editor-end-time')[0].value), self.mediaPlayer.currentTime, this.name);
						// entry.getElementsByClassName('vs-editor-start-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
					}
				}
				self.updatePreview();
			}, 'width: 80%; padding: 0; margin-right: 0; background-color: ' + this.settings.segments[segmentsTypes[i]].color + '; border: none; cursor: pointer; color: ' + textColor + ';');
			
			// add segment from current time to end 
			var buttonLastPos = this.createButton(segmentsTypes[i], '>', function() {
				// console.log(this.name);
				var entries = self.editorDiv.getElementsByClassName('vs-editor-entry');
				// if there is no entries
				if ( entries.length == 0 ) {
					// add first
					self.addSegmentEntry(segmentsEditor, 0.0, self.mediaPlayer.duration, this.name);
				}
				else {
					if ( entries.length > 1 ) {
						// find position to insert
						var entry, j;
						for ( j = 0; j < entries.length; ++j ) {
							entry = entries[j];
							if ( entry.getElementsByClassName('vs-editor-end-time')[0].value > self.mediaPlayer.currentTime ) {
								break;
							}
						}
						
						// if end then append
						if ( j >= entries.length ) {
							// console.log(entry.getElementsByClassName('vs-editor-end-time')[0].value);
							self.addSegmentEntry(segmentsEditor, parseFloat(entry.getElementsByClassName('vs-editor-end-time')[0].value), self.mediaPlayer.duration, this.name);
						}
						// if near end then append
						else if ( j == entries.length-1 ) {
							self.addSegmentEntry(segmentsEditor, self.mediaPlayer.currentTime, self.mediaPlayer.duration, this.name);
							entry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
						}
						// else insert 
						else {
							self.insertSegmentEntry(entry, self.mediaPlayer.currentTime, parseFloat(entry.getElementsByClassName('vs-editor-end-time')[0].value), this.name);
							entry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
						}
					}
					// it will be removed later
					else {
						var prevEntry = entries[entries.length-1];
						prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
						self.addSegmentEntry(segmentsEditor, self.mediaPlayer.currentTime, self.mediaPlayer.duration, this.name);
					}
				}
				
				// update preview 
				self.updatePreview();
				// }
			}, 'width: 20%; padding: 0; margin-left: 0; background-color: ' + this.settings.segments[segmentsTypes[i]].color + '; border: none; border-left: 1px solid black; cursor: pointer; color: ' + textColor + ';');
			
			// add buttons and define thier behavior 
			var container = document.createElement('div');
			container.style.width = '10.5%';
			container.style.display = 'inline-block';
			container.appendChild(buttonCurrentPos);
			container.appendChild(buttonLastPos);
			segmentsButtons.appendChild(container);
		}
		
		// add buttons 
		this.editorDiv.appendChild(segmentsButtons);
		this.editorDiv.appendChild(document.createElement('br'));
		
		// if segments already exists
		if ( segmentsData ) {
			// create lines based on this data 
			var segments = segmentsData.timestamps.length;
			for ( let i = 0; i < segments-1; ++i ) {
				this.addSegmentEntry(segmentsEditor, segmentsData.timestamps[i], segmentsData.timestamps[i+1], segmentsData.types[i]);
			}
		}
		// create default line 
		else {
			// this.addSegmentEntry(segmentsEditor, 0.0, this.mediaPlayerWrapper.mediaPlayer.duration, 'c');
		}
		this.editorDiv.appendChild(segmentsEditor);
		this.editorDiv.appendChild(document.createElement('br'));
		
		var controlButtons = document.createElement('div');
		controlButtons.id = 'vs-control-buttons';
		controlButtons.style.textAlign = 'left';
		
		// hide segmentation button 
		var container = document.createElement('div');
		container.style.width = '31%';
		container.style.margin = '1%';
		container.style.padding = '0';
		container.style.display = 'inline-block';
		container.style.textAlign = 'left';
		
		container.appendChild(this.createButton('', browser.i18n.getMessage('hideSegmentationTools'), function() {
			self.settings.showSegmentationTools = false;
			browser.storage.local.set({ settings: self.settings });
			self.destroy();
		}, 'width: 90%; padding: 0; height: 30px'));
		controlButtons.appendChild(container);
		
		// segments origin 
		container = document.createElement('div');
		container.style.width = '31%';
		container.style.margin = '1%';
		container.style.padding = '0';
		container.style.display = 'inline-block';
		container.style.textAlign = 'center';
		if ( segmentsData && segmentsData.origin ) {
			if ( this.mediaPlayerWrapper.secondPrioritySegmentsData ) {
				var select = document.createElement('select');
				
				var option = document.createElement('option');
				option.value = 'local';
				option.text = browser.i18n.getMessage('localDatabase');
				select.appendChild(option);
				
				option = document.createElement('option');
				option.value = 'official';
				option.text = browser.i18n.getMessage('officialDatabase');
				select.appendChild(option);
				
				select.value = (segmentsData.origin === 'localDatabase') ? 'local' : 'official';
				select.onchange = function() {
					var buffer = self.mediaPlayerWrapper.segmentsData;
					self.mediaPlayerWrapper.segmentsData = self.mediaPlayerWrapper.secondPrioritySegmentsData;
					self.mediaPlayerWrapper.secondPrioritySegmentsData = buffer;
					
					// delete old segments entries 
					var segmentation = document.getElementById('vs-editor-entries');
					while (segmentation.firstChild) {
						segmentation.removeChild(segmentation.firstChild);
					}
					
					if ( self.mediaPlayerWrapper.segmentsData ) {
						var segments = self.mediaPlayerWrapper.segmentsData.timestamps.length;
						for ( let i = 0; i < segments-1; ++i ) {
							self.addSegmentEntry(segmentation, self.mediaPlayerWrapper.segmentsData.timestamps[i], self.mediaPlayerWrapper.segmentsData.timestamps[i+1], self.mediaPlayerWrapper.segmentsData.types[i]);
						}
					}
					
					// update visually and but do not save changes 
					self.mediaPlayerWrapper.updateSegmentsData(self.mediaPlayerWrapper.segmentsData, false);
				}
				
				container.appendChild(document.createTextNode(browser.i18n.getMessage('origin')));
				container.appendChild(select);
			}
			else {
				container.appendChild(document.createTextNode(browser.i18n.getMessage('origin') + browser.i18n.getMessage(segmentsData.origin)));
			}
		}
		else {
			container.appendChild(document.createTextNode(browser.i18n.getMessage('origin') + browser.i18n.getMessage('noSegmentation')));
		}
		controlButtons.appendChild(container);
		
		container = document.createElement('div');
		container.style.width = '31%';
		container.style.margin = '1%';
		container.style.padding = '0';
		container.style.display = 'inline-block';
		container.style.textAlign = 'right';
		
		// create send button 
		// if ( this.settings.sendToDatabase ) {
		if ( segmentsData && segmentsData.origin === 'pendingDatabase' ) {
			container.appendChild(this.createButton('', browser.i18n.getMessage('declineSegmentation'), function() {self.sendSegmentsData(true)}, 'width: 40%; padding: 0; height: 30px; margin-right: 5%;'));
			container.appendChild(this.createButton('', browser.i18n.getMessage('acceptSegmentation'), function() {self.sendSegmentsData(false)}, 'width: 40%; padding: 0; height: 30px'));
		}
		else {
			browser.storage.local.get({ request: '0' }, function(result) {
				if ( result.request == '1' ) {
					browser.storage.local.remove(['request']);
					container.appendChild(self.createButton('', browser.i18n.getMessage('declineSegmentation'), function() {self.sendSegmentsData(true)}, 'width: 40%; padding: 0; height: 30px; margin-right: 5%;'));
					container.appendChild(self.createButton('', browser.i18n.getMessage('sendSegmentation'), function() {self.sendSegmentsData(false)}, 'width: 40%; padding: 0; height: 30px'));
				}
				else {
					container.appendChild(self.createButton('', browser.i18n.getMessage('sendSegmentationToOfficialDatabase'), function() {self.sendSegmentsData(false)}, 'width: 90%; padding: 0; height: 30px'));
				}
			});
		}
		// }
		controlButtons.appendChild(container);
		
		this.editorDiv.appendChild(controlButtons);
		
		// this.editorDiv.addEventListener('destroy', function() {
			// console.log('im removed');
		// });
		
		// add editor div to watch header
		watchHeader.insertAdjacentElement('afterBegin', this.editorDiv);
		// this.editorDiv.insertAdjacentElement('beforeEnd', document.createElement('br'));
		
		// modal for captcha 
		this.modal = document.createElement('div');
		var modalContent = document.createElement('div');
		
		this.modal.id = 'vs-captcha-modal';
		this.modal.style = 'display: none; position: fixed; z-index: 2000000000; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.8);';
		modalContent.style = 'background-color: #fefefe; margin: auto; border: 1px solid #888; width: 350px';
		
		this.modal.appendChild(modalContent);
		this.editorDiv.appendChild(this.modal);
	},
	
	/*
	 * Creates line with segment information
	 */
	createSegmentEntry: function(startTime, endTime, type) {
		// container for row 
		var editorEntry = document.createElement('div');
		editorEntry.className = 'vs-editor-entry';
		
		// start time 
		var inputStartTime = document.createElement('input');
		inputStartTime.type = 'text';
		inputStartTime.className = 'vs-editor-start-time';
		inputStartTime.value = startTime.toFixed(2);
		inputStartTime.size = 8;
		inputStartTime.style = 'text-align: center; font-family: courier';
		
		// end time 
		var inputEndTime = document.createElement('input');
		inputEndTime.type = 'text';
		inputEndTime.className = 'vs-editor-end-time';
		inputEndTime.value = endTime.toFixed(2);
		inputEndTime.size = 8;
		inputEndTime.style = 'text-align: center; font-family: courier';
		// update next segment start time
		inputEndTime.onkeyup = function() {
			var nextEntry = this.parentNode.nextSibling;
			if ( nextEntry ) {
				var nextInput = nextEntry.getElementsByClassName('vs-editor-start-time')[0];
				nextInput.value = this.value;
			}
			self.updatePreview();
		};
		
		// type of segment 
		var selectSegmentType = document.createElement('select');
		selectSegmentType.className = 'vs-editor-segment-type';
		
		// add segment types 
		var segmentsTypes = ['c', 'ac', 'a', 'i', 'cs', 'ia', 'cr', 'o', 's'];
		for ( var i = 0; i < segmentsTypes.length; ++i ) {
			var optionSegmentType = document.createElement('option');
			optionSegmentType.value = segmentsTypes[i];
			optionSegmentType.text = this.segmentsNames[i];
			selectSegmentType.appendChild(optionSegmentType);
		}
		selectSegmentType.value = type;
		selectSegmentType.onchange = function() {
			self.updatePreview();
		}
		
		// format and display 
		var self = this;
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('goTo'), function() {self.goTo(inputStartTime.value);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0')); // &nbsp;
		editorEntry.appendChild(inputStartTime);
		editorEntry.appendChild(document.createTextNode('\u00A0:\u00A0'));
		editorEntry.appendChild(inputEndTime);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('currentTime'), function() {self.setCurrentTime(inputEndTime);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(selectSegmentType);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		
		// remove button 
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('remove'), function() { 
			// look for next and previous rows 
			var prevEntry = this.parentNode.previousSibling;
			var nextEntry = this.parentNode.nextSibling;
			// if previous row found 
			if ( prevEntry ) {
				// and next too 
				if ( nextEntry ) {
					// connect previous with next 
					prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = nextEntry.getElementsByClassName('vs-editor-start-time')[0].value;
				}
				else {
					// update previous row 
					prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.duration.toFixed(2);
				}
			}
			// only next row exists 
			else if ( nextEntry ) {
				// set start time to zero 
				var buffer = 0;
				nextEntry.getElementsByClassName('vs-editor-start-time')[0].value = buffer.toFixed(2);
			}
			// nothing found, create default line 
			// else {
				// self.addSegmentEntry(segmentsEditor, 0.0, self.mediaPlayerWrapper.mediaPlayer.duration, 'c');
			// }
			
			// remove node 
			this.parentNode.remove(); 
			self.updatePreview();
		}, 'width: 8%; padding: 0;'));
		
		return editorEntry;
	},
	
	/*
	 * Adds segment information to end of editor 
	 */ 
	addSegmentEntry: function(segmentsEditor, startTime, endTime, type) {
		segmentsEditor.appendChild(this.createSegmentEntry(startTime, endTime, type));
	},
	
	/*
	 * Inserts segment information to given position 
	 */ 
	insertSegmentEntry: function(prevElement, startTime, endTime, type) {
		prevElement.insertAdjacentElement('AfterEnd', this.createSegmentEntry(startTime, endTime, type));
	},
	
	/*
	 * Inserts segment information to given position 
	 */ 
	insertBeforeSegmentEntry: function(prevElement, startTime, endTime, type) {
		prevElement.insertAdjacentElement('BeforeBegin', this.createSegmentEntry(startTime, endTime, type));
	},
	
	/*
	 * Updates preview of segments
	 */ 
	updatePreview: function() {
		// console.log('editorWrapper::updatePreview()');
		var entries = this.editorDiv.getElementsByClassName('vs-editor-entry');
		
		var segmentsData = {};
		segmentsData.timestamps = [];
		segmentsData.types = [];
		
		// update timestamps and types 
		segmentsData.timestamps[0] = 0.0;
		for ( let i = 0; i < entries.length; ++i ) {
			segmentsData.timestamps[i+1] = parseFloat(entries[i].getElementsByClassName('vs-editor-end-time')[0].value);
			segmentsData.types[i] = entries[i].getElementsByClassName('vs-editor-segment-type')[0].value;
		}
		
		// update visually and save changes 
		this.mediaPlayerWrapper.updateSegmentsData(segmentsData, true);
	},
	
	/*
	 * Create button 
	 */
	createButton: function(name, text, onclick, style) {
		var button = document.createElement('input');
		button.name = name;
		button.type = 'button';
		button.value = text;
		button.style = style;
		button.onclick = onclick;
		return button;
	},
	
	/*
	 * Set input as current time based on media player 
	 */
	setCurrentTime: function(input) {
		// console.log('editorWrapper::setCurrentTime()');
		
		// update time on next entiry 
		input.value = this.mediaPlayer.currentTime.toFixed(2);
		input.onkeyup();
	},
	
	/*
	 * Rewind player to time of segment 
	 */
	goTo: function(value) {
		// console.log('editorWrapper::goTo()');
		
		this.mediaPlayer.currentTime = value;
	},
	
	/*
	 * Send segments data to database 
	 */
	sendSegmentsData: function(decline) {
		// console.log('editorWrapper::sendSegmentsData()');
		
		// format as json 
		var editorEntries = document.getElementsByClassName('vs-editor-entry');
		var timestamps = '', types = '';
		
		if ( editorEntries.length > 0 ) {
			var lastSegmentIndex = editorEntries.length-1;
			for ( let i = 0; i < lastSegmentIndex; ++i ) {
				timestamps += editorEntries[i].getElementsByClassName('vs-editor-end-time')[0].value + ',';
				types += editorEntries[i].getElementsByClassName('vs-editor-segment-type')[0].value + ',';
			}
			
			// format last segment type manually 
			timestamps = timestamps.slice(0, -1);
			types += editorEntries[lastSegmentIndex].getElementsByClassName('vs-editor-segment-type')[0].value;
		}
		else {
			types = 'c';
		}
		
		var self = this;		
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					console.log('response: ', xhr.responseText);
					var jsonResponse = JSON.parse(xhr.responseText);
					
					if ( jsonResponse.message === 'captcha' ) {
						self.modal.style.display = "block";
						
						var iframe = document.createElement("iframe");
						iframe.src = 'https://db.videosegments.org/captcha.php';
						iframe.width  = 350;
						iframe.height = 500;
						iframe.id = 'vs-captcha-iframe';
						self.modal.childNodes[0].appendChild(iframe);
						
						var messageContext = function(event) { 
							self.checkCaptcha(event, timestamps, types, messageContext, clickContext); 
						}
						
						var clickContext = function(event) { 
							if ( event.target == self.modal ) {
								self.modal.style.display = "none";
								self.modal.childNodes[0].childNodes[0].remove();
								window.removeEventListener('message', messageContext);
								window.removeEventListener('click', clickContext);
							}
						}
						
						window.addEventListener('message', messageContext);
						window.addEventListener('click', clickContext);
					}
					else {
						if ( jsonResponse.message === 'updated' || jsonResponse.message === 'added' || jsonResponse.message === 'overwritten' ) {
							setTimeout(function() {
								window.location.reload();
								self.updateBadge();
							}, 100);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			}
		};
		
		var post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types;
		if ( decline ) {
			post += '&decline=1';
		}
		
		// console.log(post);
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send(post);
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext)
	{
		if ( event.origin === 'https://db.videosegments.org' ) {
			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
			
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					self.modal.style.display = 'none';
					self.modal.childNodes[0].childNodes[0].remove();
					
					if ( xhr.status == 200 ) {
						// console.log('response: ', xhr.responseText);
						
						var jsonResponse = JSON.parse(xhr.responseText);
						if ( jsonResponse.message === 'added' || jsonResponse.message === 'updated' || jsonResponse.message === 'overwritten' ) {
							setTimeout(function() {
								window.location.reload();
								self.updateBadge();
							}, 100);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			};
			
			var post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types+'&captcha='+event.data;
			// console.log(post);
			
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
			
			window.removeEventListener('message', messageContext);
			window.removeEventListener('click', clickContext);
		}
	},
	
	updateBadge: function() {
		browser.runtime.sendMessage( {'updateBadge': true } );
	},
	
	/*
	 * Remove editor div's from page 
	 */
	destroy: function() {
		// console.log('editorWrapper::destroy()');
		if ( this.editorDiv ) {
			this.editorDiv.remove();
		}
	},
};



function loadSettings() {
	// default extension settings 
	var defaultSettings = {
		// segments configuration
		segments: {
			// content 
			c: 	{ skip: false, color: '#00ff00', duration: 0.0, speed: 1.0 },
			// adcontent 
			ac: { skip: false, color: '#008800', duration: 0.0, speed: 1.0 },
			// advertisement 
			a: 	{ skip: true,  color: '#ff0000', duration: 0.0, speed: 5.0 },
			// intro 
			i: 	{ skip: true,  color: '#0000ff', duration: 0.0, speed: 5.0 },
			// credits 
			cr: { skip: true,  color: '#ffff00', duration: 0.0, speed: 5.0 },
			// cutscene 
			cs: { skip: true,  color: '#808080', duration: 0.0, speed: 2.0 },
			// offtop 
			o: 	{ skip: true,  color: '#ff00ff', duration: 0.0, speed: 3.0 },
			// interactive 
			ia: { skip: true,  color: '#00ffff', duration: 0.0, speed: 4.0 },
			// scam 
			s:	{ skip: true,  color: '#008080', duration: 0.0, speed: 5.0 },
		},
		
		// global settings 
		autoPauseDuration: 1,
		showSegmentsbar: true,
		showSegmentationTools: true,
		databasePriority: 'local',
		
		// segmentation settings 
		// sendToDatabase: false,
		displayPending: false,
	}
	
	// request settings 
	browser.storage.local.get({
		settings: defaultSettings
	}, function(result) {
		tryFindMediaPlayer(result.settings);
	});
}

// media player wrapper
var wrapper;

// look for media players on page 
function tryFindMediaPlayer(settings) 
{
	// find media player on page 
	var mediaPlayer = document.getElementsByTagName('video')[0];
	// if media player exists
	if ( mediaPlayer ) {
		// remove click callback
		document.onclick = null;
		
		// create wrapper 
		wrapper = Object.create(mediaPlayerWrapper);
		// initialize wrapper 
		wrapper.init(mediaPlayer, settings);
	}
	else {
		// prevent multiple hooks
		var hooked = false;
		// listen for mutations on page 
		var observer = new MutationObserver(onMutation);
		observer.observe(document.documentElement, {
			childList: true, // report added/removed nodes
			subtree: true, // low level
		});
		
		// called when mutation occurs
		function onMutation(mutations) {
			mutations.forEach(function(mutation) {
				// sometime video is netsed so we have to look deeper 
				if ( mutation.target.getElementsByTagName('video')[0] && !hooked ) {
					// console.log(mutation);
					hooked = true;
					
					tryFindMediaPlayer(settings);
					observer.disconnect();
				}
			});
		}
	}
}

// load settings then start search of media player
loadSettings(tryFindMediaPlayer);

// on settings update
browser.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if ( wrapper ) {
			wrapper.settings = request.settings;
			
			wrapper.removeSegmentBar();
			if ( wrapper.settings.showSegmentsbar ) {
				wrapper.insertSegmentBar();
			}
			
			wrapper.editor.destroy();
			if ( wrapper.settings.showSegmentationTools ) {
				wrapper.editor.init(wrapper, wrapper.segmentsData, wrapper.settings, wrapper.sourceInformation.domain, wrapper.sourceInformation.id);
			}
			
			if ( !wrapper.mediaPlayer.paused ) {
				wrapper.mediaPlayer.pause();
				wrapper.mediaPlayer.play();
			}
		}
	}
);