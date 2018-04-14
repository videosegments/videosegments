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

var Editor = {
	panel: null,
	icon: null,
	modal: null,
	
	wrapper: null,
	settings: null,
	
	timestamps: null,
	types: null,
	origin: null,
	iterations: null,
	savedIterations: null,
	
	domain: null,
	id: null,
	
	typesSelect: null,
	widthFixer: null,
	
	start: function(wrapper, timestamps, types, origin, settings, domain, id) {
		log('Editor::start()');
		let self = this;
		
		// references 
		this.wrapper = wrapper;
		this.settings = settings;
		
		this.timestamps = timestamps;
		this.types = types;
		this.origin = origin;
		this.iterations = 0;
		this.savedIterations = -1;
		
		this.domain = domain;
		this.id = id;
		
		// icon 
		this.icon = document.createElement('div');
		this.icon.id = 'vs-editor-icon';
		
		let togglePanelContext = function() {
			if ( self.icon.classList.contains('vs-editor-icon-active') ) {
				self.panel.classList.toggle('vs-hide-segmentation-panel', true);
			}
			else {
				let offset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
				if ( offset !== 0 ) {
					document.body.scrollTop = document.documentElement.scrollTop = 0;
				}
				self.panel.classList.toggle('vs-hide-segmentation-panel', false);
			}
			
			if ( self.settings.highlightIcon === true ) {
				self.settings.highlightIcon = false;
				self.icon.style.border = '1px solid lightgray';
				browser.storage.local.set({ settings: self.settings });
			}
			
			self.icon.classList.toggle('vs-editor-icon-active')
		}
		this.icon.addEventListener('click', togglePanelContext);
		
		if ( this.settings.highlightIcon === true ) {
			this.icon.style.border = '3px solid red';
		}
		this.icon.style.background = 'url(' + browser.extension.getURL('images/scissors.png') +') no-repeat center center';
		this.icon.style.backgroundSize = 'cover';
		document.body.insertAdjacentElement('afterBegin', this.icon);
		
		// panel  
		this.panel = document.createElement('div');
		this.panel.id = 'vs-segmentation-panel';
		document.body.insertAdjacentElement('afterBegin', this.panel);
		
		// pin setting 
		if ( this.settings.pinSegmentationTools === false ) {
			let scrollContext = function() {
				let offset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
				if ( offset === 0 ) {
					if ( self.icon.classList.contains('vs-editor-icon-active') ) {
						self.panel.classList.toggle('vs-hide-segmentation-panel', false);
					}
				}
				else {
					if ( !self.panel.classList.contains('vs-hide-segmentation-panel') ) {
						self.panel.classList.toggle('vs-hide-segmentation-panel', true);
					}
				}
			}
			document.addEventListener('scroll', scrollContext);
		}
		
		// show&hide settings 
		if ( this.settings.showSegmentationTools ) {
			if ( this.settings.hideOnSegmentedVideos && this.origin !== 'noSegmentation' && this.origin !== 'pendingDatabase' ) {
				this.panel.classList.add('vs-hide-segmentation-panel');
			}
			else {
				this.icon.classList.add('vs-editor-icon-active');
			}
		}
		else {
			if ( this.origin !== 'pendingDatabase' ) {
				this.panel.classList.add('vs-hide-segmentation-panel');
			}
			else {
				this.icon.classList.add('vs-editor-icon-active');
			}
		}
		
		
		// hide icon setting 
		if ( this.settings.hideIcon ) {
			this.icon.style.display = 'none';
		}
		
		// opacity setting 
		this.panel.style.opacity = this.settings.segmentationToolsOpacity / 100;
		this.icon.style.opacity = this.settings.iconOpacity / 100;
		
		// hovering 
		let mouseMoveEvent = document.createEvent("Events");
		mouseMoveEvent.initEvent("mousemove", false, false);
		// it is different element from "video" tag
		let player = document.getElementsByClassName('html5-video-player')[0];
		
		let moveTimer = null;
		// show youtube controls when mouse hover over panel 
		let mouseEnterFn = function() {
			player.dispatchEvent(mouseMoveEvent);
			moveTimer = setInterval(function() { player.dispatchEvent(mouseMoveEvent); }, 1000);
		}
		
		// hide youtube controls when mouse leave panel  
		let mouseLeaveFn = function() {
			// todo: instant hide 
			clearInterval(moveTimer);
		}
		
		this.panel.addEventListener('mouseenter', mouseEnterFn);
		this.panel.addEventListener('mouseleave', mouseLeaveFn);
				
		// buttons 
		let createButtonsFn = function(type, text, color, backgroundColor, leftCallback, rightCallback) {
			let container = document.createElement('div');
			container.classList.add('vs-segmentation-panel-button');
			
			let leftButton = document.createElement('button');
			leftButton.classList.add('vs-segmentation-panel-button-big');
			leftButton.id = 'vs-left-button-' + type;
			leftButton.name = type;
			leftButton.appendChild(document.createTextNode(text));
			leftButton.style.color = color;
			leftButton.style.backgroundColor = '#' + backgroundColor;
			leftButton.addEventListener('click', leftCallback);
			
			let rightButton = document.createElement('button');
			rightButton = document.createElement('button');
			rightButton.classList.add('vs-segmentation-panel-button-small');
			rightButton.id = 'vs-right-button-' + type;
			rightButton.name = type;
			rightButton.appendChild(document.createTextNode('>'));
			rightButton.style.color = color;
			rightButton.style.backgroundColor = '#' + backgroundColor;
			rightButton.addEventListener('click', rightCallback);
			
			container.insertAdjacentElement('beforeEnd', leftButton);
			container.insertAdjacentElement('beforeEnd', rightButton);
			return container;
		};
		
		let getTextColorFn = function(color) {
			// https://stackoverflow.com/a/12043228
			let rgb = parseInt(color, 16);   // convert rrggbb to decimal
			let r = (rgb >> 16) & 0xff;  // extract red
			let g = (rgb >>  8) & 0xff;  // extract green
			let b = (rgb >>  0) & 0xff;  // extract blue
			
			let textColor;
			let light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			if ( light < 120 ) {
				return 'white';
			}
			else {
				return 'black';
			}
		};
		
		// from previous to current 
		let leftButtonFn = function() {
			let i = 0, currentTime = parseFloat(self.wrapper.video.currentTime.toFixed(1));
			if ( self.timestamps.length === 0 ) {
				self.timestamps.push(0.0);
				self.timestamps.push(currentTime);
				self.types.push(this.name);
			}
			else {
				for ( i = 0; i < self.timestamps.length; ++i ) {
					if ( self.timestamps[i] > currentTime ) {
						self.timestamps.splice(i, 0, currentTime);
						self.types.splice(i-1, 0, this.name);
						break;
					}
				}
				
				if ( i === self.timestamps.length ) {
					self.timestamps.push(currentTime);
					self.types.push(this.name);
				}
			}
			
			self.saveLocally();
			self.wrapper.updateSegmentsBar();
			self.recreateSegmentationBar(i, false);
		}
		
		// from current to next 
		let rightButtonFn = function() {
			let i = 0, currentTime = parseFloat(self.wrapper.video.currentTime.toFixed(1));
			if ( self.timestamps.length === 0 ) {
				self.timestamps.push(0.0);
				self.timestamps.push(parseFloat(self.wrapper.video.duration.toFixed(2)));
				self.types.push(this.name);
			}
			else {
				for ( i = 0; i < self.timestamps.length; ++i ) {
					if ( self.timestamps[i] > currentTime ) {
						self.timestamps.splice(i, 0, currentTime);
						self.types.splice(i, 0, this.name);
						break;
					}
				}
				
				if ( i === self.timestamps.length ) {
					self.timestamps.push(parseFloat(self.wrapper.video.duration.toFixed(2)));
					self.types.push(this.name);
				}
			}
			
			self.saveLocally();
			self.wrapper.updateSegmentsBar(false);
			self.recreateSegmentationBar(i, true);
		}
		
		let container = document.createElement('div');
		if ( this.settings.mode === 'simplified' ) {
			container.id = 'vs-segmentation-panel-buttons-simplified';
		}
		else {
			container.id = 'vs-segmentation-panel-buttons';
		}
		
		this.typesSelect = document.createElement('select');
		
		let buttonsTypes, buttonsNames;
		if ( this.settings.mode === 'simplified' ) {
			buttonsTypes = ['sk', 'pl'];
			buttonsNames = ['skip', 'play'];
		}
		else {
			buttonsTypes = ['c', 'ac', 'a', 'i', 'cs', 'ia', 'cr', 'o', 's'];
			buttonsNames = ['content', 'adcontent', 'advertisement', 'intro', 'cutscene', 'interactive', 'credits', 'offtop', 'scam'];
		}
		
		for ( let i = 0; i < buttonsTypes.length; ++i ) {
			let text = browser.i18n.getMessage(buttonsNames[i]);
			
			let textColor = getTextColorFn(this.settings.segments[buttonsTypes[i]].color.slice(1));
			let buttons = createButtonsFn(buttonsTypes[i], text, textColor, this.settings.segments[buttonsTypes[i]].color.slice(1), leftButtonFn, rightButtonFn);
			container.insertAdjacentElement('beforeEnd', buttons);
			
			let option = document.createElement('option');
			option.value = buttonsTypes[i];
			option.text = text;
			this.typesSelect.appendChild(option);
		}
		
		this.widthFixer = document.createElement('select');
		this.widthFixer.id = 'vs-segmentation-bar-width-fixer';
		this.widthFixer.appendChild(document.createElement('option'));
		document.body.insertAdjacentElement('afterBegin', this.widthFixer);
		
		this.panel.insertAdjacentElement('beforeEnd', container);
		
		this.buildSegmentationBar();
		
		this.modal = document.createElement('div');
		this.modal.id = 'vs-modal'
		var modalContent = document.createElement('div');
		modalContent.id = 'vs-modal-content';
		this.modal.appendChild(modalContent);
		document.body.insertAdjacentElement('afterBegin', this.modal);
		// this.segmentationPanel.appendChild(this.modal);
	},
	
	buildSegmentationBar: function() {
		log('Editor::buildSegmentationBar()');
		let self = this;
		
		let segmentationBar = document.createElement('div');
		segmentationBar.id = 'vs-segmentation-panel-segments';
		
		let container = document.createElement('div');
		container.id = 'vs-segmentation-bar';
		segmentationBar.appendChild(container);
		this.createSegmentationBar(container);
		
		let buttonsContainer = document.createElement('div');
		buttonsContainer.style.display = 'inline-block';
		buttonsContainer.style.textAlign = 'center';
		buttonsContainer.style.width = '10%';
		buttonsContainer.style.marginBottom = '2px';
		buttonsContainer.style.marginTop = '5px';
		
		let segmentationOrigin = document.createElement('span');
		segmentationOrigin.id = 'vs-segmentation-origin';
		
		let text = document.createElement('span');
		if ( this.origin === 'savedLocally' ) {
			text = document.createTextNode(browser.i18n.getMessage(this.origin) + ' (' + this.iterations + ')');
		}
		else {
			text = document.createTextNode(browser.i18n.getMessage(this.origin));
		}
		segmentationOrigin.appendChild(text);
		
		buttonsContainer.appendChild(segmentationOrigin);
		buttonsContainer.appendChild(document.createElement('br'));
		
		if ( this.origin === 'pendingDatabase' ) {
			let declineButton = document.createElement('button');
			declineButton.appendChild(document.createTextNode(browser.i18n.getMessage('declineSegmentation')));
			declineButton.addEventListener('click', function() { self.shareSegmentation(true); });
			
			let acceptButton = document.createElement('button');
			acceptButton.appendChild(document.createTextNode(browser.i18n.getMessage('acceptSegmentation')));
			acceptButton.addEventListener('click', function() { self.shareSegmentation(false); });
			
			buttonsContainer.appendChild(declineButton);
			buttonsContainer.appendChild(document.createTextNode('\u00A0\u00A0'));
			buttonsContainer.appendChild(acceptButton);
		}
		else {
			let sendButton = document.createElement('button');
			sendButton.appendChild(document.createTextNode(browser.i18n.getMessage('sendSegmentation')));
			sendButton.addEventListener('click', function() { self.shareSegmentation(false); });
			buttonsContainer.appendChild(sendButton);
		}
		
		segmentationBar.appendChild(buttonsContainer);
		this.panel.insertAdjacentElement('beforeEnd', segmentationBar);
	},
	
	createSegmentationBar: function(container) {
		log('Editor::createSegmentationBar()');
		let self = this;
		
		// set width to option content 
		let fixSelectWidthFn = function(select) {
			let text = select[select.selectedIndex].innerHTML;
			while ( self.widthFixer.firstChild.firstChild ) {
				self.widthFixer.firstChild.firstChild.remove();
			}
			
			self.widthFixer.firstChild.appendChild(document.createTextNode(text));
			select.style.width = self.widthFixer.offsetWidth + 2 + 'px';
		};
		
		let spritesheet = browser.extension.getURL('images/sprites-editor.png');
		let setButtonImage = function(btn, l, t, w, h) {
			btn.style = 'width: '+w+'px; height: '+h+'px; background: url('+spritesheet+') '+l+'px '+t+'px;';
		}
		
		// let blurFn = function(element, i) {
			// element.value = self.convertSecondsToTime(self.timestamps[i]);
			// element.size = element.value.length + 1;
		// }
		
		let createTimeEntry = function(i) {
			let time = 0.0;
			if ( typeof self.timestamps[i] !== 'undefined' ) {
				time = parseFloat(self.timestamps[i]).toFixed(2);
				if ( time.slice(-1) === '0' ) {
					time = time.slice(0, -1);
				}
			}
			
			entry = document.createElement('div');
			entry.classList.add('vs-segmentation-panel-bar-entry');
			
			// show milliseconds 
			let focusFn = function(element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				element.value = self.convertSecondsToTime(self.timestamps[i], true);
				element.size = element.value.length + 1;
				
				// now handled by mouse click event 
				startTime.setSelectionRange(startTime.value.length-1, startTime.value.length);
						
				let inputs = self.panel.getElementsByTagName('input');
				for ( let j = 0; j < self.timestamps.length; ++j ) {
					if ( inputs[j] !== element ) {
						inputs[j].value = self.convertSecondsToTime(self.timestamps[j]);
						inputs[j].size = inputs[j].value.length + 1;
					}
				}
			}
			
			// smart cursor  
			let mouseUpFn = function(event, element, i) {
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
			
			// hotkeys 
			let keyDownFn = function(event, element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				let keepPrecision = false;
				
				// arrow left 
				if ( event.keyCode === 37 ) { 
					// remove last zero if two digits after dot 
					if ( element.value.indexOf('.') == element.value.length-3 && element.value[element.value.length-1] === '0' ) {
						element.value = element.value.slice(0, -1); 
						element.size = element.value.length + 1;
					}
					
					if ( element.selectionStart < 2 ) {
						element.setSelectionRange(0, 1);
						event.preventDefault();
						return;
					}
					
					if ( element.value[element.selectionStart-1] >= '0' && element.value[element.selectionStart-1] <= '9' ) {
						element.setSelectionRange(element.selectionStart-1, element.selectionStart);
					}
					else {
						element.setSelectionRange(element.selectionStart-2, element.selectionStart-1);
					}
					
					event.preventDefault();
					return;
				}
				// arrow right 
				else if ( event.keyCode === 39 ) { 
					if ( element.selectionStart > element.value.length-2 ) {
						// if only one digit after dot 
						if ( element.value.indexOf('.') == element.value.length-2 ) {
							// add one zero
							element.value = element.value + '0';
							element.size = element.value.length + 1;
							setTimeout(function() {element.setSelectionRange(element.value.length-1, element.value.length)}, 0);
							return;
						}
					
						element.setSelectionRange(element.value.length-1, element.value.length);
						event.preventDefault();
						return;
					}
					
					if ( element.value[element.selectionStart+1] >= '0' && element.value[element.selectionStart+1] <= '9' ) {
						element.setSelectionRange(element.selectionStart+1, element.selectionStart+2);
					}
					else {
						element.setSelectionRange(element.selectionStart+2, element.selectionStart+3);
					}
					
					event.preventDefault();
					return;
				}
				// arrow up
				else if ( event.keyCode === 38 ) { 
					// TODO: make it nested? 
					keepPrecision = (element.value.indexOf('.')==element.value.length-2)?false:true;
					// TODO: make this function return value 
					smartCursorArrowsHandler(element.value, element.selectionStart, 1, i);
				}
				// arrow down 
				else if ( event.keyCode === 40 ) { 
					keepPrecision = (element.value.indexOf('.')==element.value.length-2)?false:true;
					smartCursorArrowsHandler(element.value, element.selectionStart, -1, i);
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
				
				let pos = element.selectionStart;
				element.value = self.convertSecondsToTime(self.timestamps[i], true, keepPrecision);
				element.size = element.value.length + 1;
				setTimeout(function() { element.setSelectionRange(pos, pos+1) }, 0);
			}
			
			let smartCursorArrowsHandler = function(text, cursorPosition, sign, i) {
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
		
			// update timestamps, set input width 
			let keyupFn = function(event, element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				// we only interested in digits 
				if ( !(event.keyCode >= 48 && event.keyCode <= 57) && !(event.keyCode >= 96 && event.keyCode <= 105) ) { 
					return;
				}
				
				// self.timestamps[i] = parseFloat(element.value).toFixed(2);
				self.timestamps[i] = self.convertTimeToSeconds(element.value);
				self.saveLocally(); 
				self.wrapper.updateSegmentsBar(); 
				
				element.value = self.convertSecondsToTime(self.timestamps[i], true);
				element.size = element.value.length + 1;
				setTimeout(function() { element.setSelectionRange(element.selectionStart-1, element.selectionStart) }, 0);
				self.wrapper.video.currentTime = self.timestamps[i] + 0.01; // small offset to be not rewinded  
			};
			
			let startTime = document.createElement('input');
			startTime.classList.add('vs-segmentation-panel-time-entry');
			startTime.value = self.convertSecondsToTime(time);
			startTime.size = startTime.value.length + 1;
			startTime.addEventListener('keyup', function(event) { keyupFn(event, startTime, i) });
			startTime.addEventListener('focus', function() { focusFn(startTime, i) });
			// we need fresh selectionStart position so wait a little bit 
			startTime.addEventListener('mouseup', function(event) { setTimeout(function() {mouseUpFn(event, startTime, i)}, 0); });
			startTime.addEventListener('keydown', function(event) { keyDownFn(event, startTime, i) });
			
			time = parseFloat(time);
			if ( time === 0.0 || time === parseFloat(self.wrapper.video.duration.toFixed(2)) ) {
				startTime.readOnly = true;
				startTime.style.color = 'rgb(100,100,100)';
				startTime.style.cursor = 'not-allowed';
			}
			// startTime.addEventListener('blur', function() { blurFn(startTime, i) });
			
			let rewindFn = function() {
				self.wrapper.video.currentTime = self.timestamps[i] + 0.0001; // small offset to go into next segment 
				startTime.focus();
			};
			
			let rewindButton = document.createElement('button');
			rewindButton.classList.add('vs-segmentation-panel-small-button');
			rewindButton.addEventListener('click', rewindFn);
			setButtonImage(rewindButton, 1, 1, 16, 16);
			
			let setCurrentTimeFn = function() {
				self.timestamps[i] = parseFloat(self.wrapper.video.currentTime).toFixed(1);
				self.saveLocally(); 
				self.wrapper.updateSegmentsBar(); 
				
				startTime.value = self.convertSecondsToTime(self.timestamps[i], true);
				startTime.size = startTime.value.length + 1;
			}
			
			let currentButton = document.createElement('button');
			currentButton.classList.add('vs-segmentation-panel-small-button');
			currentButton.addEventListener('click', setCurrentTimeFn);
			
			setButtonImage(currentButton, 21, 1, 16, 16);
			entry.appendChild(rewindButton);
			entry.appendChild(startTime);
			entry.appendChild(currentButton);
			entry.appendChild(document.createTextNode('\u00A0'));
			
			return entry;
		};
		
		let createArrowEntry = function() {
			entry = document.createElement('div');
			entry.classList.add('vs-segmentation-panel-bar-entry');
			entry.appendChild(document.createTextNode('\u27A1'));
			entry.appendChild(document.createTextNode('\u00A0'));
			
			return entry;
		};
		
		let createTypeEntry = function(i) {
			entry = document.createElement('div');
			entry.classList.add('vs-segmentation-panel-bar-entry');
			let select = self.typesSelect.cloneNode(true);
			select.value = self.types[i];
			entry.appendChild(select);
			let removeButton = document.createElement('button');
			removeButton.classList.add('vs-segmentation-panel-small-button');
			setButtonImage(removeButton, 11, 1, 16, 16);
			removeButton.style.marginTop = '1px';
			entry.appendChild(removeButton);
			entry.appendChild(document.createTextNode('\u00A0'));
			fixSelectWidthFn(select);
			
			select.addEventListener('change', function() { 
				self.types[i] = this.value;
				fixSelectWidthFn(this); 
					
				self.saveLocally(); 
				self.wrapper.updateSegmentsBar(); 
			});
			
			removeButton.addEventListener('click', function() { 
				if ( self.types.length === 1 ) {
					// = [] will break link between wrapper and editor 
					self.timestamps.length = 0;
					self.types.length = 0;
				}
				else {
					self.timestamps.splice(i+1, 1);
					self.types.splice(i, 1);
				}
				
				self.saveLocally();
				self.wrapper.updateSegmentsBar(); 
				self.recreateSegmentationBar(i, null, false);
			});
			
			return entry;
		};
		
		let entry;
		if ( this.types.length !== 0 ) { // have segmentation
			for ( let i = 0; i < this.types.length; ++i ) {
				container.appendChild(createTimeEntry(i));
				container.appendChild(createArrowEntry());
				container.appendChild(createTypeEntry(i));
				container.appendChild(createArrowEntry());
			}
			
			container.appendChild(createTimeEntry(this.timestamps.length-1));
		}
		else {
			container.appendChild(createTimeEntry(0.0));
		}
		
		return container;
	},
	
	convertSecondsToTime: function(timestamp, showMs=false, keepPrecision=false) {
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
	
	convertTimeToSeconds: function(time) {
		let parts = time.split(':');
		let timestamp = 0;
		if ( parts.length == 3 ) {
			timestamp += parseInt(parts[0]) * 3600;
			timestamp += parseInt(parts[1]) * 60;
		}
		else {
			timestamp += parseInt(parts[0]) * 60;
		}
		
		timestamp += parseFloat(parseFloat(parts[parts.length-1]).toFixed(2));
		// log(timestamp);
		return timestamp;
	},
	
	recreateSegmentationBar: function(i, rightButton, setFocus=true) {
		log('Editor::recreateSegmentationBar()');
		
		let container = document.getElementById('vs-segmentation-bar');
		while ( container.firstChild ) {
			container.firstChild.remove();
		}
		this.createSegmentationBar(container);
		
		let timeEntry = document.getElementsByClassName('vs-segmentation-panel-bar-entry')[(i-1)*4];
		if ( timeEntry ) { // TODO: investigate why it can be undefined (prob 'cause last element)
			container.scrollLeft = timeEntry.offsetLeft - 20;
		}
		
		if ( this.timestamps.length === 2 && parseFloat(this.timestamps[1].toFixed(2)) === parseFloat(this.wrapper.video.duration.toFixed(2)) ) {
			// do nothing since it's autofilled
		}
		else {
			if ( setFocus ) {
				if ( rightButton && (this.timestamps.length-1) === i ) {
					let input = timeEntry.getElementsByTagName('input')[0];
					input.focus();
				}
				else {
					// for first segment i should be 1
					if ( i === 0 ) { 
						i = 1;
					}
					
					// find next segment 
					let nextSegmentEntry = document.getElementsByClassName('vs-segmentation-panel-bar-entry')[i*4];
					if ( nextSegmentEntry ) { // TODO: investigate why it can be undefined (prob 'cause last element)
						let input = nextSegmentEntry.getElementsByTagName('input')[0];
						input.focus();
					}
				}
			}
		}
	},
	
	// this.setSelectionRange(0, this.value.length);
	// field.selectionStart;
	
	// rebuildSegmentationBar: function() {
		// log('Editor::rebuildSegmentationBar()');
		
		// let bar = document.getElementById('vs-segmentation-panel-segments');
		// if ( bar ) bar.remove();
		
		// this.buildSegmentationBar();
	// },
	
	saveLocally: function() {
		log('Editor::saveLocally()');
		let self = this;
		
		let textElement;
		let video_id = this.domain + '-' + this.id;
		if ( this.types.length == 0 ) {
			// remove it from local database 
			browser.storage.local.remove([video_id]);
			this.origin = 'noSegmentation';
		}
		else {
			// save locally
			let segmentation = JSON.parse(JSON.stringify({timestamps: this.timestamps, types: this.types})); // break link between segments data and saved data 
			
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
				segmentationOrigin.firstChild.remove();
				segmentationOrigin.appendChild(document.createTextNode(browser.i18n.getMessage(self.origin) + ' (' + self.iterations + ')'));
			});
			this.origin = 'savedLocally';
		}
		// browser.storage.local.remove([video_id]);
		this.iterations = this.iterations + 1;
	},
	
	shareSegmentation: function(decline) {
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
			log(segmentation);
			
			if ( Math.abs(segmentation.timestamps[segmentation.timestamps.length-1] - this.wrapper.video.duration > 1.5) && segmentation.types[segmentation.types.length-1] !== 'c' ) {
				// assume that everything else is content 
				segmentation.timestamps.push(this.wrapper.video.duration);
				segmentation.types.push('c');
			}
			
			let timestamps = segmentation.timestamps.slice(1, -1);
			let types = segmentation.types;
			
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/api/test/set.php');
			// xhr.open('POST', 'http://db.vsegments/api/v3/set.php');
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
				log(xhr.readyState, xhr.status);
			};
			
			let post = 'id='+this.id+'&timestamps='+timestamps+'&types='+types;
			if ( decline ) {
				post += '&decline=1';
			}
			
			// log(post);
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
		}
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext) {
		let self = this;
			
		if ( event.origin === 'https://db.videosegments.org' ) {
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/api/test/set.php');
			
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
		else {
			window.alert('VideoSegments: ' + response.message);
		}
		
		this.panel.classList.toggle('vs-hide-segmentation-panel', true);
		this.icon.classList.toggle('vs-editor-icon-active', false);
	},
	
	checkResponse: function(response) {
		let self = this;
		
		if ( response.message === 'sended' ) {
			this.sendModal('success', 'segmentationSendedToReview');
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
			log('VideoSegments: ' + response.message);
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
		
		modal.appendChild(head);
		modal.appendChild(modalBody);
		setTimeout(function() { modal.classList.add('vs-messages-modal-animation'); }, 100);
		document.body.appendChild(modal);
		
		if ( type != 'rejected' ) {
			setTimeout(function() { modal.classList.remove('vs-messages-modal-animation'); }, this.settings.popupDurationOnSend*1000);
			setTimeout(function() { modal.remove(); }, this.settings.popupDurationOnSend*1000+1000);
		}
		else {
			setTimeout(function() { modal.classList.remove('vs-messages-modal-animation'); }, 8000);
			setTimeout(function() { modal.remove(); }, 9000);
		}
	},
	
	updateBadge: function() {
		browser.runtime.sendMessage( { updateBadge: true } );
	},
	
	updateSettings: function(settings) {
		// this.settings = settings;
	},
	
	end: function() {
		log('Editor::end()');
		
		this.icon.remove();
		this.panel.remove();
		this.modal.remove();
	},
};