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

// crossbrowser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

// rate url 
// https://stackoverflow.com/a/9851769
let isFirefox = typeof InstallTrigger !== 'undefined';
let isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

let settings;
document.addEventListener('DOMContentLoaded', domContentLoaded);

function domContentLoaded()
{
	// hook clicks on tab
	let tabs = document.getElementsByClassName('tab');
	for ( let i = 0; i < tabs.length; ++i ) {
		tabs[i].addEventListener('click', switchTab);
	}
	
	let rateExtensionLink = document.getElementById('rate-extension');
	if ( isFirefox ) {
		rateExtensionLink.href = 'https://addons.mozilla.org/en-US/firefox/addon/videosegments/';
	}
	else if ( isOpera ) {
		rateExtensionLink.href = 'https://addons.opera.com/ru/extensions/details/videosegments/';
	}
	else {
		rateExtensionLink.href = 'https://chrome.google.com/webstore/detail/cut-youtube-videos-with-v/eddbomdegiekipngdepnddkoemagllbn';
	}
	
	// check if user is logged in 
	checkLogin();
	
	// load settings 
	loadSettings();
	
	let button;
	button = document.getElementById('next-segmentation');
	button.addEventListener('click', openNextSegmentationRequest);
	
	let iframe = document.getElementById('settings-iframe');
	setTimeout(function() { iframe.src = 'https://db.videosegments.org/api/v3/login.php' }, 0); // otherwise chrome will open page after iframe is loaded (+1-2 seconds to opening settings page)
	window.addEventListener('message', function(event) {
		// iframe.style.height = event.data+'px';
		checkLogin();
	});
	
	// new Tooltip(document.getElementById('tooltip-youtube-api-key'), {
		// placement: 'left', 
		// title: 'Time to get channel on video start is relatively long - from 1 to 5+ seconds. Video start to play way before metadata (such as comments, category, channel) is loaded. The only way to get metadata faster (lesser than 1 second) is to use YouTube API. YouTube API require key and every key have free day limit. Key will be saved at your PC and will be used on our server in real time only to process your queries (we will never save your key).'
	// });
	
	new Tooltip(document.getElementById('tooltip-silence-detection'), {
		placement: 'left', 
		title: 'Do not expect results immediately after video start! The results will be after and only after silence was fully played. The algorithm is based on analysis of current sound spectrum. This filter is applied only on playing videos. The algorithm may give you inaccurate results if you rewind into silence or if you play video on significantly increased playback rate (more than 150%). In other cases this filter must work fine. If not, please send me video id to videosegmentsdev@gmail.com with note "silence detection bug" and I will investigate it.'
	});
	
	new Tooltip(document.getElementById('tooltip-silence-threshold'), {
		placement: 'left', 
		title: 'Value from 0 to 10000. Zero mean absolute silence.'
	});
	
	new Tooltip(document.getElementById('tooltip-silence-duration'), {
		placement: 'left', 
		title: 'Minimal silence duration to be cut. VERY UNSTABLE on low values!'
	});
	
	button = document.getElementById('get-current-channel');
	button.addEventListener('click', function() {
		browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			browser.tabs.sendMessage(tabs[0].id, { getChannel: true });
		});
	});
	
	button = document.getElementById('save-channel-settings');
	button.addEventListener('click', function() {
		let channelName = document.getElementById('channel-name').value;
		if ( channelName.length < 1 ) {
			return;
		}
		
		let startFrom = parseFloat(document.getElementById('channel-from').value);
		let jumpTo = parseFloat(document.getElementById('channel-to').value);
		let endOn = parseFloat(document.getElementById('channel-end').value);
		browser.storage.local.set({['|c|'+document.getElementById('channel-name').value]: [startFrom, jumpTo, endOn]});
		
		if ( document.getElementById('enableChannelBasedFilter').checked === false ) {
			document.getElementById('enableChannelBasedFilter').checked = true;
			settings.filters.channelBased.enabled = true; 
			browser.storage.local.set({ settings: settings }); 
			notifyMediaPlayerWrapper(settings);
		}
	});
	
	let input = document.getElementById('channel-name');
	input.addEventListener('keyup', function() {
		let channelName = input.value;
		browser.storage.local.get({['|c|'+channelName]: []}, function(result) {
			let filter = result['|c|'+channelName];
			if ( filter && filter.length > 0 ) {
				document.getElementById('channel-from').value = filter[0];
				document.getElementById('channel-to').value = filter[1];
				document.getElementById('channel-end').value = filter[2];
			}
			else {
				document.getElementById('channel-from').value = '0.0';
				document.getElementById('channel-to').value = '0.0';
				document.getElementById('channel-end').value = '0.0';
			}
		});
	});
	
	button = document.getElementById('reset-panel');
	button.addEventListener('click', function() {
		settings.showSegmentationTools = true;
		settings.segmentationToolsOpacity = 100;
		settings.segmentationToolsFullscreenOpacity = 100;
		settings.editor.posX = 100;
		settings.editor.posY = 200;
		settings.minimized = false;
		browser.storage.local.set({ settings: settings }); 
		notifyMediaPlayerWrapper(settings);
	});
}

