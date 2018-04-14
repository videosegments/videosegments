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

var timer;
var doCheck = false;
var totalTime = undefined;

browser.storage.local.get({ 
		settings: false,
		// messages: {
			// segmentation: false,
		// },
		firstRun: true,
		totalTime: 0,
	}, function(result) {
		// log(result);
		
		if ( result.settings ) {
			doCheck = result.settings.displayPending;
			
			checkContext();
			timer = setInterval(checkContext, 30000);
		}
		
		browser.browserAction.setBadgeBackgroundColor({color: "#00ABFF"});
		
		if ( result.firstRun ) {
			browser.storage.local.set({ firstRun: false });
			// browser.tabs.query({}, function(tabs) {
				// for ( let i = 0; i < tabs.length; ++i ) {
					// let match = tabs[i].url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
					// if ( match && match[1].length == 11 ) { /* youtube video id == 11 */
						// browser.tabs.reload(tabs[i].id);
					// }
				// }
			// });
			
			// browser.tabs.create({url: 'https://videosegments.org/install.html'});
		}
		
		// if ( result.messages.segmentation === false ) {
			// browser.storage.local.set({
				// messages: {
					// segmentation: true,
				// }
			// }, function() {
				// browser.tabs.create({url: 'http://www.videosegments.org/segmentation.php'});
			// });
		// }
		
		totalTime = result.totalTime;
		// log('totalTime', totalTime);
	}
);

var previousRequestsCount = 0;
var checkContext = function() { 
	// log('checkContext');
	
	if ( doCheck ) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/api/v3/review.php?requests');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// log('xhr.responseText', xhr.responseText);
					
					var response = JSON.parse(xhr.responseText);
					if ( typeof response.requests !== 'undefined' ) {
						// moved to moderator tools 
						// var count = parseInt(response.requests);
						// if ( count > previousRequestsCount ) {
							// browser.notifications.create({
								// "type": "basic",
								// "iconUrl": browser.extension.getURL("icons/icon-64.png"),
								// "title": 'VideoSegments',
								// "message": browser.i18n.getMessage('newSegmentationRequest')
							// });
						// }
						// previousRequestsCount = count;
						
						browser.browserAction.setBadgeText( { text: response.requests } );
					}
					else {
						browser.browserAction.setBadgeText({text: ''});
					}
				}
			}
		}
		
		var post = '';
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send(post);
	}
	else {
		browser.browserAction.setBadgeText({text: ''});
		clearInterval(timer);
	}
}

browser.runtime.onMessage.addListener(function(message) {
	if ( typeof message.updateSettings !== 'undefined' ) {
		log(message.updateSettings);
		notifyMediaPlayerWrapper(message.updateSettings);
	}
	else if ( typeof message.displayPending !== 'undefined' ) {
		if ( message.displayPending ) {
			doCheck = true;
			checkContext();
			timer = setInterval(checkContext, 60000);
		}
		else {
			doCheck = false;
			browser.browserAction.setBadgeText({text: ''});
			clearInterval(timer);
		}
	}
	else if ( typeof message.updateBadge !== 'undefined' ) {
		checkContext();
	}
	else if ( typeof message.updateTotalTime !== 'undefined' ) {
		// log(message.updateTotalTime, totalTime, parseFloat(message.updateTotalTime));
		totalTime += parseFloat(message.updateTotalTime);
		// log(totalTime);
		browser.storage.local.set({ totalTime: totalTime });
	}
});

function notifyMediaPlayerWrapper(settings)
{
	browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, { settings: settings });
		}
	});
}
