
var editor = {
	icon: null,
	segmentationPanel: null,
	
	mediaPlayerWrapper: null,
	segmentsData: null,
	settings: null,
	domain: null,
	id: null,
	
	typeSelect: null,
	tempSelect: null, // helper to adjust width of select 
	modal: null,
	messagesModal: null,
	
	scrollContext: null,
	hasSegmentation: null,
	
	init: function(mediaPlayerWrapper, segmentsData, settings, domain, id) {
		// console.log('editor::init()');
		var self = this;
		
		this.mediaPlayerWrapper = mediaPlayerWrapper;
		this.segmentsData = segmentsData;
		this.settings = settings;
		this.domain = domain;
		this.id = id;
		
		var icon = document.getElementById('vs-editor-icon');
		if ( !icon ) {
			icon = document.createElement('div');
			icon.id = 'vs-editor-icon';
			icon.addEventListener('click', function() { 
				self.toggleSegmentationPanel(); 
			});
		}
		
		var segmentationPanel = document.createElement('div');
		segmentationPanel.id = 'vs-segmentation-panel';
		if ( this.settings.showSegmentationTools ) {
			segmentationPanel.style.display = 'block';
			icon.classList.add('vs-editor-icon-active');
		}
		else {
			segmentationPanel.style.display = 'none';
			icon.classList.remove('vs-editor-icon-active');
		}
		
		if ( this.settings.hideOnSegmentedVideos && this.segmentsData && this.segmentsData.origin !== 'pendingDatabase' ) {
			this.hasSegmentation = true;
			segmentationPanel.style.display = 'none';
			icon.classList.remove('vs-editor-icon-active');
		}
		else {
			this.hasSegmentation = false;
		}
		
		if ( this.settings.hideIcon === false ) {
			icon.style.display = 'block';
		}
		else {
			icon.style.display = 'none';
		}
		
		var buttons = document.createElement('div');
		buttons.id = 'vs-segmentation-panel-buttons';
		
		this.typeSelect = document.createElement('select');
		var types = ['c', 'ac', 'a', 'i', 'cs', 'ia', 'cr', 'o', 's'];
		var names = ['content', 'adcontent', 'advertisement', 'intro', 'cutscene', 'interactive', 'credits', 'offtop', 'scam'];
		for ( let i = 0; i < names.length; ++i ) {
			names[i] = browser.i18n.getMessage(names[i]);
			
			// is color dark or light  
			// https://stackoverflow.com/a/12043228
			var color = this.settings.segments[types[i]].color.slice(1);
			var rgb = parseInt(color, 16);   // convert rrggbb to decimal
			var r = (rgb >> 16) & 0xff;  // extract red
			var g = (rgb >>  8) & 0xff;  // extract green
			var b = (rgb >>  0) & 0xff;  // extract blue
			
			var textColor;
			var light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			if ( light < 60 ) {
				textColor = 'white';
			}
			else {
				textColor = 'black';
			}
			
			var container = document.createElement('div');
			container.classList.add('vs-segmentation-panel-button');
			
			var button;
			button = this.createSegmentationButton('vs-segmentation-panel-button-big', types[i], names[i], textColor, this.settings.segments[types[i]].color, function() { 
				self.addSegmentFromPreviousToCurrent(this.name); 
				self.rebuilPanelBar();
			});
			container.appendChild(button);
			
			button = this.createSegmentationButton('vs-segmentation-panel-button-small', types[i], '>', textColor, this.settings.segments[types[i]].color, function() { 
				self.addSegmentFromCurrentToNext(this.name); 
				self.rebuilPanelBar();
			});
			container.appendChild(button);
			
			buttons.appendChild(container);
			
			var option = document.createElement('option');
			option.value = types[i];
			option.text = names[i];
			// option.style.backgroundColor = this.settings.segments[types[i]].color;
			this.typeSelect.appendChild(option);
		}
		this.typeSelect.classList.add('vs-segmentation-panel-type-entry');
		
		this.tempSelect = document.createElement('select');
		this.tempSelect.style.fontFamily = 'courier';
		this.tempSelect.style.visibility = 'hidden';
		this.tempSelect.style.position = 'fixed';
		this.tempSelect.style.top = '150%';
		this.tempSelect.appendChild(document.createElement('option'));
		
		segmentationPanel.appendChild(this.tempSelect);
		segmentationPanel.appendChild(buttons);
		
		var bar = document.createElement('div');
		bar.id = 'vs-segmentation-panel-bar';
		segmentationPanel.appendChild(bar);
		
		var buttons = document.createElement('div');
		buttons.id ='vs-segmentation-panel-bar-actions';
		buttons.style.display = 'none';
		
		if ( this.segmentsData && this.segmentsData.origin ) {
			buttons.appendChild(document.createTextNode(browser.i18n.getMessage(this.segmentsData.origin)));
			buttons.appendChild(document.createElement('br'));
			
			if ( this.segmentsData.origin === 'pendingDatabase' ) {
				var button = document.createElement('button');
				button.style.marginTop = '5px';
				button.appendChild(document.createTextNode(browser.i18n.getMessage('declineSegmentation')));
				button.addEventListener('click', function() {
					self.sendSegmentsData(true);
				});
				buttons.appendChild(button);

				var button = document.createElement('button');
				button.style.marginTop = '5px';
				button.style.marginLeft = '5px';
				button.appendChild(document.createTextNode(browser.i18n.getMessage('acceptSegmentation')));
				button.addEventListener('click', function() {
					self.sendSegmentsData(false);
				});
				buttons.appendChild(button);	
			}
			else {
				browser.storage.local.get({ request: '0' }, function(result) {
					if ( result.request == '1' ) {
						browser.storage.local.remove(['request']);
						
						var button = document.createElement('button');
						button.style.marginTop = '5px';
						button.appendChild(document.createTextNode(browser.i18n.getMessage('declineSegmentation')));
						button.addEventListener('click', function() {
							self.sendSegmentsData(true);
						});
						buttons.appendChild(button);

						var button = document.createElement('button');
						button.style.marginTop = '5px';
						button.style.marginLeft = '5px';
						button.appendChild(document.createTextNode(browser.i18n.getMessage('acceptSegmentation')));
						button.addEventListener('click', function() {
							self.sendSegmentsData(false);
						});
						buttons.appendChild(button);						
					}
					else {
						var button = document.createElement('button');
						button.style.marginTop = '5px';
						button.appendChild(document.createTextNode(browser.i18n.getMessage('sendSegmentation')));
						button.addEventListener('click', function() {
							self.sendSegmentsData(false);
						});
						buttons.appendChild(button);
					}
				});
			}
		}
		else {
			var button = document.createElement('button');
			button.style.marginTop = '5px';
			buttons.appendChild(document.createTextNode(browser.i18n.getMessage('localDatabase')));
			button.appendChild(document.createTextNode(browser.i18n.getMessage('sendSegmentation')));
			button.addEventListener('click', function() {
				self.sendSegmentsData(false);
			});
			buttons.appendChild(document.createElement('br'));
			buttons.appendChild(button);
		}
		
		segmentationPanel.appendChild(buttons);
		
		// for iframe this will be undefined
		var watchHeader = document.getElementById('info-contents');
		if ( !watchHeader ) {
			// console.log('watch-header not found');
			
			// old desing
			watchHeader = document.getElementById('watch-header');
			if ( !watchHeader ) {
				return;
			}
		}
		
		watchHeader.insertAdjacentElement('afterBegin', segmentationPanel);
		watchHeader.insertAdjacentElement('afterBegin', icon);
		
		this.icon = icon;
		this.segmentationPanel = segmentationPanel;
		
		this.scrollContext = function() {
			var offset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
			if ( offset === 0 ) {
				// self.segmentationPanel.style.display = 'block';
				self.segmentationPanel.classList.toggle('vs-hide-segmentation-panel', false);
			}
			else {
				// self.segmentationPanel.style.display = 'none';
				if ( !self.segmentationPanel.classList.contains('vs-hide-segmentation-panel') ) {
					self.segmentationPanel.classList.toggle('vs-hide-segmentation-panel', true);
				}
			}
		};
		
		if ( this.settings.pinSegmentationTools === false ) {
			document.addEventListener('scroll', this.scrollContext);
			this.scrollContext();
		}
		
		this.modal = document.createElement('div');
		this.modal.id = 'vs-modal'
		var modalContent = document.createElement('div');
		modalContent.id = 'vs-modal-content';
		this.modal.appendChild(modalContent);
		this.segmentationPanel.appendChild(this.modal);
		
		this.messagesModal = document.createElement('div');
		this.messagesModal.id = 'vs-messages-modal'
		// var messagesModalContent = document.createElement('div');
		// messagesModalContent.id = 'vs-messages-modal-content';
		
		var text = document.createTextNode(browser.i18n.getMessage('thankYouMessage'));
		this.messagesModal.appendChild(text);
		
		// this.messagesModal.appendChild(messagesModalContent);
		document.body.appendChild(this.messagesModal);
		
		this.messagesModal.style.display = 'inline-block';
		
		this.rebuilPanelBar();
	},
	
	createSegmentationButton: function(className, type, text, color, backgroundColor, clickCallback) {
		button = document.createElement('button');
		button.classList.add(className);
		button.name = type;
		button.innerHTML = text;
		button.style.color = color;
		button.style.backgroundColor = backgroundColor;
		button.addEventListener('click', clickCallback);
		return button;
	},
	
	toggleSegmentationPanel: function() {
		// console.log('editor::toggleSegmentationPanel()');
		
		if ( this.segmentationPanel.style.display === 'none' ) {
			this.segmentationPanel.style.display = 'block';
			this.icon.classList.toggle('vs-editor-icon-active', true);
			
			if ( this.hasSegmentation === false ) {
				this.settings.showSegmentationTools = true;
			}
		}
		else {
			this.segmentationPanel.style.display = 'none';
			this.icon.classList.toggle('vs-editor-icon-active', false);
			
			if ( this.hasSegmentation === false ) {
				this.settings.showSegmentationTools = false;
			}
		}
		
		if ( this.hasSegmentation === false ) {
			var self = this;
			browser.storage.local.set({
				settings: this.settings
			}, function(result) {
				browser.runtime.sendMessage( {'updateSettings': self.settings } );
			});
		}
		else {
			if ( this.segmentationPanel.style.display === 'block' ) {
				var entries = document.getElementsByClassName('vs-segmentation-panel-bar-entry');
				for ( let i = 1; i < entries.length; i += 2 ) {
					var select = entries[i].getElementsByTagName('select')[0];
					this.adjustSelectWidth(select);
				}
			}
		}
	},
	
	addSegmentFromPreviousToCurrent: function(type) {
		// console.log('editor::addSegmentFromPreviousToCurrent()');
		
		if ( this.segmentsData == null ) {
			this.segmentsData = { timestamps: [], types: [] };
		}
		
		// if no segmentation 
		if ( this.segmentsData.timestamps.length === 0 ) {
			this.segmentsData.timestamps[0] = 0.0;
			this.segmentsData.timestamps[1] = parseFloat(this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2));
			this.segmentsData.types[0] = type;
		}
		else {
			// if it's inside segment 
			var i;
			for ( i = 1; i < this.segmentsData.timestamps.length; ++i ) {
				if ( this.segmentsData.timestamps[i] > this.mediaPlayerWrapper.mediaPlayer.currentTime ) {
					this.segmentsData.timestamps.splice(i, 0, parseFloat(this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2)));
					this.segmentsData.types.splice(i-1, 0, type);
					break;
				}
			}
			
			// if it's outside of segment 
			if ( i === this.segmentsData.timestamps.length ) {
				this.segmentsData.timestamps.push(parseFloat(this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2)));
				this.segmentsData.types.push(type);
			}
		}
		
		// console.log(this.segmentsData.timestamps, this.segmentsData.types);
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, true);
	},
	
	addSegmentFromCurrentToNext: function(type) {
		// console.log('editor::addSegmentFromCurrentToNext()');
		
		if ( this.segmentsData == null ) {
			this.segmentsData = { timestamps: [], types: [] };
		}
		
		// if no segmentation 
		if ( this.segmentsData.timestamps.length === 0 ) {
			this.segmentsData.timestamps[0] = 0.0;
			this.segmentsData.timestamps[1] = parseFloat(this.mediaPlayerWrapper.mediaPlayer.duration.toFixed(2));
			this.segmentsData.types[0] = type;
		}
		else {
			// if it's inside segment 
			var i;
			for ( i = 1; i < this.segmentsData.timestamps.length; ++i ) {
				if ( this.segmentsData.timestamps[i] > this.mediaPlayerWrapper.mediaPlayer.currentTime ) {
					this.segmentsData.timestamps.splice(i, 0, parseFloat(this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2)));
					this.segmentsData.types.splice(i, 0, type);
					break;
				}
			}
			
			// if it's outside of segment 
			if ( i === this.segmentsData.timestamps.length ) {
				this.segmentsData.timestamps.push(parseFloat(this.mediaPlayerWrapper.mediaPlayer.duration.toFixed(2)));
				this.segmentsData.types.push(type);
			}
		}
		
		// console.log(this.segmentsData.timestamps, this.segmentsData.types);
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, true);
	},
	
	rebuilPanelBar: function() {
		var self = this;
		
		var buttons = document.getElementById('vs-segmentation-panel-bar-actions');
		var panelBar = document.getElementById('vs-segmentation-panel-bar');
		if ( this.segmentsData == null || this.segmentsData.types.length === 0 ) {
			buttons.style.display = 'none';
			// panelBar.remove();
			return;
		}
		buttons.style.display = 'inline-block';
		
		while ( panelBar.firstChild ) {
			panelBar.removeChild(panelBar.firstChild);
		}
		
		// start from 0.0 time with only "go" button 
		var container, entry;
		var entry = document.createElement('div');
		entry.classList.add('vs-segmentation-panel-bar-entry');
		
		container = document.createElement('div');
		var timeEntry = document.createElement('input');
		timeEntry.classList.add('vs-segmentation-panel-time-entry');
		timeEntry.value = 0.0;
		timeEntry.addEventListener('keyup', function() {
			self.updateTime(this);
		});
		container.appendChild(timeEntry);
		entry.appendChild(container);
		
		container = document.createElement('div');
		container.classList.add('vs-segmentation-panel-bar-two-buttons');
		var buttonsEntry = document.createElement('button');
		buttonsEntry.appendChild(document.createTextNode(browser.i18n.getMessage('goTo')));
		buttonsEntry.addEventListener('click', function() { 
			self.goTo(this);
		});
		container.appendChild(buttonsEntry);
		entry.appendChild(container);
		panelBar.appendChild(entry);
		
		// loop 
		for ( let i = 1; i < this.segmentsData.timestamps.length; ++i ) {
			// add entry with segment type and button "remove"
			entry = document.createElement('div');
			entry.classList.add('vs-segmentation-panel-bar-entry');
		
			container = document.createElement('div');
			var typeEntry = this.typeSelect.cloneNode(true);
			typeEntry.addEventListener('change', function() { 
				self.adjustSelectWidth(this);
				self.changeSegmentType(this);
			});
			typeEntry.value = this.segmentsData.types[i-1];
			this.adjustSelectWidth(typeEntry);
			// typeEntry.style.backgroundColor = this.settings.segments[typeEntry.options[typeEntry.selectedIndex].value].color;
			container.appendChild(document.createTextNode('\u27F6 '));
			container.appendChild(typeEntry);
			container.appendChild(document.createTextNode(' \u27F6'));
			entry.appendChild(container);
			
			container = document.createElement('div');
			container.classList.add('vs-segmentation-panel-bar-one-button');
			buttonsEntry = document.createElement('button');
			buttonsEntry.appendChild(document.createTextNode(browser.i18n.getMessage('remove')));
			buttonsEntry.addEventListener('click', function() { 
				self.deleteSegment(this);
			});
			container.appendChild(buttonsEntry);
			entry.appendChild(container);
			
			panelBar.appendChild(entry);
			
			// add entry with segment end time and two buttons: "set" current time and "go" to 
			entry = document.createElement('div');
			entry.classList.add('vs-segmentation-panel-bar-entry');
			
			container = document.createElement('div');
			timeEntry = document.createElement('input');
			timeEntry.classList.add('vs-segmentation-panel-time-entry');
			timeEntry.value = parseFloat(this.segmentsData.timestamps[i]).toFixed(2);
			timeEntry.addEventListener('keyup', function() {
				self.updateTime(this);
			});
			container.appendChild(timeEntry);
			entry.appendChild(container);
			
			container = document.createElement('div');
			container.classList.add('vs-segmentation-panel-bar-two-buttons');
			buttonsEntry = document.createElement('button');
			buttonsEntry.appendChild(document.createTextNode(browser.i18n.getMessage('goTo')));
			buttonsEntry.addEventListener('click', function() { 
				self.goTo(this);
			});
			container.appendChild(buttonsEntry);
			buttonsEntry = document.createElement('button');
			buttonsEntry.appendChild(document.createTextNode(browser.i18n.getMessage('currentTime')));
			buttonsEntry.addEventListener('click', function() { 
				self.setCurrentTime(this);
			});
			container.appendChild(buttonsEntry);
			entry.appendChild(container);
			panelBar.appendChild(entry);
		}
	},
	
	goTo: function(caller) {
		var entry = caller.parentNode.parentNode;
		var time = entry.getElementsByTagName('input')[0].value;
		this.mediaPlayerWrapper.mediaPlayer.currentTime = parseFloat(time) + 0.01; // little offset to prevent rewind
	},
	
	setCurrentTime: function(caller) {
		var entry = caller.parentNode.parentNode;
		entry.getElementsByTagName('input')[0].value = this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2);
		
		var index = this.getPositionOfTimeInSegmentsData(caller);
		if ( typeof index !== 'undefined' ) {
			this.segmentsData.timestamps[index] = this.mediaPlayerWrapper.mediaPlayer.currentTime.toFixed(2);
		}
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, true);
	},
	
	updateTime: function(caller) {
		var entry = caller.parentNode.parentNode;
		var index = this.getPositionOfTimeInSegmentsData(caller);
		if ( typeof index !== 'undefined' ) {
			this.segmentsData.timestamps[index] = parseFloat(caller.value).toFixed(2);
		}
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, true);
	},
	
	deleteSegment: function(caller) {
		if ( this.segmentsData.types.length === 1 ) {
			var panelBar = document.getElementById('vs-segmentation-panel-bar');
			while ( panelBar.firstChild ) {
				panelBar.removeChild(panelBar.firstChild);
			}

			this.segmentsData = { timestamps: [], types: [] };
		}
		else {
			var index = this.getPositionOfTypeInSegmentsData(caller);
			if ( typeof index !== 'undefined' ) {
				this.segmentsData.timestamps.splice(index+1, 1);
				this.segmentsData.types.splice(index, 1);
			}
		}
		
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, true);
		this.rebuilPanelBar();
	},
	
	changeSegmentType: function(caller) {
		var index = this.getPositionOfTypeInSegmentsData(caller);
		// console.log(index);
		if ( typeof index !== 'undefined' ) {
			this.segmentsData.types[index] = caller.value;
		}
		
		this.mediaPlayerWrapper.updateSegmentsData(this.segmentsData, false);
	},
	
	adjustSelectWidth: function(caller) {
		var text = caller[caller.selectedIndex].innerHTML;
		this.tempSelect.firstChild.innerHTML = text;
		caller.style.width = this.tempSelect.offsetWidth + 2 + 'px';
	},
	
	getPositionOfTimeInSegmentsData: function(caller) {
		var entry = caller.parentNode.parentNode;
		var panelBar = document.getElementById('vs-segmentation-panel-bar');
		
		var index;
		var entries = panelBar.getElementsByClassName('vs-segmentation-panel-bar-entry');
		for ( let i = 0; i < entries.length; i += 2 ) {
			if ( entries[i] === entry ) {
				return index = Math.ceil(i / 2);
			}
		}
		return index;
	},
	
	getPositionOfTypeInSegmentsData: function(caller) {
		var entry = caller.parentNode.parentNode;
		var panelBar = document.getElementById('vs-segmentation-panel-bar');
		
		var index;
		var entries = panelBar.getElementsByClassName('vs-segmentation-panel-bar-entry');
		for ( let i = 1; i < entries.length; i += 2 ) {
			if ( entries[i] === entry ) {
				return index = Math.ceil(i / 2)-1;
			}
		}
		return index;
	},
	
	/*
	 * Send segments data to database 
	 */
	sendSegmentsData: function(decline) {
		// console.log('editorWrapper::sendSegmentsData()');
		
		var timestamps, types;
		if ( this.segmentsData.types.length > 0 ) {
			timestamps = this.segmentsData.timestamps.slice(1, -1);
			types = this.segmentsData.types;
		}
		else {
			timestamps = [];
			types = 'c';
		}
		
		var self = this;		
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log('response: ', xhr.responseText);
					var jsonResponse = JSON.parse(xhr.responseText);
					
					if ( jsonResponse.message === 'captcha' ) {
						self.modal.style.display = "block";
						
						var iframe = document.createElement("iframe");
						iframe.src = 'https://db.videosegments.org/captcha2.php';
						iframe.width  = 350;
						iframe.height = 500;
						iframe.id = 'vs-captcha-iframe';
						self.modal.childNodes[0].appendChild(iframe);
						
						var messageContext = function(event) { 
							self.checkCaptcha(event, timestamps, types, messageContext, clickContext); 
						}
						
						var clickContext = function(event) { 
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
						if ( jsonResponse.message === 'updated' || jsonResponse.message === 'added' || jsonResponse.message === 'overwritten' ) {
							// setTimeout(function() {
								// window.location.reload();
								// self.updateBadge();
							// }, 100);
							
							self.messagesModal.classList.toggle('vs-messages-modal-dropdown', true);
							setTimeout(function() {
								self.messagesModal.classList.toggle('vs-messages-modal-dropdown', false);
							}, self.settings.popupDurationOnSend*1000);
							self.updateBadge();
						}
						else if ( jsonResponse.message === 'successufully sended' ) {
							self.messagesModal.classList.toggle('vs-messages-modal-dropdown', true);
							setTimeout(function() {
								self.messagesModal.classList.toggle('vs-messages-modal-dropdown', false);
							}, self.settings.popupDurationOnSend*1000);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			}
		};
		
		var post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types;
		if ( decline ) {
			post += '&decline=1';
		}
		
		// console.log(post);
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send(post);
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext)
	{
		if ( event.origin === 'https://db.videosegments.org' ) {
			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/send_auth.php');
			
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					self.modal.style.display = 'none';
					self.modal.childNodes[0].childNodes[0].remove();
					
					if ( xhr.status == 200 ) {
						// console.log('response: ', xhr.responseText);
						
						var jsonResponse = JSON.parse(xhr.responseText);
						if ( jsonResponse.message === 'added' || jsonResponse.message === 'updated' || jsonResponse.message === 'overwritten' ) {
							self.messagesModal.classList.toggle('vs-messages-modal-dropdown', true);
							setTimeout(function() {
								self.messagesModal.classList.toggle('vs-messages-modal-dropdown', false);
							}, self.settings.popupDurationOnSend*1000);
							self.updateBadge();
						}
						else if ( jsonResponse.message === 'successufully sended' ) {
							self.messagesModal.classList.toggle('vs-messages-modal-dropdown', true);
							setTimeout(function() {
								self.messagesModal.classList.toggle('vs-messages-modal-dropdown', false);
							}, self.settings.popupDurationOnSend*1000);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			};
			
			var post = 'domain='+this.domain+'&id='+this.id+'&timestamps='+timestamps+'&types='+types+'&captcha='+event.data;
			// console.log(post);
			
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
			
			window.removeEventListener('message', messageContext);
			window.removeEventListener('click', clickContext);
		}
	},
	
	updateBadge: function() {
		browser.runtime.sendMessage( {'updateBadge': true } );
	},
	
	destroy: function() {
		// this.icon.remove();
		this.segmentationPanel.remove();
		document.removeEventListener('scroll', this.scrollContext);
	},
};