browser.runtime.onMessage.addListener(function(message) {
	if ( typeof message.gotChannel !== 'undefined' ) {
		document.getElementById('channel-name').value = message.gotChannel;
		browser.storage.local.get({['|c|'+document.getElementById('channel-name').value]: []}, function(result) {
			let filter = result['|c|'+document.getElementById('channel-name').value];
			if ( filter.length > 0 ) {
				document.getElementById('channel-from').value = filter[0];
				document.getElementById('channel-to').value = filter[1];
				document.getElementById('channel-end').value = filter[2];
			}
		});
	}
});

function switchTab()
{
	// remove old active tab class 
	let tab = document.getElementsByClassName('active-tab')[0];
	tab.classList.remove('active-tab');
	
	// change active tab class 
	this.classList.add('active-tab');
	
	// open tab content  
	openTab(this.id.slice(4));
	
	settings.lastTab = this.id;
	browser.storage.local.set({ settings: settings });
}

function openTab(tabName)
{
	// close all tabs 
	let tabs = document.getElementsByClassName('tab-content');
	for ( let i = 0; i < tabs.length; ++i ) {
		tabs[i].style.display = 'none';
	}
	
	// show desired
	let tab = document.getElementById(tabName);
	tab.style.display = 'block';
}

function checkLogin()
{
	let xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://db.videosegments.org/api/v3/status.php');
	xhr.onreadystatechange = function() { 
		// log(xhr);
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// log(xhr.responseText);
				let response = JSON.parse(xhr.responseText);
				if ( response.authorized && response.moderator ) {
					let element = document.getElementById('settings-database-admin');
					browser.runtime.sendMessage( {'displayPending': true });
					element.style.display = 'block';
					updateRequestsCount();
				}
				else {
					let element = document.getElementById('settings-database-admin');
					browser.runtime.sendMessage( {'displayPending': false });
					element.style.display = 'none';
				}
			}
		}
	}
	
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send();
}

function updateRequestsCount()
{
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/api/v3/review.php?requests');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// log('xhr.responseText', xhr.responseText);
				
				var response = JSON.parse(xhr.responseText);
				if ( response.requests != 'undefined' ) {
					var span;
					
					span = document.getElementById('segmentations-count');
					span.removeChild(span.firstChild);
					span.appendChild(document.createTextNode(response.requests));
				}
			}
		}
	}
	
	let post = '';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function openNextSegmentationRequest()
{
	// let xhr = new XMLHttpRequest();
	// xhr.open('POST', 'https://db.videosegments.org/api/v3/review.php?pending');
	// xhr.onreadystatechange = function() { 
		// if ( xhr.readyState == 4 ) {
			// if ( xhr.status == 200 ) {
				// log('xhr.responseText', xhr.responseText);
				
				// let response = JSON.parse(xhr.responseText);
				// if ( response.id ) {
					// let pending = {
						// timestamps: response.timestamps,
						// types: response.types
					// };
					
					// browser.storage.local.set({ pending: pending }, function() {
						// browser.tabs.query({currentWindow: true, active: true}, function (tab) {
							// browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(response.id)} );
						// });
					// });
				// }
			// }
		// }
	// }
	
	// let post = 'get_pending=1';
	// xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	// xhr.send(post);
	
	window.open('https://db.videosegments.org/queue.php', '_blank');
}

