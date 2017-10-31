'use strict';

// crossbrowser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

document.addEventListener('DOMContentLoaded', domContentLoaded);

function domContentLoaded()
{
	var tabs = document.getElementById('tabs');
	// hook clicks on tab
	var buttons = tabs.getElementsByTagName('button');
	for ( let i = 0; i < buttons.length; ++i ) {
		buttons[i].addEventListener('click', switchTab);
	}
	
	// check if user is logged in 
	checkLogin();
	
	// load settings 
	loadSettings();
	
	// disable temporary acceleration settings for chrome and opera 
	// did not found better way to do it 
	if ( browser.runtime.getBrowserInfo == undefined ) {
		var tab = document.getElementById('tab-acceleration');
		tab.disabled = true;
		
		var span = tab.getElementsByTagName('span')[0];
		span.innerHTML = 'tabDisabled';
	}
	
	var button;
	button = document.getElementById('next-segmentation');
	button.addEventListener('click', openNextSegmentationRequest);
	button = document.getElementById('next-request');
	button.addEventListener('click', openNextRequest);
	
	button = document.getElementById('logout');
	button.addEventListener('click', function() {
		window.open('https://db.videosegments.org/logout.php'); 
		setTimeout(function() {window.close();}, 100);
	});
}

function switchTab()
{
	// remove old active tab class 
	var tab = document.getElementsByClassName('active-tab')[0];
	tab.classList.remove('active-tab');
	
	// change active tab class 
	this.classList.add('active-tab');
	
	// open tab content  
	openTab(this.id.slice(4));
}

function openTab(tabName)
{
	// close all tabs 
	var tabs = document.getElementsByClassName('tab-content');
	for ( let i = 0; i < tabs.length; ++i ) {
		tabs[i].style.display = 'none';
	}
	
	// show desired
	var tab = document.getElementById(tabName);
	tab.style.display = 'block';
}

function checkLogin()
{
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://db.videosegments.org/status.php');
	xhr.onreadystatechange = function() { 
		// console.log(xhr);
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// console.log(xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				if ( response.auth ) {
					// var element = document.getElementById('settings-database');
					// element.style.display = 'block';
					var element = document.getElementById('settings-logout');
					element.style.display = 'block';
					
					if ( response.admin ) {
						var element = document.getElementById('settings-database-admin');
						element.style.display = 'block';
						updateRequestsCount();
					}
				}
				else {
					var element = document.getElementById('settings-login');
					element.style.display = 'block';
				}
			}
		}
	}
	
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send();
}

