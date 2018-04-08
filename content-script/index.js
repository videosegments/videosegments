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

// I'm not sure that I can safely override console.log to function() {}
// so I'll use wrapper
// var log = console.log.bind(console);
var log = function() {};

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

let observer;

// load settings 
getSettings(function(settings) {
	// start observer to look for "video" elements 
	observer = new Object(Observer);
	observer.start(settings);
});

// on settings update 
browser.runtime.onMessage.addListener(function(request) {
	if ( typeof request.settings !== 'undefined' ) {
		observer.updateSettings(request.settings);
	}
	// too long to wait for channel to appear and even more for category
	// use it only for filter selection 
	else if ( typeof request.getCategory !== 'undefined' ) {
		observer.getCategory();
	}
	else if ( typeof request.getChannel !== 'undefined' ) {
		observer.getChannel();
	}
});

function getSettings(callback) {
	// prevent background check after installation 
	observer = 1;
	
	let defaultSettings = {
		// segments configuration
		segments: {
			// expert mode 
			// content 
			c: 	{ skip: false, color: '#00c853', duration: 0.0, speed: 1.0 },
			// adcontent 
			ac: { skip: false, color: '#00897b', duration: 0.0, speed: 1.0 },
			// advertisement 
			a: 	{ skip: true,  color: '#e53935', duration: 0.0, speed: 5.0 },
			// intro 
			i: 	{ skip: true,  color: '#3949ab', duration: 0.0, speed: 5.0 },
			// credits 
			cr: { skip: true,  color: '#ffb300', duration: 0.0, speed: 5.0 },
			// cutscene 
			cs: { skip: true,  color: '#757575', duration: 0.0, speed: 2.0 },
			// offtop 
			o: 	{ skip: true,  color: '#8e24aa', duration: 0.0, speed: 3.0 },
			// interactive 
			ia: { skip: true,  color: '#00acc1', duration: 0.0, speed: 4.0 },
			// scam 
			s:	{ skip: true,  color: '#6d4c41', duration: 0.0, speed: 5.0 },
			
			// simplified mode 
			// play 
			pl: { skip: false, color: '#00c853', duration: 0.0, speed: 1.0 },
			// skip 
			sk:	{ skip: true,  color: '#757575', duration: 0.0, speed: 5.0 },
		},
		
		// global settings 
		autoPauseDuration: 2.0,
		showSegmentationTools: false,
		hideOnSegmentedVideos: false,
		pinSegmentationTools: false,
		hideIcon: false,
		maximizePanelOnHover: false,
		showPageOnReject: true,
		popupDurationOnSend: 5.0,
		databasePriority: 'local',
		segmentationToolsOpacity: 100,
		iconOpacity: 100,
		segmentsBarLocation: 'separated',
		
		// moderator settings 
		displayPending: false,
		openSettings: false,
		
		// backward compatibility 
		// this var was intented to be flag but got replaced by string 
		simplified: true,
		// addon working in simplified (skip-play) mode 
		mode: 'simplified', 
		lastTab: 'tab-filters',
		minimized: false,
		
		filters: {
			apiKey: '',
			
			channelBased: {
				enabled: false,
			},
			
			silence: {
				enabled: false,
				threshold: 0,
				duration: 2.0,
			},
		},
		
		// first time launch stuff
		highlightIcon: true, // red border over icon 
		// tutorial
		tutorial: 0,

		editor: {
			posX: 100,
			posY: 200,
		},
		
		// user notification  
		// messages: {
			// segmentation: true,	// popup on addon installation. currently disabled
		// },
	};
	
	// request settings 
	browser.storage.local.get({
		settings: defaultSettings
	}, function(result) {
		// backward compatibility 
		let settings = Object.assign({}, defaultSettings, result.settings);
		// log(settings);
		
		callback(settings);
	});
}
