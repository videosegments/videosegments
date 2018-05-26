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

var CompactEditor = {
	panel: null,
	icon: null,
	modal: null,
	
	wrapper: null,
	settings: null,
	fullscreen: false,
	
	timestampsSecondary: null, 
	timestamps: null,
	typesSecondary: null, 
	types: null,
	origin: null,
	iterations: null,
	savedIterations: null,
	
	domain: null,
	id: null,
	
	start: function(wrapper, timestamps, types, origin, settings, domain, id, timestampsSecondary, typesSecondary) {
		log('CompactEditor::start()');
		this.injectStylesheet();
		let self = this;
		
		this.wrapper = wrapper;
		
		this.timestampsSecondary = timestampsSecondary;
		this.typesSecondary = typesSecondary;
		this.timestamps = timestamps;
		this.types = types;
		this.origin = origin;
		this.settings = settings;
		this.domain = domain;
		this.id = id;
		this.savedIterations = -1;
		
		if ( this.settings.showSegmentationTools === false ) {
			return;
		}
		
		this.panel = document.createElement('div');
		this.panel.id = 'vs-compact-editor';
		
		let header = document.createElement('div');
		header.id = 'vs-compact-editor-header';
		this.panel.appendChild(header);
		
		let leftActions = document.createElement('div');
		leftActions.style.display = 'inline';
		leftActions.appendChild(this.createMoveButton(this.panel));
		leftActions.appendChild(this.createPinFullscreenButton(this.panel));
		header.appendChild(leftActions);
		
		header.appendChild(this.createOpacityChanger(this.panel));
		
		let rightActions = document.createElement('div');
		rightActions.style.display = 'inline';
		rightActions.appendChild(this.createMinimizeButton(this.panel));
		rightActions.appendChild(this.createCloseButton(this.panel));
		header.appendChild(rightActions);
		
		let buttons = document.createElement('div');
		buttons.id = 'vs-compact-editor-buttons';
		this.panel.appendChild(buttons);
		
		let buttonEndCut = this.createButton('endCut', 'toCurrentTime', 'pl');
		buttonEndCut.addEventListener('click', function() {
			self.addSegmentBefore(self.wrapper.video.currentTime, 'sk');
			self.addSegmentAfter(self.wrapper.video.currentTime, 'pl');
			
			self.updateSegmentation(self.wrapper.video.currentTime, false, true);
			document.getElementById('vs-compact-editor-sharing').style.display = 'flex';
		});
		buttons.appendChild(buttonEndCut);
		
		let buttonStartCut = this.createButton('startCut', 'fromCurrentTime', 'sk');
		buttonStartCut.addEventListener('click', function() {
			self.addSegmentBefore(self.wrapper.video.currentTime, 'pl');
			self.addSegmentAfter(self.wrapper.video.currentTime, 'sk');
			
			self.updateSegmentation(self.wrapper.video.currentTime, true, true);
			document.getElementById('vs-compact-editor-sharing').style.display = 'flex';
		});
		buttons.appendChild(buttonStartCut);
		
		let entries = document.createElement('div');
		entries.id = 'vs-compact-editor-entries';
		if ( this.types.length > 0 ) {
			for ( let i = 0; i < this.types.length; ++i ) {
				entries.appendChild(this.createSegmentEntry(i));
			}
			
			buttons.style.borderBottom = '2px solid rgb(221, 221, 221)';
			entries.style.borderBottom = '2px solid rgb(221, 221, 221)';
			entries.style.padding = '4px';
		}
		else {
			buttons.style.borderBottom = '0';
			entries.style.borderBottom = '0';
			entries.style.padding = '0';
		}
		this.panel.appendChild(entries);
		
		buttons = document.createElement('div');
		buttons.id = 'vs-compact-editor-sharing';
		this.panel.appendChild(buttons);
		
		buttons.appendChild(this.createOriginText());
		if ( this.origin !== 'officialDatabase' ) {
			buttons.appendChild(this.createSendButton());
		}
		
		// https://www.youtube.com/tv#/watch/video/control?v=HqREW1syEIU

		// show youtube controls on hover  
		let mouseMoveEvent = document.createEvent("Events");
		mouseMoveEvent.initEvent("mousemove", false, false);
		// it is different element from "video" tag
		let player = document.getElementsByClassName('html5-video-player')[0];
		
		let moveTimer = null;
		// show youtube controls while mouse hover over panel 
		let mouseEnterFn = function() {
			player.dispatchEvent(mouseMoveEvent);
			moveTimer = setInterval(function() { player.dispatchEvent(mouseMoveEvent); }, 1000);
			
			if ( self.settings.minimized && self.settings.maximizePanelOnHover ) {
				self.panel.style.left = self.settings.editor.posX + 'px';
				self.panel.style.width = '275px';
				document.getElementById('vs-compact-editor-buttons').style.display = 'flex';
				document.getElementById('vs-compact-editor-sharing').style.display = 'flex';
				document.getElementById('vs-compact-editor-opacity').style.display = 'block';
				document.getElementById('vs-compact-editor-entries').style.display = 'block';
			}
		}
		
		// hide youtube controls when mouse leave panel  
		let mouseLeaveFn = function() {
			// todo: instant hide 
			clearInterval(moveTimer);
			
			if ( self.settings.minimized && self.settings.maximizePanelOnHover ) {
				self.panel.style.left = (self.settings.editor.posX + 225) + 'px';
				self.panel.style.width = '50px';
				document.getElementById('vs-compact-editor-buttons').style.display = 'none';
				document.getElementById('vs-compact-editor-sharing').style.display = 'none';
				document.getElementById('vs-compact-editor-opacity').style.display = 'none';
				document.getElementById('vs-compact-editor-entries').style.display = 'none';
			}
		}

		this.panel.addEventListener('mouseenter', mouseEnterFn);
		this.panel.addEventListener('mouseleave', mouseLeaveFn);
		// block click event if clicked when panel is hovering over youtube video 
		this.panel.addEventListener('click', function(event) {event.stopPropagation()}); 
		
		// allow panel to work in fullscreen 
		function handleFullscreen(element) {
			if ( element !== null ) {
				self.fullscreen = true;
				
				if ( self.settings.showEditorInFullscreen ) {
					document.getElementsByClassName('html5-video-player')[0].appendChild(self.panel);
					
					setTimeout(function() {
						if ( window.innerWidth < self.settings.editor.fullscreenPosX + self.panel.clientWidth ) {
							self.panel.style.left = (window.innerWidth - (self.panel.clientWidth + 10)) + 'px';
						}
						else {
							self.panel.style.left = self.settings.editor.fullscreenPosX + 'px';
						}
						self.panel.style.top = self.settings.editor.fullscreenPosY + 'px';
						
						document.getElementById('vs-compact-editor-opacity-range').value = (self.settings.segmentationToolsFullscreenOpacity / 100.0).toFixed(2);
					}, 100);
				
					self.panel.style.opacity = self.settings.segmentationToolsFullscreenOpacity / 100.0;
				}
			}
			else {
				document.body.appendChild(self.panel);
				self.fullscreen = false;
				
				if ( window.innerWidth < self.settings.editor.posX + self.panel.clientWidth ) {
					self.panel.style.left = (window.innerWidth - (self.panel.clientWidth + 10)) + 'px';
				}
				else {
					self.panel.style.left = self.settings.editor.posX + 'px';
				}
				self.panel.style.top = self.settings.editor.posY + 'px';
				
				self.panel.style.opacity = self.settings.segmentationToolsOpacity / 100.0;
				document.getElementById('vs-compact-editor-opacity-range').value = (self.settings.segmentationToolsOpacity / 100.0).toFixed(2);
			}
		}
		
		document.addEventListener('webkitfullscreenchange', function() { handleFullscreen(document.webkitFullscreenElement); });
		document.addEventListener('fullscreenchange', function() { handleFullscreen(document.fullscreenElement); });
		document.addEventListener('mozFullScreen', function() { handleFullscreen(document.mozFullscreenElement); });
		
		// fullscreen 
		handleFullscreen(document.webkitFullscreenElement || document.mozFullScreenElement || document.fullscreenElement || null);
		
		if ( origin === 'noSegmentation' ) {
			document.getElementById('vs-compact-editor-sharing').style.display = 'none';
		}
		else {
			document.getElementById('vs-compact-editor-sharing').style.display = 'flex';
		}
		
		this.minimize(document.getElementById('vs-compact-editor-header-minimize'), false);
		
		window.addEventListener('resize', function() {
			if ( window.innerWidth < self.settings.editor.posX + self.panel.clientWidth ) {
				self.panel.style.left = (window.innerWidth - (self.panel.clientWidth + 20)) + 'px';
			}
			else {
				self.panel.style.left = self.settings.editor.posX + 'px';
			}
		});
		
		// this.settings.tutorial = 0;
		if ( this.settings.tutorial === 0 ) {
			let tutorial = new Object(Tutorial);
			tutorial.start(settings);
		}
	},
	
	// https://stackoverflow.com/a/9345038
	injectStylesheet: function()
	{
		let link = document.createElement('link');
		link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
		link.type = 'text/css';
		link.rel = 'stylesheet';
		document.getElementsByTagName('head')[0].appendChild(link);
	},
	
	createMoveButton: function(owner) {
		let self = this;

		let move = document.createElement('i');
		move.id = 'vs-compact-editor-header-move';
		move.classList.add('fa');
		move.classList.add('fa-arrows');
		// move.style.color = '#4B71E6';
		
		let x = 0, y = 0, offsetX = 0, offsetY = 0;
		move.addEventListener('mousedown', startDrag); 
		
		function startDrag(e) {
			offsetX = e.clientX;
			offsetY = e.clientY;
			document.addEventListener('mousemove', drag);
			document.addEventListener('mouseup', endDrag);
		}
		
		function drag(e) {
			x = offsetX - e.clientX;
			y = offsetY - e.clientY;
			offsetX = e.clientX;
			offsetY = e.clientY;
			
			owner.style.left = owner.offsetLeft - x + 'px';
			owner.style.top = owner.offsetTop - y + 'px';
			
			if ( window.innerWidth < parseInt(owner.style.left.slice(0, -2)) + owner.clientWidth ) {
				owner.style.left = (window.innerWidth - (owner.clientWidth + 10)) + 'px';
			}
			
			// remove selection 
			window.getSelection().removeAllRanges();
			
			// owner.style.left = e.clientX/window.innerWidth*100 + '%';
			// owner.style.top = (e.clientY-8)/window.innerHeight*100 + '%';
		}
		
		function endDrag() {
			document.removeEventListener('mousemove', drag);
			document.removeEventListener('mouseup', endDrag);

			if ( self.fullscreen ) {
				self.settings.editor.fullscreenPosX = parseInt(owner.style.left.slice(0, -2));
				if ( self.settings.minimized && !self.settings.maximizePanelOnHover ) self.settings.editor.fullscreenPosX -= 225;
				self.settings.editor.fullscreenPosY = parseInt(owner.style.top.slice(0, -2));
			}
			else {
				self.settings.editor.posX = parseInt(owner.style.left.slice(0, -2));
				if ( self.settings.minimized && !self.settings.maximizePanelOnHover ) self.settings.editor.posX -= 225;
				self.settings.editor.posY = parseInt(owner.style.top.slice(0, -2));
			}

			browser.storage.local.set({ settings: self.settings });
		}
		
		return move;
	},
	
	// createInfoButton: function(owner) {
	// 	let self = this;
    // 
	// 	let info = document.createElement('i');
	// 	info.id = 'vs-compact-editor-header-info';
	// 	info.innerHTML = '?';
	// 	
	// 	info.addEventListener('click', function() {
	// 		let tutorial = new Object(Tutorial);
	// 		tutorial.start(self.settings);
	// 	});
	// 	
	// 	return info;
	// },
	
	createPinFullscreenButton: function(owner) {
		let self = this;
    
		let pin = document.createElement('i');
		pin.id = 'vs-compact-editor-header-pin-fullscreen';
		pin.classList.add('fa');
		if ( self.settings.showEditorInFullscreen ) pin.classList.add('fa-unlock');
		else pin.classList.add('fa-lock')
		
		pin.addEventListener('click', function() {
			self.settings.showEditorInFullscreen = !self.settings.showEditorInFullscreen;
			browser.storage.local.set({ settings: self.settings });
			
			if ( self.settings.showEditorInFullscreen ) {
					pin.classList.remove('fa-lock');
					pin.classList.add('fa-unlock');
			}
			else { 
				pin.classList.remove('fa-unlock');
				pin.classList.add('fa-lock');
			}
		});
		
		return pin;
	},
	
	createOpacityChanger: function(owner) {
		let self = this;
		
		let container = document.createElement('div');
		container.id = 'vs-compact-editor-opacity';
		
		let span = document.createElement('span');
		span.appendChild(document.createTextNode(browser.i18n.getMessage('opacity')));
		container.appendChild(span);

		let input = document.createElement('input');
		input.id = 'vs-compact-editor-opacity-range';
		input.type = 'range';
		
		input.setAttribute('step', '0.01');
		input.setAttribute('min', '0');
		input.setAttribute('max', '1');
		input.style.width = '100px';

		input.value = this.settings.segmentationToolsOpacity / 100.0;
		owner.classList.add('vs-compact-editor-hovering');

		input.addEventListener('change', function() {
			owner.style.opacity = this.value;
			owner.classList.add('vs-compact-editor-hovering');

			if ( self.fullscreen ) {
				self.settings.segmentationToolsFullscreenOpacity = this.value * 100.0;
			}
			else {
				self.settings.segmentationToolsOpacity = this.value * 100.0;
			}
			
			browser.storage.local.set({ settings: self.settings });
		});
		
		input.addEventListener('input', function() {
			owner.style.opacity = this.value;
			if ( owner.classList.contains('vs-compact-editor-hovering') ) {
				owner.classList.remove('vs-compact-editor-hovering');
			}
		});
		
		container.appendChild(input);
		
		return container;
	},
	
	// idk why to minimize. maybe later 
	createMinimizeButton: function(owner) {
		let self = this;
		
		let minimize = document.createElement('i');
		minimize.id = 'vs-compact-editor-header-minimize';
		minimize.classList.add('fa');
		
		if ( this.settings.minimized ) {
			minimize.classList.add('fa-window-minimize');
		}
		else {
			minimize.classList.add('fa-window-maximize');
		}
		
		minimize.addEventListener('click', function() { 
			self.settings.minimized = !self.settings.minimized;
			self.minimize(this); 
			
			browser.storage.local.set({ settings: self.settings });
			
		}); 
		return minimize;
	},
	
	createCloseButton: function(owner) {
		let self = this;
		
		let closeb = document.createElement('i');
		closeb.id = 'vs-compact-editor-header-close';
		closeb.classList.add('fa');
		closeb.classList.add('fa-times');
		// closeb.style.color = '#ED4337';
		
		closeb.addEventListener('click', function() {
			self.settings.showSegmentationTools = false;
			browser.storage.local.set({ settings: self.settings });
			self.panel.remove();
		});
		
		return closeb;
	},
	
	minimize: function(button) {
		if ( this.settings.minimized ) {
			this.panel.style.left = (this.settings.editor.posX + 225) + 'px';
			this.panel.style.width = '50px';
			document.getElementById('vs-compact-editor-buttons').style.display = 'none';
			document.getElementById('vs-compact-editor-sharing').style.display = 'none';
			document.getElementById('vs-compact-editor-opacity').style.display = 'none';
			document.getElementById('vs-compact-editor-entries').style.display = 'none';
			document.getElementById('vs-compact-editor-header-pin-fullscreen').style.display = 'none';
			document.getElementById('vs-compact-editor-header-close').style.display = 'none';
			button.classList.remove('fa-window-minimize');
			button.classList.add('fa-window-maximize');
		}
		else {
			this.panel.style.left = this.settings.editor.posX + 'px';
			this.panel.style.width = '275px';
			document.getElementById('vs-compact-editor-buttons').style.display = 'flex';
			if ( this.types.length > 0 ) document.getElementById('vs-compact-editor-sharing').style.display = 'flex';
			document.getElementById('vs-compact-editor-opacity').style.display = 'block';
			document.getElementById('vs-compact-editor-entries').style.display = 'block';
			document.getElementById('vs-compact-editor-header-pin-fullscreen').style.display = 'inline';
			document.getElementById('vs-compact-editor-header-close').style.display = 'inline';
			button.classList.remove('fa-window-maximize');
			button.classList.add('fa-window-minimize');
		}
	},
	
	createButton: function(name, subname, type) {
		let self = this;
		// let container = document.createElement('span');
		
		// let leftButton = document.createElement('button');
		// leftButton.id = 'vs-segment-left-' + type;
		// leftButton.classList.add('vs-compact-editor-left-button');
		// leftButton.appendChild(document.createTextNode(browser.i18n.getMessage(name)));
		// leftButton.style.backgroundColor = background;
		// leftButton.style.color = color;
		// leftButton.addEventListener('click', function() { self.addSegmentBefore(self.wrapper.video.currentTime, type) });
		
		// container.appendChild(leftButton);
		
		// let rightButton = document.createElement('button');
		// rightButton.id = 'vs-segment-right-' + type;
		// rightButton.classList.add('vs-compact-editor-right-button');
		// rightButton.classList.add('fa');
		// rightButton.classList.add('fa-angle-double-right');
		// rightButton.style.backgroundColor = background;
		// rightButton.style.color = color;
		// rightButton.addEventListener('click', function() { self.addSegmentAfter(self.wrapper.video.currentTime, type) });
		
		let button = document.createElement('button');
		button.id = 'vs-segment-' + type;
		button.classList.add('vs-segment-button');
		button.appendChild(document.createTextNode(browser.i18n.getMessage(name)));
		// button.appendChild(document.createElement('br'));
		// button.appendChild(document.createTextNode(browser.i18n.getMessage(subname)));
		// button.style.backgroundColor = background;
		// button.style.color = color;
		
		return button;
	},
	
	addSegmentBefore: function(timestamp, type) {
		let i = 0, currentTime = parseFloat(timestamp.toFixed(1));
		if ( this.timestamps.length === 0 ) {
			this.timestamps.push(0.0);
			this.timestamps.push(currentTime);
			this.types.push(type);
		}
		else {
			for ( i = 0; i < this.timestamps.length; ++i ) {
				if ( this.timestamps[i] > currentTime ) {
					this.timestamps.splice(i, 0, currentTime);
					this.types.splice(i-1, 0, type);
					break;
				}
			}
			
			if ( i === this.timestamps.length ) {
				this.timestamps.push(currentTime);
				this.types.push(type);
				i = i - 1;
			}
		}
	},
	
	addSegmentAfter: function(timestamp, type) {
		let i = 0, currentTime = parseFloat(timestamp.toFixed(1));
		if ( this.timestamps.length === 0 ) {
			this.timestamps.push(0.0);
			this.timestamps.push(parseFloat(this.wrapper.video.duration.toFixed(2)));
			this.types.push(type);
		}
		else {
			for ( i = 0; i < this.timestamps.length; ++i ) {
				if ( this.timestamps[i] > currentTime ) {
					this.timestamps.splice(i, 0, currentTime);
					this.types.splice(i, 0, type);
					break;
				}
			}
			
			if ( i === this.timestamps.length ) {
				this.timestamps.push(parseFloat(this.wrapper.video.duration.toFixed(2)));
				this.types.push(type);
				i = i - 1;
			}
		}
	},
	
	updateSegmentation: function(currentTime, left, saveLocally=true) {
		this.wrapper.updateSegmentsBar(false);
		if ( saveLocally === true ) {
			this.saveLocally();
		}
		
		let entries = document.getElementById('vs-compact-editor-entries');
		while ( entries.firstChild ) {
			entries.firstChild.remove();
		}
		
		let i;
		if ( typeof currentTime !== 'undefined' ) {
			let timestamp = parseFloat(currentTime.toFixed(1));
			i = this.timestamps.indexOf(timestamp)-1;
		}
		
		if ( i < 0 ) {
			i = 0;
		}
		
		log(i, left);
		if ( this.types.length > 0 ) {
			// log(this.timestamps, this.types);
			for ( let j = 0; j < this.types.length; ++j ) {
				entries.appendChild(this.createSegmentEntry(j, i === j));
			}
			
			document.getElementById('vs-compact-editor-buttons').style.borderBottom = '2px solid rgb(221, 221, 221)';
			entries.style.borderBottom = '2px solid rgb(221, 221, 221)';
			entries.style.padding = '4px';
		}
		else {
			document.getElementById('vs-compact-editor-buttons').style.borderBottom = '0';
			entries.style.borderBottom = '0';
			entries.style.padding = '0';
		}
	},
	
	saveLocally: function() {
		log('CompactEditor::saveLocally()');
		let self = this;
		
		let textElement;
		let video_id = this.domain + '-' + this.id;
		if ( this.types.length == 0 ) {
			// remove it from local database 
			browser.storage.local.remove([video_id]);
			this.origin = 'noSegmentation';
			
			let segmentationOrigin = document.getElementById('vs-segmentation-origin');
			while (segmentationOrigin.firstChild) segmentationOrigin.firstChild.remove();
			segmentationOrigin.appendChild(document.createTextNode(browser.i18n.getMessage(this.origin) + ' (' + this.iterations + ')'));
		}
		else {
			// save locally
			let segmentation = JSON.parse(JSON.stringify({timestamps: this.timestamps, types: this.types})); // break link between segments data and saved data 
			log(segmentation);
			if ( segmentation.timestamps[segmentation.timestamps.length-1] !== this.wrapper.video.duration ) {
				// abstract segment to prevent segmentation extending  
				segmentation.timestamps.push(this.wrapper.video.duration);
				segmentation.types.push('-');
			}
			
			segmentation.timestamps.shift(); // remove first 
			segmentation.timestamps.pop(); // remove last 
			
			browser.storage.local.set({
				[video_id]: segmentation
			}, function() {
				let segmentationOrigin = document.getElementById('vs-segmentation-origin');
				while (segmentationOrigin.firstChild) segmentationOrigin.firstChild.remove();
				segmentationOrigin.appendChild(document.createTextNode(browser.i18n.getMessage(self.origin) + ' [' + self.iterations + ']'));
			});
			this.origin = 'savedLocally';
		}
		// browser.storage.local.remove([video_id]);
		this.iterations = this.iterations + 1;
		if ( document.getElementById('vs-share-segmentation') ) {
			document.getElementById('vs-share-segmentation').disabled = false;
		}
	},
	
	createSegmentEntry: function(i, setFocus=false) {
		let self = this;
		let container = document.createElement('div');
		container.classList.add('vs-segment-entry');
		
		let deleteIcon;
		deleteIcon = document.createElement('i');
		deleteIcon.classList.add('fa');
		deleteIcon.classList.add('fa-times');
		deleteIcon.style.cursor = 'pointer';
		deleteIcon.style.color = '#ED4337';
		container.appendChild(deleteIcon);
		
		deleteIcon.addEventListener('click', function() { 
			if ( self.types.length === 1 ) {
				// = [] will break link between wrapper and editor 
				self.timestamps.length = 0;
				self.types.length = 0;
				
				document.getElementById('vs-compact-editor-sharing').style.display = 'none';
			}
			else {
				self.timestamps.splice(i+1, 1);
				self.types.splice(i, 1);
			}
			
			log('delete');
			self.updateSegmentation(undefined, false, true);
		});
		
		let span;
		span = document.createElement('span');
		span.appendChild(document.createTextNode(' ' + browser.i18n.getMessage(this.types[i]) + ' ' + browser.i18n.getMessage('from') + ' '));
		container.appendChild(span);
		
		let startTime = document.createElement('input');
		startTime.classList.add('vs-segment-start-time');
		startTime.classList.add('vs-segment-editing-restricted');
		startTime.value = this.timestampToClockTime(this.timestamps[i]);
		startTime.size = startTime.value.length + 1;
		startTime.readOnly = true;
		container.appendChild(startTime);
		
		span = document.createElement('span');
		span.appendChild(document.createTextNode(' ' + browser.i18n.getMessage('to') + ' '));
		container.appendChild(span);
		
		let endTime = document.createElement('input');
		endTime.classList.add('vs-segment-end-time');
		endTime.value = this.timestampToClockTime(this.timestamps[i+1]);
		endTime.size = endTime.value.length + 1;
		container.appendChild(endTime);
		this.addSmartCursorHandler(endTime, i+1);

		if ( setFocus ) {
			// firefox ubuntu doesn't focus without delay 
			setTimeout(function() { endTime.focus(); }, 10);
		}
 		
		span = document.createElement('span');
		span.appendChild(document.createTextNode(' '));
		container.appendChild(span);
		
		let rewindIcon = document.createElement('i');
		rewindIcon.classList.add('fa');
		rewindIcon.classList.add('fa-forward');
		rewindIcon.style.cursor = 'pointer';
		rewindIcon.style.color = '#4B71E6';
		container.appendChild(rewindIcon);
		
		rewindIcon.addEventListener('click', function() { 
			self.wrapper.video.currentTime = self.timestamps[i+1] + 0.0001;
		});
		
		return container;
	},
	
	addSmartCursorHandler: function(element, i) {
		let self = this;
		
		// show two digits after focus 
		function focusFn() {
			if ( this.readOnly ) {
				return;
			}
			
			this.value = self.timestampToClockTime(self.timestamps[i], true);
			this.size = this.value.length + 1;
			
			// now handled by mouse click event 
			this.setSelectionRange(this.value.length-1, this.value.length);
			
			// reset all other inputs 
			// let inputs = self.panel.getElementsByClassName('vs-segment-end-time');
			// for ( let i = 0; i < self.types.length; ++i ) {
			// 	if ( inputs[i] !== this ) {
			// 		inputs[i].value = self.timestampToClockTime(self.timestamps[i+1]);
			// 		inputs[i].size = inputs[i].value.length + 1;
			// 	}
			// }
		}

		function blurFn() {
			this.value = self.timestampToClockTime(self.timestamps[i]);
			this.size = this.value.length + 1;
		}
		
		// highlight one digit in time 
		function mouseUpFn() {
			if ( element.readOnly ) {
				return;
			}
			
			// remove last zero if two digits after dot 
			if ( element.value.indexOf('.') == element.value.length-3 && element.value[element.value.length-1] === '0' ) {
				element.value = element.value.slice(0, -1); 
				element.size = element.value.length + 1;
			}
			
			if ( element.selectionStart >= element.value.length ) {
				element.setSelectionRange(element.selectionStart-1, element.selectionStart);
			}
			else {
				if ( element.value[element.selectionStart] >= '0' && element.value[element.selectionStart] <= '9' ) {
					element.setSelectionRange(element.selectionStart, element.selectionStart+1);
				}
				else {
					element.setSelectionRange(element.selectionStart+1, element.selectionStart+2);
				}
			}
		}
		
		// handle arrows 
		function keyDownFn(event) {
			if ( this.readOnly ) {
				return;
			}
			
			let keepPrecision = false;
			
			// arrow left 
			if ( event.keyCode === 37 ) { 
				// remove last zero if two digits after dot 
				if ( this.value.indexOf('.') == this.value.length-3 && this.value[this.value.length-1] === '0' ) {
					this.value = this.value.slice(0, -1); 
					this.size = this.value.length + 1;
				}
				
				if ( this.selectionStart < 2 ) {
					this.setSelectionRange(0, 1);
					event.preventDefault();
					return;
				}
				
				if ( this.value[this.selectionStart-1] >= '0' && this.value[this.selectionStart-1] <= '9' ) {
					this.setSelectionRange(this.selectionStart-1, this.selectionStart);
				}
				else {
					this.setSelectionRange(this.selectionStart-2, this.selectionStart-1);
				}
				
				event.preventDefault();
				return;
			}
			// arrow right 
			else if ( event.keyCode === 39 ) { 
				if ( this.selectionStart > this.value.length-2 ) {
					// if only one digit after dot 
					if ( this.value.indexOf('.') == this.value.length-2 ) {
						// add one zero
						this.value = this.value + '0';
						this.size = this.value.length + 1;
						setTimeout(function() {this.setSelectionRange(this.value.length-1, this.value.length)}, 0);
						return;
					}
				
					this.setSelectionRange(this.value.length-1, this.value.length);
					event.preventDefault();
					return;
				}
				
				if ( this.value[this.selectionStart+1] >= '0' && this.value[this.selectionStart+1] <= '9' ) {
					this.setSelectionRange(this.selectionStart+1, this.selectionStart+2);
				}
				else {
					this.setSelectionRange(this.selectionStart+2, this.selectionStart+3);
				}
				
				event.preventDefault();
				return;
			}
			// arrow up
			else if ( event.keyCode === 38 ) { 
				// TODO: make it nested? 
				keepPrecision = (this.value.indexOf('.')==this.value.length-2)?false:true;
				// TODO: make this function return value 
				handleArrow(this.value, this.selectionStart, 1, i);
			}
			// arrow down 
			else if ( event.keyCode === 40 ) { 
				keepPrecision = (this.value.indexOf('.')==this.value.length-2)?false:true;
				handleArrow(this.value, this.selectionStart, -1, i);
			}
			// everything else 
			else { 
				// block input of non-digit 
				// allow:                 1-0                                            numpad                                              f1-f12
				if ( !(event.keyCode >= 48 && event.keyCode <= 57) && !(event.keyCode >= 96 && event.keyCode <= 105) && !(event.keyCode >= 112 && event.keyCode <= 123) ) {
					event.preventDefault();
				}
				
				return;
			}
			
			self.wrapper.video.currentTime = self.timestamps[i] + 0.01; // small offset to be not rewinded  
			self.wrapper.updateSegmentsBar(); 
			self.saveLocally(); 
			
			let pos = this.selectionStart;
			this.value = self.timestampToClockTime(self.timestamps[i], true, keepPrecision);
			this.size = this.value.length + 1;
			
			let elem = this
			setTimeout(function() { elem.setSelectionRange(pos, pos+1) }, 0);
			
			// change timestamp according to current digit 
			function handleArrow(text, cursorPosition, sign, i) {
				let interval = [1,    10,    100, 1000, 6000, 60000, 360000, 3600000, 36000000];
				//              10ms, 100ms, 1s,  10s,  1m,   10m,   1h,     10h,     100h
				
				// digit order number
				let multiplierPosition = (text.indexOf('.')==text.length-2)?1:0;
				
				// from end to start
				for ( let i = text.length; i > 0; --i ) {
					if ( i == cursorPosition ) {
						break;
					}
					
					if ( text[i] >= '0' && text[i] <= '9' ) {
						multiplierPosition++;
					}
				}
				
				self.timestamps[i] = parseFloat(((self.timestamps[i] * 100 + sign*interval[multiplierPosition]) / 100).toFixed(2));
				if ( self.timestamps[i] < 0 ) self.timestamps[i] = 0.0;
				else if ( self.timestamps[i] > self.wrapper.video.duration ) self.timestamps[i] = parseFloat(self.wrapper.video.duration.toFixed(2));
			}
		}
		
		// update timestamps, set input width 
		let keyupFn = function(event) {
			if ( this.readOnly ) {
				return;
			}
			
			// we only interested in digits 
			if ( !(event.keyCode >= 48 && event.keyCode <= 57) && !(event.keyCode >= 96 && event.keyCode <= 105) ) { 
				return;
			}
			
			// self.timestamps[i] = parseFloat(this.value).toFixed(2);
			self.timestamps[i] = self.convertTimeToSeconds(this.value);
			self.saveLocally(); 
			self.wrapper.updateSegmentsBar(); 
			
			this.value = self.timestampToClockTime(self.timestamps[i], true);
			this.size = this.value.length + 1;
			setTimeout(function() { this.setSelectionRange(this.selectionStart-1, this.selectionStart) }, 0);
			self.wrapper.video.currentTime = self.timestamps[i] + 0.01; // small offset to be not rewinded  
		};

		element.addEventListener('mouseup', mouseUpFn);
		element.addEventListener('keydown', keyDownFn);
		element.addEventListener('keyup', keyupFn);
		element.addEventListener('focus', focusFn);
		element.addEventListener('blur', blurFn);
	},
	
	timestampToClockTime: function(timestamp, showMs=false, keepPrecision=false) {
		if ( typeof timestamp === 'undefined' ) {
			timestamp = 0.0;
		}
		
		let seconds = parseInt(timestamp) % 60;
		let ms = Math.round(timestamp * 1000);
		
		let hours = parseInt(ms / 3600000);
		ms -= hours * 3600000;
		
		let minutes = parseInt(ms / 60000);
		
		// https://stackoverflow.com/a/19700358
		hours = (hours < 10) ? "0" + hours : hours;
		hours = (hours != '00')?(hours+':'):''
		minutes = (minutes < 10) ? "0" + minutes : minutes;
		seconds = (seconds < 10) ? "0" + seconds : seconds;
		
		let time;
		if ( showMs ) {
			ms = ms.toString();
			
			if ( ms[ms.length-2] == '0' && !keepPrecision ) {
				ms = ms[ms.length-3];
			}
			else {
				ms = ms[ms.length-3] + ms[ms.length-2];
			}
			
			// TODO: remove this workaround 
			if ( isNaN(ms) ) ms = '0';
			
			time = hours + minutes + ':' + seconds + '.' + ms;
		}
		else {
			time = hours + minutes + ':' + seconds;
		}
		
		// log(time);
		return time;
	},
	
	createOriginText: function() {
		let self = this;
		
		let element;
		if ( this.timestampsSecondary === null ) {
			element = document.createElement('span');
			element.id = 'vs-segmentation-origin';
			element.appendChild(document.createTextNode(browser.i18n.getMessage(this.origin)));
			element.style.fontSize = '12px';
		}
		else {
			element = document.createElement('select');
			element.id = 'vs-segmentation-origin';
			
			let option = document.createElement('option');
			option.id = 'official';
			option.appendChild(document.createTextNode(browser.i18n.getMessage('officialDatabase')));
			if ( this.origin === 'officialDatabase' ) option.setAttribute('selected', 'selected');
			element.appendChild(option);
			
			option = document.createElement('option');
			option.id = 'local';
			option.appendChild(document.createTextNode(browser.i18n.getMessage('localDatabase')));
			if ( this.origin === 'localDatabase' ) option.setAttribute('selected', 'selected');
			element.appendChild(option);
			
			element.addEventListener('change', function() {
				// let buffer = self.timestampsSecondary;
				// self.timestampsSecondary = self.timestamps;
				// self.timestamps = self.timestampsSecondary;
				
				// buffer = self.typesSecondary;
				// self.typesSecondary = self.types;
				// self.types = buffer;
				
				[self.wrapper.timestamps, self.wrapper.timestampsSecondary] = [self.wrapper.timestampsSecondary, self.wrapper.timestamps];
				[self.wrapper.types, self.wrapper.typesSecondary] = [self.wrapper.typesSecondary, self.wrapper.types];
				self.wrapper.simplifySegmentation();
				
				[self.timestamps, self.types] = [self.wrapper.timestamps, self.wrapper.types];
				self.updateSegmentation(undefined, false, false);
			});
		}
		
		return element;
	},
	
	createSendButton: function() {
		let self = this;
		
		let button = document.createElement('button');
		button.id = 'vs-share-segmentation';
		button.classList.add('fa');
		button.classList.add('fa-check');
		button.appendChild(document.createTextNode(' ' + browser.i18n.getMessage('sendSegmentation')));
		button.addEventListener('click', function() { self.shareSegmentation() });
		
		return button;
	},
	
	shareSegmentation: function() {
		log('Editor::shareSegmentation()');
		let self = this;
		
		// prevent sharing same segmentation 
		if ( this.savedIterations == this.iterations ) {
			this.sendModal('failed', 'noChangesInSegmentation');
			return;
		}
		this.savedIterations = this.iterations;
		
		if ( this.types.length > 0 ) {
			let segmentation = JSON.parse(JSON.stringify({timestamps: this.timestamps, types: this.types})); // break link between segments data and saved data 
			if ( this.settings.mode === 'simplified' ) {
				for ( let i = 0; i < segmentation.types.length ; ++i ) {
					if ( segmentation.types[i] == 'pl' ) {
						segmentation.types[i] = 'c';
					}
					else { 
						segmentation.types[i] = 'cs';
					}
				}
			}
			// log(segmentation);
			
			if ( Math.abs(segmentation.timestamps[segmentation.timestamps.length-1] - this.wrapper.video.duration > 1.5) && segmentation.types[segmentation.types.length-1] !== 'c' ) {
				// assume that everything else is content 
				segmentation.timestamps.push(this.wrapper.video.duration);
				segmentation.types.push('c');
			}
			
			let timestamps = segmentation.timestamps.slice(1, -1);
			let types = segmentation.types;
			
			let xhr = new XMLHttpRequest();
			// xhr.open('POST', 'https://db.videosegments.org/api/test/set.php');
			xhr.open('POST', 'https://db.videosegments.org/api/v3/set.php');
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					if ( xhr.status == 200 ) {
						log('response: ', xhr.responseText);
						let jsonResponse = JSON.parse(xhr.responseText);
						
						if ( jsonResponse.message === 'captcha' ) {
							self.modal.style.display = "block";
							
							let iframe = document.createElement("iframe");
							iframe.src = 'https://db.videosegments.org/api/v3/captcha.php';
							iframe.width  = 350;
							iframe.height = 500;
							iframe.id = 'vs-captcha-iframe';
							self.modal.childNodes[0].appendChild(iframe);
							
							let messageContext = function(event) { 
								self.checkCaptcha(event, timestamps, types, messageContext, clickContext); 
							}
							
							let clickContext = function(event) { 
								if ( event.target == self.modal ) {
									self.modal.style.display = "none";
									self.modal.childNodes[0].childNodes[0].remove();
									window.removeEventListener('message', messageContext);
									window.removeEventListener('click', clickContext);
								}
							}
							
							window.addEventListener('message', messageContext);
							window.addEventListener('click', clickContext);
						}
						else {
							self.checkResponse(jsonResponse);
						}
					}
				}
			};
			
			let post = 'id='+this.id+'&timestamps='+timestamps+'&types='+types;
			
			// log(post);
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
		}
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext) {
		let self = this;
			
		if ( event.origin === 'https://db.videosegments.org' ) {
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/api/v3/set.php');
			// xhr.open('POST', 'https://db.videosegments.org/api/test/set.php');
			
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					self.modal.style.display = 'none';
					self.modal.childNodes[0].childNodes[0].remove();
					
					if ( xhr.status == 200 ) {
						log('response: ', xhr.responseText);
						
						let jsonResponse = JSON.parse(xhr.responseText);
						self.checkResponse(jsonResponse);
					}
				}
			};
			
			let post = 'id='+this.id+'&timestamps='+timestamps+'&types='+types+'&captcha='+event.data;
			// log(post);
			
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
			
			window.removeEventListener('message', messageContext);
			window.removeEventListener('click', clickContext);
		}
	},
	
	checkResponse: function(response) {
		let self = this;
		
		if ( response.message === 'sended' ) {
			this.sendModal('success', 'segmentationSendedToReview');
			
			let segmentationOrigin = document.getElementById('vs-segmentation-origin');
			segmentationOrigin.firstChild.remove();
			
			let link = document.createElement('a');
			link.target = '_blank';
			link.href = 'https://db.videosegments.org/queue.php';
			link.appendChild(document.createTextNode(browser.i18n.getMessage('inReviewQueue')));
			segmentationOrigin.append(link);
			
			document.getElementById('vs-share-segmentation').disabled = true;
		}
		else if ( response.message === 'added' ) {
			this.sendModal('success', 'segmentationAddedToDatabase');
			this.updateBadge();
		}
		else if ( response.message === 'updated' ) {
			this.sendModal('success', 'segmentationUpdatedInDatabase');
		}
		else if ( response.message === 'timeout' ) {
			this.sendModal('failed', 'segmentationSendTimeout');
		}
		else if ( response.message === 'segmented' ) {
			this.sendModal('failed', 'segmentationExistsInDatabase');
		}
		else if ( response.message === 'unlisted' || response.message === 'auto-rejected: video is unlisted' ) {
			this.sendModal('rejected', 'rejectedUnlisted');
		}
		else if ( response.message === 'stream' || response.message === 'auto-rejected: video is stream' ) {
			this.sendModal('rejected', 'rejectedStream');
		}
		else if ( response.message === 'views' || response.message === 'auto-rejected: less than 50000 views' ) {
			this.sendModal('rejected', 'rejectedViews');
		}
		else if ( response.message === 'long' || response.message === 'auto-rejected: video is too long' ) {
			this.sendModal('rejected', 'rejectedLong');
		}
		else if ( response.message === 'segmentation' || response.message === 'auto-rejected: suspicious segmentation' ) {
			this.sendModal('rejected', 'rejectedSegmentation');
		}
		else if ( response.message === 'language' || response.message === 'auto-rejected: unsupported video language' ) {
			this.sendModal('rejected', 'rejectedLanguage');
		}
		else {
			window.alert('VideoSegments: ' + response.message);
		}
	},
	
	sendModal: function(type, bodyText) {
		let modal = document.createElement('div');
		modal.classList.add('vs-messages-modal');
		
		let head = document.createElement('div');
		head.classList.add('vs-messages-modal-head');
		if ( type == 'success' ) head.classList.add('vs-messages-modal-head-success');
		else if ( type == 'rejected' ) head.classList.add('vs-messages-modal-head-rejected');
		else head.classList.add('vs-messages-modal-head-failure');
		head.appendChild(document.createTextNode(browser.i18n.getMessage(type)));
		
		let modalBody = document.createElement('div');
		modalBody.classList.add('vs-messages-modal-body');
		modalBody.appendChild(document.createTextNode(browser.i18n.getMessage(bodyText)));
		if ( type == 'rejected' ) {
			let link = document.createElement('a');
			link.appendChild(document.createTextNode(browser.i18n.getMessage('learnMore')));
			link.target = '_blank';
			link.href = 'https://videosegments.org/limits.html';
			modalBody.appendChild(document.createElement('br'));
			modalBody.appendChild(link);
		}
		else if ( type == 'success' ) {
			let link = document.createElement('a');
			link.appendChild(document.createTextNode(browser.i18n.getMessage('openReviewQueue')));
			link.target = '_blank';
			link.href = 'https://db.videosegments.org/queue.php';
			modalBody.appendChild(document.createElement('br'));
			modalBody.appendChild(link);
		}
		
		modal.appendChild(head);
		modal.appendChild(modalBody);
		setTimeout(function() { modal.classList.add('vs-messages-modal-animation'); }, 100);
		document.body.appendChild(modal);
		
		setTimeout(function() { modal.classList.remove('vs-messages-modal-animation'); }, this.settings.popupDurationOnSend*1000);
		setTimeout(function() { modal.remove(); }, 8000+1000);
	},
	
	updateBadge: function() {
		browser.runtime.sendMessage( { updateBadge: true } );
	},
	
	end: function() {
		log('CompactEditor::end()');
		
		if ( this.panel != null ) {
			this.panel.remove();
		}
	}
}