function updateRequestsCount()
{
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/requests.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// console.log('xhr.responseText', xhr.responseText);
				
				var response = JSON.parse(xhr.responseText);
				if ( response.requests != 'undefined' && response.pending != 'undefined' ) {
					var span;
					
					span = document.getElementById('segmentations-count');
					span.removeChild(span.firstChild);
					span.appendChild(document.createTextNode(response.pending));
					
					span = document.getElementById('requests-count');
					span.removeChild(span.firstChild);
					span.appendChild(document.createTextNode(response.requests));
				}
			}
		}
	}
	
	var post = '';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function openNextSegmentationRequest()
{
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/requests.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// console.log('xhr.responseText', xhr.responseText);
				
				var response = JSON.parse(xhr.responseText);
				if ( response.id ) {
					var pending = {
						timestamps: response.timestamps,
						types: response.types
					};
					
					browser.storage.local.set({ pending: pending }, function() {
						browser.tabs.query({currentWindow: true, active: true}, function (tab) {
							browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(response.id)} );
						});
					});
				}
			}
		}
	}
	
	var post = 'get_pending=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function openNextRequest()
{
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/requests.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				var response = JSON.parse(xhr.responseText);
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
	
	var post = 'get_request=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function loadSettings()
{
	// default extension settings 
	var defaultSettings = {
		// segments configuration
		segments: {
			// content 
			c: 	{ skip: false, color: '#00ff00', duration: 0.0, speed: 1.0 },
			// adcontent 
			ac: { skip: false, color: '#008800', duration: 0.0, speed: 1.0 },
			// advertisement 
			a: 	{ skip: true,  color: '#ff0000', duration: 0.0, speed: 5.0 },
			// intro 
			i: 	{ skip: true,  color: '#0000ff', duration: 0.0, speed: 5.0 },
			// credits 
			cr: { skip: true,  color: '#ffff00', duration: 0.0, speed: 5.0 },
			// cutscene 
			cs: { skip: true,  color: '#808080', duration: 0.0, speed: 2.0 },
			// offtop 
			o: 	{ skip: true,  color: '#ff00ff', duration: 0.0, speed: 3.0 },
			// interactive 
			ia: { skip: true,  color: '#00ffff', duration: 0.0, speed: 4.0 },
			// scam 
			s:	{ skip: true,  color: '#008080', duration: 0.0, speed: 5.0 },
		},
		
		// global settings 
		autoPauseDuration: 1,
		showSegmentsbar: true,
		showSegmentationTools: true,
		databasePriority: 'local',
		
		// segmentation settings 
		// sendToDatabase: false,
		displayPending: false,
	}
	
	browser.storage.local.get({
			settings: defaultSettings,
			totalTime: 0,
		}, function(result) {
			console.log(result);
			
			restoreOptions(result.settings);
			
			var seconds = Number(result.totalTime);
			var element = document.getElementById('saved-time');
			
			var h = Math.floor(seconds / 3600);
			var m = Math.floor(seconds % 3600 / 60);
			var s = Math.floor(seconds % 3600 % 60);

			var totalTimeSaved = (h<10?('0'+h):h) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
			element.textContent = totalTimeSaved;
		}
	);
}
	
function restoreOptions(settings) 
{
	// playback settings 
	var playback = document.getElementById('playback-settings');
	var tr = playback.getElementsByTagName('tr');
	for ( let i = 0; i < tr.length; ++i ) {
		let segment = tr[i].id.slice(8);
		
		var select = tr[i].getElementsByTagName('select')[0];
		select.value = settings.segments[segment].skip ? '1' : '0';
		select.addEventListener('change', function() { updatePlayback(this, settings, segment); });
		
		var input = tr[i].getElementsByTagName('input')[0];
		input.jscolor.fromString(settings.segments[segment].color);
		input.addEventListener('change', function() { updateColor(this, settings, segment); });
	}
	
	// acceleration settings 
	var acceleration = document.getElementById('acceleration-settings');
	var tr = acceleration.getElementsByTagName('tr');
	for ( let i = 1; i < tr.length; ++i ) {
		let segment = tr[i].id.slice(8);
		
		var inputs = tr[i].getElementsByTagName('input');
		inputs[0].value = settings.segments[segment].duration;
		inputs[1].value = settings.segments[segment].speed*100;
		
		inputs[0].addEventListener('change', function() { updateAccelerationDuration(this, settings, segment); });
		inputs[1].addEventListener('change', function() { updateAccelerationSpeed(this, settings, segment); });
	}
	
	// global settings 
	var element;
	
	element = document.getElementById('autoPauseDuration');
	element.value = settings.autoPauseDuration;
	element.addEventListener('change', function() { updateGlobalValue(this, settings, 'autoPauseDuration'); });
	
	element = document.getElementById('showSegmentsbar');
	element.checked = settings.showSegmentsbar;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showSegmentsbar'); });
	
	element = document.getElementById('showSegmentationTools');
	element.checked = settings.showSegmentationTools;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showSegmentationTools'); });
	
	// element = document.getElementById('sendToDatabase')
	// element.checked = settings.sendToDatabase;
	// element.addEventListener('change', function() { updateGlobalBool(this, settings, 'sendToDatabase'); });
	
	element = document.getElementById('displayPending');
	element.checked = settings.displayPending;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'displayPending'); browser.runtime.sendMessage( {'displayPending': this.checked }); });
	
	element = document.getElementById('databasePriority');
	element.value = settings.databasePriority;
	element.addEventListener('change', function() { updateGlobalSelect(this, settings, 'databasePriority'); });
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