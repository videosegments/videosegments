/*
    VideoSegments. Extension to Cut YouTube Videos. 
    Copyright (C) 2017-2019  Alex Lys

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

class Player {
	constructor(video, mutePlayEvent) {
		// save video reference 
		this.video = video;

		// acceleration vars 
		this.prevPlaybackRate = null;
		this.preventRateChangedEvent = false;
		this.muteEvent = -1;

		this.startTime = null;
		this.seekTime = null;

		if (mutePlayEvent) {
			this.muteEvent = 1;
		}

		// extract youtube video ID 
		// let tmp = document.getElementsByClassName('ytp-title-link')[0];
		// let src = (tmp ? tmp.href : null) || (this.video ? this.video.src : null);
		// this.id = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)[1];
		this.id = window.location.href.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)[1];

		// play event will be called several times before video start 
		this.onPlayBeforeLoadedContext = () => {
			// if autopause enabled 
			if (settings.autoPauseDuration > 0.0) {
				// round video's current time because it already played 0.0001'th of second  
				this.video.currentTime = Math.round(this.video.currentTime);
				log('autopausing video at: ', this.video.currentTime);
				this.startTime = Math.round(this.video.currentTime);

				// if video is not paused 
				if (this.video.paused === false) {
					// pause video 
					this.video.pause();

					// if autopause timer doesn't exists 
					if (!this.timer) {
						// set autopause timer 
						this.timer = setTimeout(() => {
							log('autopause timeout');
							this.video.removeEventListener('play', this.onPlayBeforeLoadedContext);
							this.video.play();
						}, settings.autoPauseDuration * 1000);
					}
				}
			}
		}

		// listen for play events before segmentation is loaded 
		this.video.addEventListener('play', this.onPlayBeforeLoadedContext);
		// force pause for video (required for playlists)
		this.onPlayBeforeLoadedContext();

		// if video is ready to play 
		if (this.video.readyState > 3) {
			// request segmentation 
			this.getSegmentation();
			log('video stream is ready');
		} else {
			// when video is ready to play 
			let ctx = () => {
				this.video.removeEventListener('canplay', ctx);
				this.getSegmentation();
			}

			// wait for video 
			this.video.addEventListener('canplay', ctx);
			log('waiting for video to load...');
		}

		if (settings.hideEndScreenCards === 'yes') {
			injectCSSRule('.ytp-ce-channel {visibility: hidden !important;}');
			injectCSSRule('.ytp-ce-playlist {visibility: hidden !important;}');
			injectCSSRule('.annotation {visibility: hidden !important;}');
			injectCSSRule('.ytp-cards-button {visibility: hidden !important;}');
			injectCSSRule('.ytp-ce-video {visibility: hidden !important;}');
			injectCSSRule('.ytp-ce-expanding-image {visibility: hidden !important;}');
		}
	}

	async getSegmentation() {
		let self = this;

		log('requesting segmentation...');
		this.segmentation = null;

		// create segmentsbar 
		let progressBar = document.getElementsByClassName("ytp-progress-bar-container")[0] || document.getElementsByClassName("no-model cue-range-markers")[0];
		this.segmentsbar = new Segmentsbar(progressBar);

		let pid = getQueryString('vs-pid');
		let q_segments = JSON.parse(decodeURIComponent(getQueryString('segments')))
		if (q_segments !== null) {
			this.setLocalSegmentation(
			  q_segments.timestamps,
			  q_segments.types,
			  q_segments.id
			);
		  }
		if (pid === null) {
			// request local and community segmentations 
			this.getCommunitySegmentation().then(segmentation => {
				if (typeof segmentation.types === 'undefined') {
					self.channel = segmentation.channel;
				}

				if (typeof segmentation.types === 'undefined') {
					self.onGotSegmentation('official', {}, 'local');
				} else {
					self.onGotSegmentation('official', {
						timestamps: segmentation.timestamps,
						types: segmentation.types
					}, 'local');
				}
			});
			if (q_segments != null) {

				this.getLocalSegmentation().then(segmentation => {
					self.onGotSegmentation('local', {
						timestamps: q_segments.timestamps,
						types: q_segments.types
					}, 'official')
				});

			}
			else {
				this.getLocalSegmentation().then(segmentation => self.onGotSegmentation('local', segmentation, 'official'));
			}
		} else {
			this.segmentation = await this.getPendingSegmentation(pid);
			this.onSegmentationReady();
		}
	}

	onGotSegmentation(origin, segmentation, secondaryOrigin) {
		log(settings.databasePriority);
		log('got ' + ((settings.databasePriority === origin) ? 'primary' : 'secondary') + ' segmentation:', origin, segmentation);

		// save current segmentation 
		this[origin] = segmentation;
		// if this segmentation have priority 
		if (settings.databasePriority === origin) {
			// if this segmentation exists 
			if (this[origin] && this[origin].types) {
				// set as primary 
				this.segmentation = segmentation;
				this.segmentation.origin = origin;

				log('primary segmentation is ready');
				this.onSegmentationReady();
			}
			// if secondary segmentation exists 
			else if (this[secondaryOrigin] && this[secondaryOrigin].types) {
				// set secondary segmentation as primary 
				this.segmentation = this[secondaryOrigin];
				this.segmentation.origin = secondaryOrigin;

				log('no primary segmentation exists, use secondary as primary');
				this.onSegmentationReady();
			}
		}
		// save this segmentation as secondary 
		else {
			// if no primary segmentation exists 
			if (typeof this[settings.databasePriority] !== 'undefined' && typeof this[settings.databasePriority].types === 'undefined' && typeof segmentation.types !== 'undefined') {
				// set secondary segmentation as primary 
				this.segmentation = segmentation;
				this.segmentation.origin = origin;

				log('no primary segmentation exists, use secondary as primary');
				this.onSegmentationReady();
			}
		}

		// if no segmentation  
		if (this.segmentation === null && this[origin] && this[secondaryOrigin]) {
			log('no segmentations exists');
			this.segmentation = {
				origin: 'noSegmentation'
			};
			this.onSegmentationReady();
		}
	}

	async onSegmentationReady() {
		if (typeof this.editor !== 'undefined') {
			return;
		}

		if (this.segmentation.origin === 'noSegmentation') {
			this.segmentation = await tryChannelFilter(this.channel, this.video.duration);
		} else {
			this.segmentation = this.prepareSegmentation(this.segmentation);
			if ((typeof this.segmentation.types !== 'undefined') && this.segmentation.types[this.segmentation.types.length - 1] === '-') {
				this.segmentation.timestamps.pop();
				this.segmentation.types.pop();
			}
		}

		// bind events so "this" will be reference to object instead of "video"
		this.onPlayEventContext = this.onPlayEvent.bind(this);
		this.onPauseEventContext = this.onPauseEvent.bind(this);
		this.onRateChangeEventContext = this.onRateChangeEvent.bind(this);

		// listen for events 
		this.video.addEventListener('play', this.onPlayEventContext);
		this.video.addEventListener('seeked', () => {
			// quick fix for looped videos 
			if (this.video.currentTime <= 0.1) {
				this.startTime = 0.0;
				this.onPlayEvent(""); // pass something or handler will reject 
			}
		});
		this.video.addEventListener('pause', this.onPauseEventContext);
		this.video.addEventListener('ratechange', this.onRateChangeEventContext);

		// sometime player reset video to 0 at start
		// this.video.addEventListener('seeked', () => {
		//     log('seeked', this.video.currentTime);
		//     if (this.seekTime !== null && Math.abs(this.seekTime-this.video.currentTime) > 0.1 ) {
		//         this.video.currentTime = this.seekTime;
		//         this.seekTime = null;
		//         log('corrected seek time');
		//     }
		// });

		if (settings.mode === 'simplified') {
			this.originalSegmentation = this.segmentation;
			this.segmentation = this.getSimplifiedSegmentation(this.segmentation);
			this.segmentation.origin = this.originalSegmentation.origin;
		}

		// remove play listener 
		this.video.removeEventListener('play', this.onPlayBeforeLoadedContext);

		// if autopause timer is working 
		if (this.timer) {
			// disable timer 
			clearTimeout(this.timer);
			this.timer = undefined;
			// start video playback 

			this.video.play();
		} else {
			// fake play event 
			this.onPlayEventContext();
		}

		this.segmentsbar.set(this.segmentation.timestamps, this.segmentation.types, this.video.duration);
		// log('segmentsbar created');

		// if it is not iframe
		if (window.parent === window) {
			// start editor 
			this.editor = new Editor(this, this.segmentsbar, this.video, this.id, this.segmentation);
			this.createCutVideoButton();
		}
	}

	createCutVideoButton() {
		if (this.cutButtonTimer !== null) {
			clearInterval(this.cutButtonTimer);
		}

		this.cutButtonTimer = setInterval(() => {
			this.cutButton = document.getElementById('vs-cut-video-button');
			if (this.cutButton !== null) {
				return;
			}

			let actions = document.getElementById('top-level-buttons');
			if (actions !== null && actions.childNodes.length !== 0) {
				clearInterval(this.cutButtonTimer);
				this.cutButtonTimer == null;

				let button = document.createElement('button');
				button.id = 'vs-cut-video-button';

				let image = document.createElement('span');
				image.id = 'vs-cut-video-button-image';
				image.classList.add('fa');
				image.classList.add('fa-cut');
				button.appendChild(image);

				let text = document.createElement('span');
				text.id = 'vs-cut-video-button-text';

				if (settings.showPanel === 'always') {
					translateNodeText(text, "HidePanel");
				} else {
					translateNodeText(text, "CutVideo");
				}

				button.appendChild(text);

				actions.childNodes[1].insertAdjacentElement('afterEnd', button);
				button.addEventListener('click', () => {
					if (settings.showPanel === 'always') {
						settings.showPanel = 'never';
						this.editor.panel.style.visibility = 'hidden';
						translateNodeText(text, "CutVideo");
					} else {
						settings.showPanel = 'always';
						this.editor.panel.style.visibility = 'visible';
						translateNodeText(text, "HidePanel");
					}
					saveSettings();
				});

				playTutorial(settings.tutorial.section, button);
			}
		}, 1000);
	}

	// TODO: move get request to utils 
	getCommunitySegmentation() {
		// browser.runtime.sendMessage({
		// 	'get_segmentation': this.id
		// }, function (response) {
		// 	console.log(response);
		// });

		return new Promise(resolve => {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', 'https://db.videosegments.org/api/v3/get.php?id=' + this.id);

			xhr.onreadystatechange = () => {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						let response = JSON.parse(xhr.responseText);
						resolve(response || {});
					} else {
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
			browser.storage.local.get({
				[storageId]: ''
			}, function (result) {
				if (result[storageId] !== '') {
					let response = {
						timestamps: result[storageId].timestamps,
						types: result[storageId].types
					};
					resolve(response || {});
				} else {
					resolve({});
				}
			});
		});
	}

	setLocalSegmentation(timestamps, types, id) {
   		let storageId = 'youtube-' + id;
    	let data = { timestamps: timestamps, types: types };
    	browser.storage.local.set({ [storageId]: data });
  	}

	async getPendingSegmentation(pid) {
		let response = await xhr_get('https://db.videosegments.org/api/v3/review.php?id=' + pid);
		if (typeof response.timestamps !== 'undefined' && response.timestamps.length > 0) {
			let timestamps = response.timestamps;
			let types = response.types;
			let origin = 'pending';
			return {
				timestamps: timestamps,
				types: types,
				origin: origin
			};
		} else {
			// window.location.href = removeParam("vs-pid", window.location.href);
			window.location = removeParam("vs-pid", window.location.href);
		}

		return ({});
	}

	prepareSegmentation(segmentation) {
		if (typeof segmentation.types !== 'undefined') {
			segmentation.timestamps.unshift(0.0);
			segmentation.timestamps.push(parseFloat(this.video.duration));
		}

		return segmentation;
	}

	getSimplifiedSegmentation(segmentation) {
		if (typeof segmentation.types === 'undefined') {
			return {
				timestamps: undefined,
				types: undefined
			};
		}

		let simplified = {
			timestamps: [0.0],
			types: []
		};

		let lastType = this.getSegmentSimplifiedType(segmentation.types[0]);
		for (let i = 1; i < segmentation.types.length; ++i) {
			if (this.getSegmentSimplifiedType(segmentation.types[i]) !== lastType) {
				simplified.timestamps.push(segmentation.timestamps[i]);
				simplified.types.push(lastType);

				lastType = this.getSegmentSimplifiedType(segmentation.types[i]);
			}
		}

		if (this.getSegmentSimplifiedType(segmentation.types[segmentation.types.length - 1]) === lastType) {
			simplified.timestamps.push(segmentation.timestamps[segmentation.timestamps.length - 1]);
			simplified.types.push(lastType);
		}

		return simplified;
	}

	getOriginalSegmentation(segmentation) {
		if (typeof this.originalSegmentation === 'undefined' || typeof this.originalSegmentation.timestamps === 'undefined') {
			return {
				timestamps: segmentation.timestamps,
				types: convertSimplifiedSegmentation(segmentation.types)
			}
		} else {
			return this.originalSegmentation;
		}
	}

	getSegmentSimplifiedType(type) {
		if (type === 'c' || type == 'ac') {
			return 'pl';
		} else {
			return 'sk';
		}
	}

	onPlayEvent(event) {
		log('player::onPlayEvent: ', this.video.currentTime, this.startTime, this.seekTime);
		if (typeof event === 'undefined') {
			return;
		}

		// if (this.muteEvent === 0) {
		// this.muteEvent = -1;
		// log('muted');
		// return;
		// }
		// this.muteEvent = this.muteEvent - 1;

		if (this.segmentation) {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = undefined;
			}

			this.restoreSpeed();

			let segmentToRewind = this.findNextSegmentToRewind(0);
			if (segmentToRewind !== null) {
				this.tryRewind(segmentToRewind);
			}
		}
	}

	tryRewind(toSegmentNumber) {
		let currentTime;
		if (this.startTime !== null) {
			currentTime = this.startTime;
			this.startTime = null;
		} else {
			currentTime = this.video.currentTime;
		}
		log(currentTime, toSegmentNumber);

		let delay = this.segmentation.timestamps[toSegmentNumber] - currentTime;
		if (delay <= 0) {
			let duration = this.segmentation.timestamps[toSegmentNumber + 1] - currentTime;
			if (duration <= settings.segments[this.segmentation.types[toSegmentNumber]].duration) {
				this.prevPlaybackRate = this.video.playbackRate;
				this.preventRateChangedEvent = true;

				this.video.playbackRate = settings.segments[this.segmentation.types[toSegmentNumber]].speed;

				delay = duration * (1000 / this.video.playbackRate);
				// timers have awful precision so start a little bit earlier
				if (delay > 500 && delay > 40) {
					// TODO: timers precision is about 10ms, so it can be calculated more precisily depending on speed
					delay -= 40;
				}
				this.timer = setTimeout(() => {
					this.restoreSpeed(toSegmentNumber);
					this.onPlayEvent();
				}, delay);
			} else {
				this.seekTime = this.segmentation.timestamps[toSegmentNumber + 1];
				this.video.currentTime = this.segmentation.timestamps[toSegmentNumber + 1];

				toSegmentNumber = this.findNextSegmentToRewind(toSegmentNumber);
				delay = this.segmentation.timestamps[toSegmentNumber] - this.video.currentTime;
			}
		}

		if (toSegmentNumber !== null) {
			this.timer = setTimeout(() => {
				this.tryRewind(toSegmentNumber);
			}, delay * (1000 / this.video.playbackRate));
		}
	}

	restoreSpeed() {
		if (this.prevPlaybackRate !== null) {
			this.preventRateChangedEvent = true;
			this.video.playbackRate = this.prevPlaybackRate;
			this.prevPlaybackRate = null;
		}
	}

	findNextSegmentToRewind(currentSegmentNumber) {
		if (!this.segmentation || !this.segmentation.timestamps || !this.segmentation.types) return null;

		let currentTime;
		if (this.startTime !== null) {
			currentTime = Math.round(this.startTime * 100) / 100;
		} else {
			currentTime = Math.round(this.video.currentTime * 100) / 100;
		}

		for (let i = currentSegmentNumber; i < this.segmentation.types.length; ++i) {
			if (settings.segments[this.segmentation.types[i]].skip == true && this.segmentation.timestamps[i] >= currentTime) {
				return i;
			}
		}

		return null;
	}

	onRateChangeEvent() {
		log('player::onRateChangeEvent: ', this.video.currentTime);

		if (this.preventRateChangedEvent === false) {
			this.onPlayEvent();
		} else {
			this.preventRateChangedEvent = false;
		}
	}

	onPauseEvent() {
		log('player::onPauseEvent: ', this.video.currentTime);

		if (this.timer && this.muteEvent !== 0) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
	}

	updateSettings(prop, value) {
		if (prop === 'databasePriority') {
			settings[prop] = value;
		} else if (prop === 'segmentsBarLocation') {
			settings[prop] = value;
			this.segmentsbar.updatePosition();
		} else if (prop === 'mode') {
			settings[prop] = value;

			if (value === 'simplified') {
				this.segmentation = this.getSimplifiedSegmentation(this.segmentation);
			} else {
				this.segmentation = this.getOriginalSegmentation(this.segmentation);
			}
			this.editor.updateSettings(prop, {
				mode: value,
				segmentation: this.segmentation
			});
		} else if (prop === 'autoPauseDuration') {
			settings[prop] = value;
		} else if (prop === 'popupDurationOnSend') {
			settings[prop] = value;
		} else if (prop === 'color') {
			settings.segments[value.segment].color = value.newColor;
			settings.segments[value.segment].opacity = value.opacity;

			if (settings.mode === 'simplified') {
				if (value.segment === 'pl' || value.segment === 'sk') {
					this.segmentsbar.updateColor(value.segment, settings.segments[value.segment].color, settings.segments[value.segment].opacity);
				}
			} else {
				if (value.segment !== 'pl' && value.segment !== 'sk') {
					this.segmentsbar.updateColor(value.segment, settings.segments[value.segment].color, settings.segments[value.segment].opacity);
				}
			}
		} else if (prop === 'playback') {
			settings.segments[value.segment].skip = value.skip;
		} else if (prop === 'accelerationDuration') {
			settings.segments[value.segment].duration = value.duration;
		} else if (prop === 'accelerationSpeed') {
			settings.segments[value.segment].speed = value.speed;
		} else {
			this.editor.updateSettings(prop, value);
		}
	}

	remove() {
		this.video.removeEventListener('play', this.onPlayEventContext);
		this.video.removeEventListener('pause', this.onPauseEventContext);
		this.video.removeEventListener('ratechange', this.onRateChangeEventContext);

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}

		if (this.cutButtonTimer !== null) {
			clearInterval(this.cutButtonTimer);
		}

		this.segmentation = undefined;

		this.editor.remove();
		this.editor = undefined;

		this.segmentsbar.remove();
		this.segmentsbar = undefined;
	}
}