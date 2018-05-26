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

var Tutorial = {
	settings: null,
	wrapper: null,
	editor: null,
	
	start: function(settings) {
		log('Tutorial::start()');
		let self = this;
		
		this.settings = settings;
		
		log(document.getElementById('vs-share-segmentation') !== null);
		
		// pure callback hell. yay! some of indents will be omitted for sake of sanity
		this.showPopup(document.getElementById('vs-compact-editor'), 'Quick tutorial.', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-move'), 'Drag&move panel.', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-pin-fullscreen'), 'Enable panel in fullscreen mode. Panel position and opacity in fullscreen and outside are independent. Click again to disable.', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-opacity'), 'Panel opacity when mouse outside.<br>Can be reset in the settings.', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-minimize'), 'Minimize panel.', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-close'), 'Close panel.<br>Can be reset in the settings.', 'top', function() {
		self.showPopup(document.getElementById('vs-segment-pl'), 'Add autoskip for next time starting from current time.', 'bottom', function() {
		self.showPopup(document.getElementById('vs-segment-sk'), 'End autoskip for next time from current time.<br>Can be used without start if needed (to add skip at video start).', 'bottom', function() {
		
		let p;
		let entries = document.getElementsByClassName('vs-segment-entry');
		if ( entries.length === 0 ) {
			p = self.showIdlePopup(document.getElementById('vs-compact-editor-buttons'), 'Press one of buttons to continue tutorial...');
		}
		
		let t = setInterval(function() {
			if ( entries.length !== 0 ) {
				clearInterval(t);
				if ( typeof p !== 'undefined' ) p.destroy();
				
					self.showPopup(entries[0].getElementsByClassName('fa-times')[0], 'Delete segment.', 'top', function() {
					self.showPopup(entries[0].getElementsByClassName('fa-forward')[0], 'Rewind to segment end.', 'top', function() {
					self.showPopup(entries[0].getElementsByClassName('vs-segment-end-time')[0], 'Here you can use keyboards arrows.<br>Up-down to add/substract one.<br>Left-right to move selection.', 'top', function() {
					self.showPopup(document.getElementById('vs-segmentation-origin'), 'Origin of segmentation.', 'bottom', function() {
					
					let parent, msg;
					if ( document.getElementById('vs-share-segmentation') !== null ) {
						parent = document.getElementById('vs-share-segmentation');
						msg = 'Send segmentation to manual review. After review everyone will see your segmentation.';
					}
					else {
						parent = document.getElementById('vs-segmentation-origin');
						msg = 'In videos without segmentation "Share" button will send your segmentation to manual review. After review everyone will see your segmentation.';
					}
					self.showPopup(parent, msg, 'bottom', function() {
					
					self.showFinalPopup();
						
					})
					})
					})
					})
					});
		
			}
		}, 100);
		
		})
		})
		})
		})
		})
		})
		})
		});
		// end of pure callback hell. hurray!
	},
	
	showPopup: function(element, message, location, callback) {
		let popup = document.createElement('div');
		popup.classList.add('vs-popper-body');
		
		let parser = new DOMParser()
		popup.appendChild(parser.parseFromString(message, 'text/html').firstChild);
		
		let next = document.createElement('button');
		next.appendChild(document.createTextNode('next'));
		
		let container = document.createElement('div');
		container.appendChild(next);
		popup.appendChild(container);
		
		let p = new Popper(element, popup, {placement: location, flip: {behavior: ['bottom', 'top']}});
		document.body.appendChild(popup);
		
		let owner = document.getElementById('vs-compact-editor');
		let opacity = '1.0';
		popup.addEventListener('mouseover', function() {
			if ( owner.style.opacity != '1.0' ) {
				opacity = owner.style.opacity;
			}
			owner.style.opacity = '1.0';
		});
		popup.addEventListener('mouseout', function() {
			owner.style.opacity = opacity;
		});
		
		next.addEventListener('click', function() {
			owner.removeEventListener('mousedown', startDrag); 
			this.parentNode.parentNode.remove();
			owner.style.opacity = opacity;
			p.destroy();
			callback();
		});
		
		owner.addEventListener('mousedown', startDrag); 
		document.addEventListener('mousemove', drag);
		document.addEventListener('mouseup', endDrag);
		
		function startDrag() {
			document.addEventListener('mousemove', drag);
			document.addEventListener('mouseup', endDrag);
		}
		
		function drag () {
			p.update();
		}
		
		function endDrag() {
			document.removeEventListener('mousemove', drag);
			document.removeEventListener('mouseup', endDrag);
		}
	},
	
	showIdlePopup: function(element, message, arrow) {
		let popup = document.createElement('div');
		popup.id = 'vs-idle-popper';
		popup.classList.add('vs-popper-body');
		popup.classList.add('vs-arrow-up');
		popup.appendChild(document.createTextNode(message));
		
		let p = new Popper(element, popup, {placement: 'bottom'});
		document.body.appendChild(popup);
		
		return p;
	},
	
	showFinalPopup: function() {
		let self = this;
		
		let popup = document.createElement('div');
		popup.classList.add('vs-popper-body');
		popup.classList.add('vs-arrow-down');
		popup.appendChild(document.createTextNode('That\'s it. I hope you enjoy this addon! Also check out:'));
		
		let container, element, link;
		
		container = document.createElement('div');
		element = document.createElement('div');
		link = document.createElement('a');
		link.href = 'https://videosegments.org/examples.php';
		link.target = '_blank';
		link.appendChild(document.createTextNode('Some of already segmented videos'));
		element.appendChild(link);
		container.appendChild(element);
		popup.appendChild(container);
		
		element = document.createElement('div');
		link = document.createElement('a');
		link.href = 'https://www.facebook.com/videosegments/';
		link.target = '_blank';
		link.appendChild(document.createTextNode('Facebook (dev blog)'));
		element.appendChild(link);
		container.appendChild(element);
		popup.appendChild(container);
		
		container = document.createElement('div');
		element = document.createElement('button');
		element.appendChild(document.createTextNode('end'));
		container.appendChild(element);
		popup.appendChild(container);
		
		let owner = document.getElementById('vs-compact-editor');
		element.addEventListener('click', function() {
			owner.removeEventListener('mousedown', startDrag); 
			this.parentNode.parentNode.remove();
			p.destroy();
			
			self.settings.tutorial = 1;
			browser.storage.local.set({ settings: self.settings });
		});
		
		let p = new Popper(document.getElementById('vs-compact-editor'), popup, {placement: 'top'});
		document.body.appendChild(popup);
		
		owner.addEventListener('mousedown', startDrag); 
		document.addEventListener('mousemove', drag);
		document.addEventListener('mouseup', endDrag);
		
		function startDrag() {
			document.addEventListener('mousemove', drag);
			document.addEventListener('mouseup', endDrag);
		}
		
		function drag () {
			p.update();
		}
		
		function endDrag() {
			document.removeEventListener('mousemove', drag);
			document.removeEventListener('mouseup', endDrag);
		}
	},
};