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
		this.showPopupDown(document.getElementById('vs-compact-editor'), 'This is segmentation panel', function() {
		self.showPopupDown(document.getElementById('vs-compact-editor-header-move'), 'You can move panel to any place you want using this icon. Just press and hold your left mouse button and window will follow your mouse', function() {
		self.showPopupDown(document.getElementById('vs-compact-editor-header-info'), 'This button is used to re-open this tutorial', function() {
		self.showPopupDown(document.getElementById('vs-compact-editor-opacity'), 'This slider used to change opacity when mouse is outside of panel. If you lose panel you can always reset position and transparency using "reset" button in options', function() {
		self.showPopupDown(document.getElementById('vs-compact-editor-header-minimize'), 'This button is used to minimize panel', function() {
		self.showPopupDown(document.getElementById('vs-compact-editor-header-close'), 'You can also close panel. To open it, check "Always show segmentation panel" in options page', function() {
		self.showPopupUp(document.getElementById('vs-segment-pl'), 'This button will start skip from current time (next segment will be skip) to end of video or current segment', function() {
		self.showPopupUp(document.getElementById('vs-segment-sk'), 'This button will end skip (next segment will be play)', function() {
		
		let p;
		let entries = document.getElementsByClassName('vs-segment-entry');
		if ( entries.length === 0 ) {
			p = self.showIdlePopup(document.getElementById('vs-compact-editor-buttons'), 'Press one of buttons to continue tutorial');
		}
		
		let t = setInterval(function() {
			if ( entries.length !== 0 ) {
				clearInterval(t);
				if ( typeof p !== 'undefined' ) p.destroy();
				
					self.showPopupDown(entries[0].getElementsByClassName('fa-times')[0], 'Use this icon to delete segment', function() {
					self.showPopupDown(entries[0].getElementsByClassName('fa-forward')[0], 'Use this icon to rewind video to end of segment', function() {
					self.showPopupDown(entries[0].getElementsByClassName('vs-segment-end-time')[0], 'IMPORTANT! Here you can use keyboard arrows! Click with your mouse and use left-right to move selection and up-down to add/substract. Moreover you can set accuracy up to 10ms if you press right arrow few times', function() {
					self.showPopupDown(document.getElementById('vs-segmentation-origin'), 'This is origin of segmentation', function() {
					
					let parent, msg;
					if ( typeof document.getElementById('vs-share-segmentation') !== 'undefined' ) {
						parent = document.getElementById('vs-share-segmentation');
						msg = 'IMPORTANT! This button will send your segmentation to manual review. After review everyone will see your segmentation!';
					}
					else {
						parent = document.getElementById('vs-segmentation-origin');
						msg = 'IMPORTANT! In videos without segmentation "Share" button will send your segmentation to manual review. After review everyone will see your segmentation!';
					}
					self.showPopupDown(parent, msg, function() {
					
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
	
	showPopupDown: function(element, message, callback) {
		let popup = document.createElement('div');
		popup.classList.add('vs-popper-body');
		popup.classList.add('vs-arrow-down');
		popup.appendChild(document.createTextNode(message));
		
		let next = document.createElement('button');
		next.appendChild(document.createTextNode('next'));
		
		let container = document.createElement('div');
		container.appendChild(next);
		popup.appendChild(container);
		
		let p = new Popper(element, popup, {placement: 'top'});
		document.body.appendChild(popup);
		
		next.addEventListener('click', function() {
			this.parentNode.parentNode.remove();
			p.destroy();
			callback();
		});
	},
	
	showPopupUp: function(element, message, callback) {
		let popup = document.createElement('div');
		popup.classList.add('vs-popper-body');
		popup.classList.add('vs-arrow-up');
		popup.appendChild(document.createTextNode(message));
		
		let next = document.createElement('button');
		next.appendChild(document.createTextNode('next'));
		
		let container = document.createElement('div');
		container.appendChild(next);
		popup.appendChild(container);
		
		let p = new Popper(element, popup, {placement: 'bottom'});
		document.body.appendChild(popup);
		
		next.addEventListener('click', function() {
			this.parentNode.parentNode.remove();
			p.destroy();
			callback();
		});
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
		
		element.addEventListener('click', function() {
			this.parentNode.parentNode.remove();
			p.destroy();
			
			self.settings.tutorial = 1;
			browser.storage.local.set({ settings: self.settings });
		});
		
		let p = new Popper(document.getElementById('vs-compact-editor'), popup, {placement: 'top'});
		document.body.appendChild(popup);
	},
};