function openNextRequest()
{
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/requests.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				let response = JSON.parse(xhr.responseText);
				if ( response.id ) {
					browser.storage.local.set({ request: '1' }, function() {
						browser.tabs.query({currentWindow: true, active: true}, function (tab) {
							browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(response.id)} );
						});
					});
				}
			}
		}
	}
	
	let post = 'get_request=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function loadSettings()
{
	// default extension settings 
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
		showSegmentationTools: true,
		hideOnSegmentedVideos: false,
		pinSegmentationTools: false,
		hideIcon: false,
		maximizePanelOnHover: false,
		showPageOnReject: true,
		popupDurationOnSend: 5.0,
		databasePriority: 'local',
		segmentationToolsOpacity: 60,
		iconOpacity: 100,
		segmentsBarLocation: 'separated',
		showEditorInFullscreen: false,
		
		// segmentation settings 
		// sendToDatabase: false,
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
			posX: 200,
			posY: 200,
		},
		
		lastVersionChanges: '1.9.2', 
	}
	
	browser.storage.local.get({
			settings: defaultSettings,
			totalTime: 0,
		}, function(result) {
			settings = Object.assign({}, defaultSettings, result.settings);
			console.log(settings);
			
			if ( settings.lastVersionChanges !== '1.8.8' ) {
				if ( settings.mode === 'simplified' ) {
					settings.showSegmentationTools = true;
				}
				settings.lastVersionChanges = '1.8.8';
				browser.storage.local.set({ settings: settings });
			}
			
			restoreOptions();
			
			let seconds = Number(result.totalTime);
			let element = document.getElementById('saved-time');
			
			let h = Math.floor(seconds / 3600);
			let m = Math.floor(seconds % 3600 / 60);
			let s = Math.floor(seconds % 3600 % 60);

			let totalTimeSaved = (h<10?('0'+h):h) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
			element.textContent = totalTimeSaved;
			
			result.settings.tutorial = 1;
			// result.settings.mode === 'simplified' to backward compatibility
			if ( result.settings.tutorial > 0 || result.settings.mode === 'normal' ) {
				setMode(result.settings.mode);
				document.getElementById(result.settings.lastTab).classList.add('active-tab');
				document.getElementById(result.settings.lastTab.slice(4)).style.display = 'block';
				document.getElementById('tutorial').style.display = 'none';
			}
			else {
				document.getElementById('ext-settings').style.display = 'none';
				document.getElementById('tutorial').style.display = 'block';
				
				document.getElementById('tutorial-finish').addEventListener('click', function() {
					result.settings.tutorial = 1;
					browser.storage.local.set({ settings: result.settings });
					setMode('simplified');
					
					document.getElementById('tab-filters').classList.add('active-tab');
					document.getElementById('ext-settings').style.display = 'block';
					document.getElementById('filters').style.display = 'block';
					document.getElementById('tutorial').style.display = 'none';
				});
			}
		}
	);
}
	
