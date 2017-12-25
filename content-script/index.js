'use strict';

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

// load settings 
getSettings(function(settings) {
	// start observer to look for "video" elements 
	let observer = new Object(Observer);
	observer.start(settings);
})

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
		showSegmentsbar: true,
		showSegmentationTools: false,
		hideOnSegmentedVideos: false,
		pinSegmentationTools: false,
		hideIcon: false,
		popupDurationOnSend: 3.0,
		databasePriority: 'local',
		segmentationToolsOpacity: 100,
		
		// moderator settings 
		displayPending: false,
		openSettings: false,
	};
	
	// request settings 
	browser.storage.local.get({
		settings: defaultSettings
	}, function(result) {
		callback(result.settings);
	});
}
