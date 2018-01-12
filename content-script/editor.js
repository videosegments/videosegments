'use strict';

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

var Editor = {
	panel: null,
	icon: null,
	modal: null,
	messagesModal: null,
	
	wrapper: null,
	settings: null,
	
	timestamps: null,
	types: null,
	origin: null,
	iterations: null,
	
	domain: null,
	id: null,
	
	typesSelect: null,
	widthFixer: null,
	
	start: function(wrapper, timestamps, types, origin, settings, domain, id) {
		console.log('Editor::start()');
		let self = this;
		
		// references 
		this.wrapper = wrapper;
		this.settings = settings;
		
		this.timestamps = timestamps;
		this.types = types;
		this.origin = origin;
		this.iterations = 0;
		
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
			
			self.icon.classList.toggle('vs-editor-icon-active')
		}
		this.icon.addEventListener('click', togglePanelContext);
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
			leftButton.name = type;
			leftButton.appendChild(document.createTextNode(text));
			leftButton.style.color = color;
			leftButton.style.backgroundColor = '#' + backgroundColor;
			leftButton.addEventListener('click', leftCallback);
			
			let rightButton = document.createElement('button');
			rightButton = document.createElement('button');
			rightButton.classList.add('vs-segmentation-panel-button-small');
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
			if ( light < 110 ) {
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
				self.timestamps.push(self.wrapper.video.duration);
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
			self.wrapper.updateSegmentsBar();
			self.recreateSegmentationBar(i, true);
		}
		
		let container = document.createElement('div');
		container.id = 'vs-segmentation-panel-buttons';
		
		this.typesSelect = document.createElement('select');
		let buttonsTypes = ['c', 'ac', 'a', 'i', 'cs', 'ia', 'cr', 'o', 's'];
		let buttonsNames = ['content', 'adcontent', 'advertisement', 'intro', 'cutscene', 'interactive', 'credits', 'offtop', 'scam'];
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
		
		this.messagesModal = document.createElement('div');
		this.messagesModal.id = 'vs-messages-modal'
		// var messagesModalContent = document.createElement('div');
		// messagesModalContent.id = 'vs-messages-modal-content';
		
		var text = document.createTextNode(browser.i18n.getMessage('thankYouMessage'));
		this.messagesModal.appendChild(text);
		document.body.insertAdjacentElement('afterBegin', this.messagesModal);
	},
	
	buildSegmentationBar: function() {
		console.log('Editor::buildSegmentationBar()');
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
		console.log('Editor::createSegmentationBar()');
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
		
		let spritesheet = browser.extension.getURL('content-script/sprites.png');
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
		
			// update timestamps, set input width 
			let keyupFn = function(element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				// self.timestamps[i] = parseFloat(element.value).toFixed(2);
				let timestamp = self.convertTimeToSeconds(element.value);
				if ( timestamp === self.timestamps[i] ) {
					return;
				}
				
				self.timestamps[i] = timestamp;
				self.saveLocally(); 
				self.wrapper.updateSegmentsBar(); 
				
				element.size = element.value.length + 1;
			};
			
			// show milliseconds 
			let focusFn = function(element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				element.value = self.convertSecondsToTime(self.timestamps[i], true);
				element.size = element.value.length + 1;
				
				let inputs = self.panel.getElementsByTagName('input');
				for ( let j = 0; j < self.timestamps.length; ++j ) {
					if ( inputs[j] !== element ) {
						inputs[j].value = self.convertSecondsToTime(self.timestamps[j]);
						inputs[j].size = inputs[j].value.length + 1;
					}
				}
			}
			
			// hotkeys 
			let keyDownFn = function(keyCode, element, i) {
				if ( element.readOnly ) {
					return;
				}
				
				if ( keyCode === 38 ) { // arrow up
					// workaround for float substaction when 0.5 - 0.1 = 0.39999999999999
					self.timestamps[i] = parseFloat(((self.timestamps[i] * 100 + 10) / 100).toFixed(2));
				}
				else if ( keyCode === 40 ) { // arrow down 
					self.timestamps[i] = parseFloat(((self.timestamps[i] * 100 - 10) / 100).toFixed(2));
				}
				else { 
					return;
				}
				
				self.wrapper.video.currentTime = self.timestamps[i] + 0.01; // small offset to go into next segment 
				self.saveLocally(); 
				self.wrapper.updateSegmentsBar(); 
				
				element.value = self.convertSecondsToTime(self.timestamps[i], true);
				element.size = element.value.length + 1;
			}
			
			let startTime = document.createElement('input');
			startTime.classList.add('vs-segmentation-panel-time-entry');
			startTime.value = self.convertSecondsToTime(time);
			startTime.size = startTime.value.length + 1;
			startTime.addEventListener('keyup', function() { keyupFn(startTime, i) });
			startTime.addEventListener('focus', function() { focusFn(startTime, i) });
			startTime.addEventListener('keydown', function(event) { keyDownFn(event.keyCode, startTime, i) });
			
			if ( time === '0.0' || time === self.wrapper.video.duration.toFixed(2) ) {
				startTime.readOnly = true;
				startTime.style.color = 'rgb(150,150,150)';
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
			setButtonImage(rewindButton, 0, 0, 16, 16);
			
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
			
			setButtonImage(currentButton, -12, 0, 16, 16);
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
			setButtonImage(removeButton, -24, 0, 16, 16);
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
			container.appendChild(createTimeEntry(0));
		}
		
		return container;
	},
	
	convertSecondsToTime: function(timestamp, precisely=false) {
		if ( typeof timestamp === 'undefined' ) {
			timestamp = 0.0;
		}
		
		let seconds = parseInt(timestamp) % 60;
		let ms = timestamp * 1000;
		
		let hours = parseInt(ms / 3600000);
		ms -= hours * 3600000;
		
		let minutes = parseInt(ms / 60000);
		ms = ms % 1000;
		
		https://stackoverflow.com/a/19700358
		hours = (hours < 10) ? "0" + hours : hours;
		hours = (hours != '00')?(hours+':'):''
		minutes = (minutes < 10) ? "0" + minutes : minutes;
		seconds = (seconds < 10) ? "0" + seconds : seconds;
		
		let time;
		if ( precisely ) {
			ms = parseInt(ms / 10);
			let msr = parseInt(ms / 10);
			if ( msr * 10 === ms ) {
				ms = msr;
			}
			
			time = hours + minutes + ':' + seconds + '.' + ms;
		}
		else {
			time = hours + minutes + ':' + seconds;
		}
		
		// console.log(time);
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
		// console.log(timestamp);
		return timestamp;
	},
	
	recreateSegmentationBar: function(i, rightButton, setFocus=true) {
		console.log('Editor::recreateSegmentationBar()');
		
		let container = document.getElementById('vs-segmentation-bar');
		while ( container.firstChild ) {
			container.firstChild.remove();
		}
		this.createSegmentationBar(container);
		
		let timeEntry = document.getElementsByClassName('vs-segmentation-panel-bar-entry')[(i-1)*4];
		if ( timeEntry ) { // TODO: investigate why it can be undefined (prob 'cause last element)
			container.scrollLeft = timeEntry.offsetLeft - 20;
		}
		
		console.log(this.timestamps.length, i);
		if ( this.timestamps.length === 2 ) {
			// do nothing since it's autofilled
		}
		else {
			if ( setFocus ) {
				if ( rightButton && (this.timestamps.length-1) === i ) {
					let input = timeEntry.getElementsByTagName('input')[0];
					input.focus();
				}
				else {
					let nextSegmentEntry = document.getElementsByClassName('vs-segmentation-panel-bar-entry')[i*4];
					if ( nextSegmentEntry ) { // TODO: investigate why it can be undefined (prob 'cause last element)
						let input = nextSegmentEntry.getElementsByTagName('input')[0];
						input.focus();
					}
				}
			}
		}
		
		
		let segmentationOrigin = document.getElementById('vs-segmentation-origin');
		segmentationOrigin.firstChild.remove();
		segmentationOrigin.appendChild(document.createTextNode(browser.i18n.getMessage(this.origin) + ' (' + this.iterations + ')'));
	},
	
	// this.setSelectionRange(0, this.value.length);
	// field.selectionStart;
	
	// rebuildSegmentationBar: function() {
		// console.log('Editor::rebuildSegmentationBar()');
		
		// let bar = document.getElementById('vs-segmentation-panel-segments');
		// if ( bar ) bar.remove();
		
		// this.buildSegmentationBar();
	// },
	
	saveLocally: function() {
		console.log('Editor::saveLocally()');
		
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
			});
			this.origin = 'savedLocally';
		}
		// browser.storage.local.remove([video_id]);
		this.iterations = this.iterations + 1;
	},
	
	shareSegmentation: function(decline) {
		console.log('Editor::shareSegmentation()');
		let self = this;
		
		if ( this.types.length > 0 ) {
			let segmentation = JSON.parse(JSON.stringify({timestamps: this.timestamps, types: this.types})); // break link between segments data and saved data 
			if ( Math.abs(segmentation.timestamps[segmentation.timestamps.length-1] - this.wrapper.video.duration > 1.5) && segmentation.types[segmentation.types.length-1] !== 'c' ) {
				// assume that everything else is content 
				segmentation.timestamps.push(this.wrapper.video.duration);
				segmentation.types.push('c');
			}
			
			let timestamps = segmentation.timestamps.slice(1, -1);
			let types = segmentation.types;
			
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					if ( xhr.status == 200 ) {
						console.log('response: ', xhr.responseText);
						let jsonResponse = JSON.parse(xhr.responseText);
						
						if ( jsonResponse.message === 'captcha' ) {
							self.modal.style.display = "block";
							
							let iframe = document.createElement("iframe");
							iframe.src = 'https://db.videosegments.org/captcha3.php';
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
			
			let post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types;
			if ( decline ) {
				post += '&decline=1';
			}
			
			// console.log(post);
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
		}
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext) {
		let self = this;
			
		if ( event.origin === 'https://db.videosegments.org' ) {
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
			
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					self.modal.style.display = 'none';
					self.modal.childNodes[0].childNodes[0].remove();
					
					if ( xhr.status == 200 ) {
						// console.log('response: ', xhr.responseText);
						
						let jsonResponse = JSON.parse(xhr.responseText);
						self.checkResponse(jsonResponse);
					}
				}
			};
			
			let post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types+'&captcha='+event.data;
			// console.log(post);
			
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
			
			window.removeEventListener('message', messageContext);
			window.removeEventListener('click', clickContext);
		}
	},
	
	checkResponse: function(response) {
		let self = this;
		
		if ( response.message === 'successufully sended' || response.message === 'added' || response.message === 'updated' || response.message === 'overwritten' ) {
			this.messagesModal.classList.toggle('vs-messages-modal-dropdown', true);
			setTimeout(function() {
				self.messagesModal.classList.toggle('vs-messages-modal-dropdown', false);
			}, this.settings.popupDurationOnSend*1000);
			this.updateBadge();

			this.panel.classList.toggle('vs-hide-segmentation-panel', true);
			this.icon.classList.toggle('vs-editor-icon-active', false);
		}
		else {
			window.alert('VideoSegments: ' + response.message);
		}
	},
	
	updateBadge: function() {
		browser.runtime.sendMessage( { updateBadge: true } );
	},
	
	end: function() {
		console.log('Editor::end()');
		
		this.icon.remove();
		this.panel.remove();
		this.modal.remove();
		this.messagesModal.remove();
	},
};