function restoreOptions() 
{
	let tr;
	
	// playback settings 
	let playback = document.getElementById('playback-settings');
	tr = playback.getElementsByTagName('tr');
	for ( let i = 0; i < tr.length; ++i ) {
		// cut "segment-" prefix
		let segment = tr[i].id.slice(8);
		
		let select = tr[i].getElementsByTagName('select')[0];
		select.value = settings.segments[segment].skip ? '1' : '0';
		select.addEventListener('change', function() { updatePlayback(this, settings, segment); });
		
		let input = tr[i].getElementsByTagName('input')[0];
		input.jscolor.fromString(settings.segments[segment].color);
		input.addEventListener('change', function() { updateColor(this, settings, segment); });
	}
	
	if ( typeof settings.segments.pl === 'undefined' ) {
		settings.segments.pl = { skip: false, color: '#00c853', duration: 0.0, speed: 1.0 };
		settings.segments.sk = { skip: true,  color: '#757575', duration: 0.0, speed: 5.0 };
		browser.storage.local.set({ settings: settings });
	}
	
	let segmentPlay = document.getElementById('segment-pl');
	segmentPlay.jscolor.fromString(settings.segments.pl.color);
	segmentPlay.addEventListener('change', function() { updateColor(this, settings, 'pl'); });
	
	let segmentSkip = document.getElementById('segment-sk');
	segmentSkip.jscolor.fromString(settings.segments.sk.color);
	segmentSkip.addEventListener('change', function() { updateColor(this, settings, 'sk'); });
	
	// acceleration settings 
	let acceleration = document.getElementById('acceleration-settings');
	tr = acceleration.getElementsByTagName('tr');
	for ( let i = 1; i < tr.length; ++i ) {
		let segment = tr[i].id.slice(8);
		
		let inputs = tr[i].getElementsByTagName('input');
		inputs[0].value = settings.segments[segment].duration;
		inputs[1].value = settings.segments[segment].speed*100;
		
		inputs[0].addEventListener('change', function() { updateAccelerationDuration(this, settings, segment); });
		inputs[1].addEventListener('change', function() { updateAccelerationSpeed(this, settings, segment); });
	}
	
	// global settings 
	let element;
	
	element = document.getElementById('autoPauseDuration');
	element.value = settings.autoPauseDuration;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'autoPauseDuration'); });
	
	element = document.getElementById('popupDurationOnSend');
	element.value = settings.popupDurationOnSend;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'popupDurationOnSend'); });
	
	element = document.getElementById('segmentationToolsOpacity');
	element.value = settings.segmentationToolsOpacity;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'segmentationToolsOpacity'); });
	
	element = document.getElementById('segmentationToolsFullscreenOpacity');
	element.value = settings.segmentationToolsFullscreenOpacity;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'segmentationToolsFullscreenOpacity'); });
	
	element = document.getElementById('iconOpacity');
	element.value = settings.iconOpacity;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'iconOpacity'); });
	
	element = document.getElementById('maximizePanelOnHover');
	element.checked = settings.maximizePanelOnHover;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'maximizePanelOnHover'); });
	
	// element = document.getElementById('showPageOnReject');
	// element.checked = settings.showPageOnReject;
	// element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showPageOnReject'); });
	
	element = document.getElementById('showSegmentationTools');
	element.checked = settings.showSegmentationTools;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showSegmentationTools'); });
	
	element = document.getElementById('hideOnSegmentedVideos');
	element.checked = settings.hideOnSegmentedVideos;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'hideOnSegmentedVideos'); });
	
	element = document.getElementById('pinSegmentationTools');
	element.checked = settings.pinSegmentationTools;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'pinSegmentationTools'); });
	
	element = document.getElementById('showEditorInFullscreen');
	element.checked = settings.showEditorInFullscreen;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showEditorInFullscreen'); });
	
	element = document.getElementById('hideIcon');
	element.checked = settings.hideIcon;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'hideIcon'); });
	
	element = document.getElementById('databasePriority');
	element.value = settings.databasePriority;
	element.addEventListener('change', function() { updateGlobalSelect(this, settings, 'databasePriority'); });
	
	element = document.getElementById('segmentsBarLocation');
	element.value = settings.segmentsBarLocation;
	element.addEventListener('change', function() { updateGlobalSelect(this, settings, 'segmentsBarLocation'); });
	
	element = document.getElementById('mode');
	element.value = settings.mode;
	element.addEventListener('change', function() {
		updateGlobalValue(this, settings, 'mode');
		setMode(settings.mode);
	});
	
	element = document.getElementById('displayPending');
	element.checked = settings.displayPending;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'displayPending'); browser.runtime.sendMessage( {'displayPending': this.checked }); });
	
	element = document.getElementById('openSettings');
	element.checked = settings.openSettings;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'openSettings'); });
	
	element = document.getElementById('enableChannelBasedFilter');
	element.checked = settings.filters.channelBased.enabled;
	element.addEventListener('change', function() { settings.filters.channelBased.enabled = this.checked; browser.storage.local.set({ settings: settings }); notifyMediaPlayerWrapper(settings); });
	
	element = document.getElementById('enableSilenceDetection');
	element.checked = settings.filters.silence.enabled;
	element.addEventListener('change', function() { settings.filters.silence.enabled = this.checked; browser.storage.local.set({ settings: settings }); notifyMediaPlayerWrapper(settings); });
	
	element = document.getElementById('silenceThreshold');
	element.value = settings.filters.silence.threshold;
	element.addEventListener('change', function() { settings.filters.silence.threshold = this.value; browser.storage.local.set({ settings: settings }); notifyMediaPlayerWrapper(settings); });
	
	element = document.getElementById('silenceDuration');
	element.value = settings.filters.silence.duration;
	element.addEventListener('change', function() { settings.filters.silence.duration = this.value; browser.storage.local.set({ settings: settings }); notifyMediaPlayerWrapper(settings); });

	// element = document.getElementById('youtube-api-key');
	// element.value = settings.filters.apiKey;
}

