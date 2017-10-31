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
 
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

var timer;
var doCheck = false;
var totalTime = undefined;

browser.storage.local.get({ 
		settings: false,
		messages: {
			segmentation: false,
		},
		totalTime: 0,
	}, function(result) {
		// console.log(result);
		
		if ( result.settings ) {
			doCheck = result.settings.displayPending;
			
			checkContext();
			timer = setInterval(checkContext, 60000);
		}
		
		if ( result.messages.segmentation === false ) {
			browser.storage.local.set({
				messages: {
					segmentation: true,
				}
			}, function() {
				browser.tabs.create({url: 'http://www.videosegments.org/segmentation.php'});
			});
		}
		
		totalTime = result.totalTime;
		// console.log('totalTime', totalTime);
	}
);

var checkContext = function() { 
	// console.log('checkContext');
	
	if ( doCheck ) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/requests.php');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log('xhr.responseText', xhr.responseText);
					
					var response = JSON.parse(xhr.responseText);
					if ( typeof response.requests !== 'undefined' && typeof response.pending !== 'undefined' ) {
						var count = parseInt(response.requests) + parseInt(response.pending);
						browser.browserAction.setBadgeText( { text: count.toString() } );
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
	if ( typeof message.displayPending !== 'undefined' ) {
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
		// console.log(message.updateTotalTime, totalTime, parseFloat(message.updateTotalTime));
		totalTime += parseFloat(message.updateTotalTime);
		// console.log(totalTime);
		browser.storage.local.set({ totalTime: totalTime });
	}
});
