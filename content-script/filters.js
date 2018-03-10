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

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

var Filters = {
	settings: null,
	wrapper: null,
	editor: null,
	
	processor: null,
	context: null,
	output: null,
	
	start: function(settings, wrapper, editor) {
		log('Filters::start()');
		
		this.settings = settings;
		this.wrapper = wrapper;
		this.editor = editor;
		
		// TODO: do it without "try" statement
		try {
			if ( settings.filters.silence.enabled === false ) {
				this.output.disconnect(this.context.destination);
				this.processor.disconnect(this.context.destination);
			}
		}
		catch(err) {}
		
		// idk how to close createMediaElementSource
		// this workaround works fine 
		if ( this.output ) {
			return;
		}
		
		if ( settings.filters.silence.enabled === false ) {
			return;
		}
		
		this.context = new AudioContext();
        this.processor = this.context.createScriptProcessor(256, 1, 1);
        this.output = this.context.createMediaElementSource(this.wrapper.video);
		
        this.processor.connect(this.context.destination);
        this.output.connect(this.context.destination);

        let analyser = this.context.createAnalyser();
        analyser.smoothingTimeConstant = 0.0;
        analyser.fftSize = 128;

        let splitter = this.context.createChannelSplitter();
        splitter.connect(analyser, 0, 0);
        this.output.connect(splitter);

		let self = this;
        analyser.connect(this.processor);
		
		// work only for auto-filtered or non-segmented videos 
		if ( wrapper.origin !== 'noSegmentation' && wrapper.origin !== 'filtered' ) {
			return;
		}
		
		let silenceStart;
		let lastFrame = self.wrapper.video.currentTime;
		this.processor.onaudioprocess = function() {
			// stop on rewind
			// TODO: events, events... 
			let timeDiff = self.wrapper.video.currentTime - lastFrame;
			lastFrame = self.wrapper.video.currentTime;
			// log(timeDiff);
			if ( timeDiff < 0 || timeDiff > 0.4 ) {
				silenceStart = undefined;
				return;
			}
			
			if ( self.wrapper.video.paused ) {
				// TODO: events, events... 
				if ( typeof silenceStart !== 'undefined' && self.wrapper.video.currentTime === self.wrapper.video.duration && silenceStart !== self.wrapper.video.duration ) {
					let duration = self.wrapper.video.duration - silenceStart;
					if ( duration >= settings.filters.silence.duration ) {
						log('end silence', self.wrapper.video.duration-silenceStart, self.wrapper.video.currentTime, silenceStart);
							
						self.wrapper.video.currentTime = silenceStart - 0.1;
						if ( self.settings.mode === 'simplified' ) {
							document.getElementById('vs-left-button-pl').click();
						}
						else {
							document.getElementById('vs-left-button-c').click();
						}
						
						self.wrapper.video.currentTime = self.wrapper.video.duration;
						if ( self.settings.mode === 'simplified' ) {
							document.getElementById('vs-left-button-sk').click();
						}
						else {
							document.getElementById('vs-left-button-cs').click();
						}
					}
					
					silenceStart = undefined;
				}
				
				return;
			}
			
			let array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			
			let sum = 0;
			for ( let v of array ) {
				sum += v;
			}
			
			log(sum);
			
			if ( sum <= settings.filters.silence.threshold ) {
				if ( typeof silenceStart === 'undefined' ) {
					silenceStart = self.wrapper.video.currentTime;
				}
			}
			else {
				if ( typeof silenceStart !== 'undefined' ) {
					let currentTime = self.wrapper.video.currentTime;
					let duration = currentTime - silenceStart;
					if ( duration >= settings.filters.silence.duration ) {
						log('silence', duration, self.wrapper.video.currentTime, silenceStart);
						
						if ( silenceStart !== 0.0 ) {
							self.wrapper.video.currentTime = silenceStart;
							
							if ( self.settings.mode === 'simplified' ) {
								document.getElementById('vs-left-button-pl').click();
							}
							else {
								document.getElementById('vs-left-button-c').click();
							}
						}
						
						self.wrapper.video.currentTime = currentTime - 0.1;
						if ( self.settings.mode === 'simplified' ) {
							document.getElementById('vs-left-button-sk').click();
						}
						else {
							document.getElementById('vs-left-button-cs').click();
						}
						self.wrapper.video.currentTime += 0.1;
					}
					silenceStart = undefined;
				}
			}
		}
	},
	
	end: function() {
		log('Filters::end()');
		
		if ( typeof silenceStart !== 'undefined' && self.wrapper.video.currentTime === self.wrapper.video.duration && silenceStart !== self.wrapper.video.duration ) {
			let duration = self.wrapper.video.duration - silenceStart;
			if ( duration >= settings.filters.silence.duration ) {
				log('end silence', self.wrapper.video.duration-silenceStart, self.wrapper.video.currentTime, silenceStart);
					
				self.wrapper.video.currentTime = silenceStart - 0.1;
				if ( self.settings.mode === 'simplified' ) {
					document.getElementById('vs-left-button-pl').click();
				}
				else {
					document.getElementById('vs-left-button-c').click();
				}
				
				self.wrapper.video.currentTime = self.wrapper.video.duration;
				if ( self.settings.mode === 'simplified' ) {
					document.getElementById('vs-left-button-sk').click();
				}
				else {
					document.getElementById('vs-left-button-cs').click();
				}
			}
			
			silenceStart = undefined;
		}
		
		// this.output.disconnect(this.context.destination);
		// this.processor.disconnect(this.context.destination);
		// this.context.close();
	}
};