function switchMode(settings)
{
	if ( settings.mode === 'simplified' ) {
		// document.getElementById('tab-colors').style.display = 'inline-block';
		// document.getElementById('tab-colors').style.display = 'none';
		// document.getElementById('tab-playback').style.display = 'none';
		// document.getElementById('tab-acceleration').style.display = 'none';
		// document.getElementById('tab-filters').style.display = 'none';
		setMode('normal');
	}
	else {
		// document.getElementById('tab-colors').style.display = 'none';
		// document.getElementById('tab-playback').style.display = 'inline-block';
		// document.getElementById('tab-acceleration').style.display = 'inline-block';
		// document.getElementById('tab-filters').style.display = 'inline-block';
		setMode('simplified');
	}
}

function setMode(mode)
{
	if ( mode === 'simplified' ) {
		let elements = document.getElementsByClassName('expert-mode-only');
		for ( let element of elements ) {
			element.style.display = 'none';
		}
		
		elements = document.getElementsByClassName('simple-mode-only');
		for ( let element of elements ) {
			element.style.display = 'inline-block';
		}
	}
	else {
		let elements = document.getElementsByClassName('expert-mode-only');
		for ( let element of elements ) {
			element.style.display = 'inline-block';
		}
		
		elements = document.getElementsByClassName('simple-mode-only');
		for ( let element of elements ) {
			element.style.display = 'none';
		}
	}
	
	let obsolete = document.getElementsByClassName('obsolete');
	for ( let element of obsolete ) {
		element.style.display = 'none';
	}
}

function updatePlayback(element, settings, segment)
{
	settings.segments[segment].skip = element.value == '1' ? true : false;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateColor(element, settings, segment)
{
	settings.segments[segment].color = element.jscolor.toHEXString();
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateAccelerationDuration(element, settings, segment)
{
	settings.segments[segment].duration = element.value;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateAccelerationSpeed(element, settings, segment)
{
	settings.segments[segment].speed = element.value / 100.0; 
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalValue(element, settings, field)
{
	settings[field] = element.value;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalBool(element, settings, field)
{
	settings[field] = element.checked;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalSelect(element, settings, field)
{
	settings[field] = element.value;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function notifyMediaPlayerWrapper(settings)
{
	browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, { settings: settings });
		}
	});
}