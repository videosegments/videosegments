'use strict';

if ( typeof this.chrome != 'undefined' ) {
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
	timestamps: null,
	types: null,
	origin: null,
	
	/* timer */
	timer: null,
	
	/* playback */
	playbackRate: null,
	preventPlaybackRateUpdate: null,
	muteFirstEvents: null,
	
		
	// called when "video" element appears on page 
	start: function(video, settings) {
		console.log('Wrapper::start()');
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
		
		if ( typeof chrome != 'undefined' ) {
			// chrome calls pause/play event at video start
			// workaround to fix it 
			this.muteFirstEvents = 2;
		}
		
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
		console.log('Wrapper::getSegmentation()');
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
		console.log('Wrapper::getPendingSegmentation()');
		
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
				self.timestamps.push(self.video.duration);
						
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
		console.log('Wrapper::getLocalSegmentation()');
		
		let video_id = self.domain + '-' + self.id;
		browser.storage.local.get({[video_id]: ''}, function(result) {
			if ( result[video_id] !== '' ) {
				self.timestamps = result[video_id].timestamps;
				self.timestamps.unshift(0.0);
				self.timestamps.push(self.video.duration);
						
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
		console.log('Wrapper::getOfficialSegmentation()');
		
		let xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://db.videosegments.org/get.php?domain=' + self.domain + '&' + 'id=' + self.id);
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
		console.log('Wrapper::clearPauseTimer()');
		
		self.timer = null;
		self.video.play();
		
		self.origin = 'noSegmentation';
		self.onSegmentationReady();
	},
	
	onSegmentationReady: function() {
		console.log('Wrapper::onSegmentationReady()');
		
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
		console.log('Wrapper::insertSegmentsBar()');
		
		if ( this.settings.showSegmentsbar === false ) {
			return;
		}
		
		let progressBar = document.getElementsByClassName("ytp-progress-bar-container")[0];
		let segmentsBar = document.createElement('ul');
		segmentsBar.id = 'vs-segmentsbar';
		progressBar.insertAdjacentElement("afterEnd", segmentsBar);
		
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
		console.log('Wrapper::removeSegmentsBar()');
	
		let segmentsBar = document.getElementById('vs-segmentsbar');
		if ( segmentsBar ) {
			segmentsBar.remove();
		}
	},
	
	updateSegmentsBar: function() {
		this.removeSegmentsBar();
		this.insertSegmentsBar();
	},
	
	onPlay: function() {
		console.log('Wrapper::onPlay()');
		
		// first call is nessesary and second one is false so mute him
		if ( this.muteFirstEvents == 1 ) {
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
		console.log('Wrapper::getNextRewindSegment()');
		
		let currentTime = Math.round(this.video.currentTime * 1e2) / 1e2;
		for ( let i = startSegment; i < this.types.length; ++i ) {
			if ( this.settings.segments[this.types[i]].skip == true && this.timestamps[i] >= currentTime ) {
				return i;
			}
		}
		
		return null;
	},
	
	tryRewind: function(rewindSegment) {
		console.log('Wrapper::tryRewind()');
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
		console.log('Wrapper::processSegment()');
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
		console.log('Wrapper::restoreSpeed()');
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
		console.log('Wrapper::onPause()');
		
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
		console.log('Wrapper::onRateChange()');
		
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
		this.settings = settings;
		this.updateSegmentsBar();
		
		if ( window.parent === window ) {
			this.editor.end();
			this.editor.start(this, this.timestamps, this.types, this.origin, this.settings, 'youtube', this.id);
		}
	},
	
	// called when "video" element "src" is changed
	end: function() {
		console.log('Wrapper::end()');
		
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