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
		
		// pure callback hell. yay! some of indents will be omitted for sake of sanity
		this.showPopup(document.getElementById('vs-compact-editor'), 'This is segmentation panel', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-move'), 'You can move panel to any place you want using this icon. Just press and hold your left mouse button and window will follow your mouse', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-info'), 'This button is used to re-open this tutorial', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-opacity'), 'This slider used to change opacity when mouse is outside of panel. If you lose panel you can always reset position and transparency using "reset" button in options', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-minimize'), 'This button is used to minimize panel', 'top', function() {
		self.showPopup(document.getElementById('vs-compact-editor-header-close'), 'You can also close panel. To open it, check "Always show segmentation panel" in options page', 'top', function() {
		self.showPopup(document.getElementById('vs-segment-pl'), 'This button will start skip from current time (next segment will be skip) to end of video or current segment', 'bottom', function() {
		self.showPopup(document.getElementById('vs-segment-sk'), 'This button will end skip (next segment will be play)', 'bottom', function() {
		
		let p;
		let entries = document.getElementsByClassName('vs-segment-entry');
		if ( entries.length === 0 ) {
			p = self.showIdlePopup(document.getElementById('vs-compact-editor-buttons'), 'Press one of buttons to continue tutorial');
		}
		
		let t = setInterval(function() {
			if ( entries.length !== 0 ) {
				clearInterval(t);
				if ( typeof p !== 'undefined' ) p.destroy();
				
					self.showPopup(entries[0].getElementsByClassName('fa-times')[0], 'Use this icon to delete segment', 'top', function() {
					self.showPopup(entries[0].getElementsByClassName('fa-forward')[0], 'Use this icon to rewind video to end of segment', 'top', function() {
					self.showPopup(entries[0].getElementsByClassName('vs-segment-end-time')[0], 'IMPORTANT! Here you can use keyboard arrows! Click with your mouse and use left-right to move selection and up-down to add/substract. Moreover you can set accuracy up to 10ms if you press right arrow few times', 'top', function() {
					self.showPopup(document.getElementById('vs-segmentation-origin'), 'This is origin of segmentation', 'bottom', function() {
					
					let parent, msg;
					if ( typeof document.getElementById('vs-share-segmentation') !== 'undefined' ) {
						parent = document.getElementById('vs-share-segmentation');
						msg = 'IMPORTANT! This button will send your segmentation to manual review. After review everyone will see your segmentation!';
					}
					else {
						parent = document.getElementById('vs-segmentation-origin');
						msg = 'IMPORTANT! In videos without segmentation "Share" button will send your segmentation to manual review. After review everyone will see your segmentation!';
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
		popup.appendChild(document.createTextNode(message));
		
		let next = document.createElement('button');
		next.appendChild(document.createTextNode('next'));
		
		let container = document.createElement('div');
		container.appendChild(next);
		popup.appendChild(container);
		
		let p = new Popper(element, popup, {placement: location, flip: {behavior: ['bottom', 'top']}});
		document.body.appendChild(popup);
		
		let owner = document.getElementById('vs-compact-editor');
		next.addEventListener('click', function() {
			owner.removeEventListener('mousedown', startDrag); 
			this.parentNode.parentNode.remove();
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
		popup.appendChild(document.createTextNode('That\'s it. I hope you enjoy this addon! If you like it, please leave review and share with friends. If you have any questions or suggestions, feel free to contant:'));
		
		let container, element, link;
		
		container = document.createElement('div');
		element = document.createElement('div');
		element.appendChild(document.createTextNode('email: videosegmentsdev@gmail.com'));
		container.appendChild(element);
		
		element = document.createElement('div');
		link = document.createElement('a');
		link.href = 'https://github.com/videosegments/videosegments';
		link.appendChild(document.createTextNode('Github'));
		element.appendChild(link);
		container.appendChild(element);
		popup.appendChild(container);
		
		element = document.createElement('div');
		link = document.createElement('a');
		link.href = 'https://www.facebook.com/videosegments/';
		link.appendChild(document.createTextNode('Facebook'));
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