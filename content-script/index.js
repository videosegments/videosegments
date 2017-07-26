/**
 * VideoSegments. Addon for browsers to skip automatically unwanted content in videos
 * Copyright (C) 2017  Alex Lys
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
 * content - credits https://www.youtube.com/watch?v=OLqeAH5D1uo
 * cutscene - content - cutscene https://www.youtube.com/watch?v=QIedr_9_9hA
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
	
	/* segments bar */
	segmentsBar: null,
	
	/* playing speed */
	playbackRate: null,
	
	/* pause timer for loading */
	pauseTimer: null,
	
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
		
		// bind contexts to remove them if unnesessary
		this.eventContexts.onDurationChange = this.onDurationChange.bind(this);
		this.eventContexts.onPlay = this.onPlay.bind(this);
		this.eventContexts.onPause = this.onPause.bind(this);
		this.eventContexts.onRateChange = this.onRateChange.bind(this);
		this.eventContexts.onSegmentsUpdated = this.onSegmentsUpdated.bind(this);
		
		// there is several events related to video status update:
		// loadstart - duration is NaN for several browsers
		// durationchange - may be called with NaN duration but will be called again with proper duration 
		// other events being called later 
		// listen for duration change
		this.mediaPlayer.addEventListener("durationchange", this.eventContexts.onDurationChange);
		// althrough loading of preferances can take time and video already playing 
		// so in this case we have to start manually
		// if ( this.mediaPlayer.readyState > 3 ) {
		this.onDurationChange();
		// }
		
		// console.log(this.mediaPlayer.duration + ' ' + this.mediaPlayer.baseURI + ' ' + this.url);
	},
	
	onDurationChange: function() {
		// when video is changed baseURI changed too 
		if ( this.mediaPlayer.baseURI == this.url ) {
			// do nothing if urls matches 
			return;
		}
		
		// if called before duration is set 
		if ( isNaN(this.mediaPlayer.duration) ) {
			// console.log('nan duration');
			// wait for proper duration 
			return;
		}
		
		// console.log('mediaPlayerWrapper::onDurationChange()');
		
		// remove segment bar 
		this.removeSegmentBar();
		
		// clear segments data 
		this.segmentsData = null;
		
		// update url 
		this.url = this.mediaPlayer.baseURI;
		
		// remove event listeners 
		this.mediaPlayer.removeEventListener("play", this.eventContexts.onPlay);
		this.mediaPlayer.removeEventListener("pause", this.eventContexts.onPause);
		this.mediaPlayer.removeEventListener("ratechange", this.eventContexts.onRateChange);
				
		// get video source information (domain and id)
		this.sourceInformation = this.getVideoSourceInformation();
		
		// if supported domain and id found
		if ( this.sourceInformation ) {
			/* request segments */
			// 3th argument is current time because request will take time and 
			// we may have to rewind it with rounding in case of first segment must be skipped
			this.requestSegments(this.sourceInformation.domain, this.sourceInformation.id, this.mediaPlayer.currentTime);
			
			document.removeEventListener('vssegmentsupdated', this.eventContexts.onSegmentsUpdated);
			document.addEventListener('vssegmentsupdated', this.eventContexts.onSegmentsUpdated);
		}
	},
	
	/* 
	 * extract domain and id from baseURI of media player 
	 * will growth when other domains will be added
	 */
	getVideoSourceInformation: function() {
		// console.log('mediaPlayerWrapper::getVideoSourceInformation()');
		
		// youtube
		var match = this.mediaPlayer.baseURI.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/);
		if ( match && match[7].length == 11 /* youtube video id length == 11 */ ) {
			return {domain: 'youtube', id: match[7]};
		}
		
		return null;
	},
	
	/* 
	 * request segments from database 
	 */
	requestSegments: function(domain, id, requestTime) {
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
					}, 
					this.settings.autoPauseDuration*1000
				);
			}
		}
		
		// console.log('request: https://db.videosegments.org/get_segments.php?domain=' + domain + '&' + 'video_id=' + id);
		
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://db.videosegments.org/get.php?domain=' + domain + '&' + 'id=' + id);
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log(xhr.responseText);
					
					// these operations will take time so go back and round load time for rewind
					self.mediaPlayer.currentTime = Math.floor(requestTime);
					
					var jsonResponce = JSON.parse(xhr.responseText);
					// if there are segments 
					if ( typeof jsonResponce.timestamps != 'undefined' ) {
						// convert json-responce into object
						self.segmentsData = jsonResponce;
						
						// add 0 and duration to json array of timestamps (db doesn't contain this information)
						// if there is more than one segment
						if ( self.segmentsData.timestamps[0] != 0.0 ) {
							// database doesn't contain first segment start time 
							self.segmentsData.timestamps.unshift(0.0);
							//  and last segment end time 
							self.segmentsData.timestamps.push(self.mediaPlayer.duration);
						}
						else {
							// if there is only one segment exists
							self.segmentsData.timestamps = [0.0, self.mediaPlayer.duration];
						}
						
						// insert segment bar 
						self.insertSegmentBar();
						
						// save playing speed
						self.playbackRate = self.mediaPlayer.playbackRate;
						
						// add listeners for events
						self.mediaPlayer.addEventListener("play", self.eventContexts.onPlay);
						self.mediaPlayer.addEventListener("pause", self.eventContexts.onPause);
						self.mediaPlayer.addEventListener("ratechange", self.eventContexts.onRateChange);
					}
					else {
						setTimeout(function() {
							if ( jsonResponce.votes == 0 ) {
								// insert request segmentation button 
								self.insertMenu(false);
							}
							else {
								// insert request segmentation button 
								self.insertMenu(true);
							}
						}, 1000);
					}
					
					// if user waiting for segments 
					if ( self.pauseTimer ) {
						clearTimeout(self.pauseTimer);
						self.pauseTimer = null;
						self.mediaPlayer.play();
					}
					
					// force call
					self.onPlay();
					
					// create custom event for moderator tools
					// https://bugzilla.mozilla.org/show_bug.cgi?id=999586
					// same issue "Permission denied to access property", bypass by JSON
					var event = new CustomEvent('vsgotsegments', { 
						detail: JSON.stringify({
							segmentsData: self.segmentsData,
							settings: self.settings,
							domain: domain,
							id: id
						})
					});
					document.dispatchEvent(event);
				}
			}
		}
		
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send();
	},
	
	/*
	 * Called when player start to play or after seeking (called before many events)
	 */
	onPlay: function() {
		// this event is called before "durationchange" event during ajax redirection so we have to stop it manually
		if ( this.url != this.mediaPlayer.baseURI ) {
			// console.log(this.url + ' ' + this.mediaPlayer.baseURI);
			return;
		}
		
		// console.log('mediaPlayerWrapper::onPlay()');
		
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
		if ( this.url != this.mediaPlayer.baseURI ) {
			return;
		}
		
		// console.log('mediaPlayerWrapper::tryRewind()');
		
		// kill rewind timer
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		// 2 digit precision is enough
		var currentTime = this.mediaPlayer.currentTime.toFixed(2);
		// console.log('current time: ' + currentTime, ', rewind time: ' + this.segmentsData.timestamps[rewindSegment]);
		// get difference between segment start time and current time
		var delay = this.segmentsData.timestamps[rewindSegment] - currentTime;
		// if called earlier (timeouts are inaccurate)
		if ( delay > 0 ) {
			var self = this;
			// wait 
			this.timer = setTimeout(function() { self.tryRewind(rewindSegment); }, delay*(1000/this.playbackRate));
		}
		else {
			// rewind to segment end time
			this.mediaPlayer.currentTime = this.segmentsData.timestamps[rewindSegment+1];
			
			// look for next segment
			rewindSegment = this.getNextSegment(rewindSegment+1);
			if ( rewindSegment ) {
				var self = this;
				// calculate delay 
				delay = this.segmentsData.timestamps[rewindSegment] - this.mediaPlayer.currentTime;
				// wait for next segment
				this.timer = setTimeout(function() { self.tryRewind(rewindSegment); }, delay*(1000/this.playbackRate));
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
		
		// segments count
		var segments = this.segmentsData.timestamps.length;
		// for each segment from initial segment
		for ( let i = startSegment; i < segments; ++i ) {
			// if requirements met
			if ( this.settings.segmentsToSkip[this.segmentsData.types[i]] == true && this.segmentsData.timestamps[i] >= this.mediaPlayer.currentTime ) {
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
		// console.log('mediaPlayerWrapper::onPause()');
		
		if ( this.timer ) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		if (this.pauseTimer) {
			clearTimeout(this.pauseTimer);
			this.pauseTimer = null;
		}
		
	},
	
	/*
	 * Called when player play speed was changed. Update rewind delay
	 */
	onRateChange: function() {
		// console.log('mediaPlayerWrapper::onRateChange()');
		
		// update playing speed
		this.playbackRate = this.mediaPlayer.playbackRate;
		
		// get next segment to rewind (TODO: remove this call)
		var rewindSegment = this.getNextSegment(0);
		if ( rewindSegment ) {
			// try to rewind 
			this.tryRewind(rewindSegment);
		}
	},
	
	/*
	 * Adds a segment bar after progress bar 
	 */
	insertSegmentBar: function() {
		// console.log('mediaPlayerWrapper::insertSegmentBar()');
		
		// if user doesn't want to see progress bar 
		if ( !this.settings.progressBar ) {
			// do nothing 
			return;
		}
		
		// get youtube progress bar
		var segmentsBar = document.getElementsByClassName("ytp-progress-list")[0];
		// get segments count
		var segmentsCount = this.segmentsData.timestamps.length - 1;
		
		// bar width  
		var width = 0;
		// bar offset from left  
		var left = 0;
		// for each segment
		for ( let i = 0; i < segmentsCount; ++i ) {
			// calculate width 
			width = (this.segmentsData.timestamps[i+1] - this.segmentsData.timestamps[i]) / this.segmentsData.timestamps[segmentsCount] * 100;
			
			// create div element
			var div = document.createElement('div');
			// set classname with segment number
			div.className = 'vs_progressbar' + i;
			// set div style
			// 0.12 - some kind of manual-found offset, 
			// isn't perfect but fine for now 
			div.style = 'position: absolute; left: ' + (left-0.12) + '%; width: ' + width + '%; height: 50%; background-color: ' + this.settings.segmentsColors[this.segmentsData.types[i]] + '; border: solid 1px black;';
			
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
		
		var prevMenuItem = document.getElementById('watch8-secondary-actions');
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
			
			button.style.color = 'gray';
			
			if ( requested ) {
				span.appendChild(document.createTextNode(browser.i18n.getMessage('segmentationRequestedLabel')));
			}
			else {
				button.id = 'vs-request-segmentation-button';
				
				// add pseudorule :hover 
				var css = '#vs-request-segmentation-button:hover {cursor: pointer} #vs-request-segmentation-button:hover > span {color: black}';
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
					iframe.src = 'https://db.videosegments.org/captcha.php';
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
										console.log(xhr.responseText);
										
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
	onSegmentsUpdated: function(event) 
	{
		if ( !this.segmentsData ) {
			this.mediaPlayer.addEventListener("play", this.eventContexts.onPlay);
			this.mediaPlayer.addEventListener("pause", this.eventContexts.onPause);
			this.mediaPlayer.addEventListener("ratechange", this.eventContexts.onRateChange);
		}
		
		this.removeSegmentBar();
		this.segmentsData = JSON.parse(event.detail).segmentsData;
		this.insertSegmentBar();
	}
};

function loadSettings(callback) {
	// console.log('loadSettings()');
	
	// request settings 
	browser.storage.local.get({
		/* stop playing until segments are fetched */ 
		autoPauseDuration: 	1,
		/* add segments below progress bar*/ 
		progressBar: 		true,
		
		/* segments to play */ 
		content:			true,
		intro:				false,
		advertisement:		false,
		credits:			false,
		interactive:		false,
		cutscene:			false,
		offtop:				false,
		scam:				false,
		
		/* colors of segments */ 
		colorContent:		'#00ff00',
		colorIntro:			'#0000ff',
		colorAdvertisement:	'#ff0000',
		colorCredits:		'#ffff00',
		colorInteractive:	'#00ffff',
		colorCutscene:		'#808080',
		colorOfftop:		'#ff00ff',
		colorScam:			'#008080'
		
	}, function(result) {
		// save settings
		var settings = {};
		
		// global settings 
		settings.autoPauseDuration = result.autoPauseDuration;
		settings.progressBar = result.progressBar;
		
		// invert "to play" -> "to skip"
		// c  - content 
		// i  - intro 
		// a  - advertisement 
		// cs - cutscene 
		// ia - interactive
		// cr - credits 
		// o  - offtop 
		// s  - scam
		settings.segmentsToSkip = {
			'c': !result.content,
			'i': !result.intro,
			'a': !result.advertisement,
			'cs': !result.cutscene,
			'ia': !result.interactive,
			'cr': !result.credits,
			's': !result.scam,
			'o': !result.offtop
		};
		
		// save colors
		// c  - content 
		// i  - intro 
		// a  - advertisement 
		// cs - cutscene 
		// ia - interactive
		// cr - credits 
		// o  - offtop 
		// s  - scam
		settings.segmentsColors = {
			'c': result.colorContent,
			'i': result.colorIntro,
			'a': result.colorAdvertisement,
			'cs': result.colorCutscene,
			'ia': result.colorInteractive,
			'cr': result.colorCredits,
			's': result.colorScam,
			'o': result.colorOfftop,
		};
		
		// settings.segmentsColors = {
			// 'c': '#00ff00',
			// 'i': '#0000ff',
			// 'a': '#ff0000',
			// 'cs': '#808080',
			// 'ia': '#00ffff',
			// 'cr': '#ffff00',
			// 's': '#ff00ff',
			// 'o': '#008080',
		// };
		
		callback(settings);
	});
}

// media player wrapper
var wrapper;

// look for media players on page 
function tryFindMediaPlayer(settings) 
{
	// find media player on page 
	var collection = document.getElementsByTagName("video");

	// if media player exists
	if ( collection[0] ) {
		// remove click callback
		document.onclick = null;
		
		// create wrapper 
		wrapper = Object.create(mediaPlayerWrapper);
		// initialize wrapper 
		wrapper.init(collection[0], settings);
	}
	else {
		// listen for click on page (ajax redirections)
		// there is spf* methods on youtube but 
		// this solution is domain-independent and may work 
		// on different domains (maybe will be changed if 
		// only youtube use ajax redirection)
		
		// do this check again 
		// document.onclick = function() {
			// tryFindMediaPlayer(settings);
			// console.log('click');
		// };
		
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
				// console.log(mutation.target.className);
				if ( mutation.target.className.indexOf('playing-mode') !== -1 && !hooked ) {
					// console.log(mutation);
					hooked = true;
					
					tryFindMediaPlayer(settings);
					observer.disconnect();
				}
			});
		}
	}
}

// load settings, look for media player on page
loadSettings(tryFindMediaPlayer);

// on settings update
browser.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if ( wrapper ) {
			loadSettings(function(settings) {
				wrapper.settings = settings;
				
				wrapper.removeSegmentBar();
				if ( settings.progressBar ) {
					wrapper.insertSegmentBar();
				}
				
				if ( !wrapper.mediaPlayer.paused ) {
					wrapper.mediaPlayer.pause();
					wrapper.mediaPlayer.play();
				}
			});
		}
	}
);