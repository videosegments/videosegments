'use strict';

// console.log = function() {};

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

let observer;

// load settings 
getSettings(function(settings) {
	// start observer to look for "video" elements 
	observer = new Object(Observer);
	observer.start(settings);
})

// on settings update 
browser.runtime.onMessage.addListener(function(request) {
	if ( typeof request.settings !== 'undefined' ) {
		observer.updateSettings(request.settings);
	}
	// too long to wait for channel to appear and even more for category
	// else if ( typeof request.getCategory !== 'undefined' ) {
		// observer.getCategory();
	// }
	// else if ( typeof request.getChannel !== 'undefined' ) {
		// observer.getChannel();
	// }
});

function getSettings(callback) {
	let defaultSettings = {
		// segments configuration
		segments: {
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
		},
		
		// global settings 
		autoPauseDuration: 1.0,
		showSegmentationTools: false,
		hideOnSegmentedVideos: false,
		pinSegmentationTools: false,
		hideIcon: false,
		popupDurationOnSend: 3.0,
		databasePriority: 'local',
		segmentationToolsOpacity: 100,
		iconOpacity: 100,
		segmentsBarLocation: 'separated',
		
		// moderator settings 
		displayPending: false,
		openSettings: false,
		
		// addon working in simplified (skip-play) mode 
		mode: 'simplified', 
		
		// user notification  
		// messages: {
			// segmentation: true,	// popup on addon installation. currently disabled
		// },
	};
	
	// request settings 
	browser.storage.local.get({
		settings: defaultSettings
	}, function(result) {
		if ( result.settings.simplified ) {
			result.settings.mode = 'simplified';
		}
		else {
			result.settings.mode = 'normal';
		}
		callback(result.settings);
	});
}
