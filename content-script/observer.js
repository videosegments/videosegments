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

// class to observe "video" elements 
var Observer = {
	/* MutationObserver element */
	observer: null,
	/* HTML5 collection for "video" tag */
	collection: null,
	/* core object of addon */
	wrapper: null,
	/* settings */
	settings: null,
	/* 
		workaround for acceleration in chrome\opera 
		browser will call pause/play events on first video on tab 
		this workaround is required if user open tab with video 
		if he start with youtube main page, workaround should be disabled 
	*/
	muteFirstEvents: null,
	
	start: function(settings) {
		log('Observer::start()');
		let self = this;
		this.settings = settings;
		
		if ( typeof InstallTrigger === 'undefined' ) {
			let match = window.location.href.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
			if ( match && match[1].length == 11 ) { /* youtube video id == 11 */
				this.muteFirstEvents = true;
			}
		}
		else {
			this.muteFirstEvents = false;
		}
		
		// to increase performance look into html5 live collection instead of hundreds of mutations 
		// https://stackoverflow.com/a/39332340
		this.collection = document.getElementsByTagName('video');
		this.wrapper = new Object(Wrapper);
		
		// callback for first MutationObserver
		// look for "video" tag on page 
		let onBodyMutation = function(mutations) {
			// log('Observer::onBodyMutation()');
			
			// if "video" tag appeared with proper "src" attribute 
			if ( self.collection[0] && self.collection[0].src ) {
				log('player found');
				
				// disconnect first 
				self.observer.disconnect();
				
				// connect second 
				self.observer = new MutationObserver(onPlayerMutation);
				self.observer.observe(self.collection[0], { attributes: true, attributeFilter: ['src'] });
				
				// 
				self.wrapper.start(self.collection[0], self.settings, self.muteFirstEvents);
				self.muteFirstEvents = false;
			}
		}
		
		// callback for second MutationObserver
		// look only at change of "src" attribute 
		let onPlayerMutation = function(mutations) {
			// log('Observer::onPlayerMutation()');
			
			// disconnect second  
			self.observer.disconnect();
			
			// connect first  
			self.observer = new MutationObserver(onBodyMutation);
			self.observer.observe(document.documentElement, { childList: true, subtree: true });
			
			//
			self.wrapper.end();
		}
		
		// start first MutationObserver
		this.observer = new MutationObserver(onBodyMutation);
		this.observer.observe(document.documentElement, { childList: true, subtree: true });
	},
	
	updateSettings: function(settings) {
		this.settings = settings;
		this.wrapper.updateSettings(this.settings);
	},
	
	// getCategory: function() {
		// this.wrapper.getCategory();
	// },
	
	// getChannel: function() {
		// this.wrapper.getChannel();
	// },
	
	end: function() {
		log('Observer::end()');
		
		this.observer.disconnect();
		this.wrapper.end();
		
		this.collection = null;
		this.wrapper = null;
	}
};