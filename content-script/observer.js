'use strict';

if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

// class to observe "video" elements 
var Observer = {
	/* MutationObserver element */
	observer: null,
	/* HTML5 collection for "video" tag */
	collection: null,
	/* core object of addon */
	wrapper: null,
	
	start: function(settings) {
		console.log('Observer::start()');
		let self = this;
		
		// to increase performance look into html5 live collection instead of hundreds of mutations 
		// https://stackoverflow.com/a/39332340
		this.collection = document.getElementsByTagName('video');
		this.wrapper = new Object(Wrapper);
		
		// callback for first MutationObserver
		// look for "video" tag on page 
		let onBodyMutation = function(mutations) {
			// console.log('Observer::onBodyMutation()');
			
			// if "video" tag appeared with proper "src" attribute 
			if ( self.collection[0] && self.collection[0].src ) {
				console.log('player found');
				
				// disconnect first 
				self.observer.disconnect();
				
				// connect second 
				self.observer = new MutationObserver(onPlayerMutation);
				self.observer.observe(self.collection[0], { attributes: true, attributeFilter: ['src'] });
				
				// 
				self.wrapper.start(self.collection[0], settings);
			}
		}
		
		// callback for second MutationObserver
		// look only at change of "src" attribute 
		let onPlayerMutation = function(mutations) {
			// console.log('Observer::onPlayerMutation()');
			
			// disconnect second  
			self.observer.disconnect();
			
			// connect first  
			self.observer = new MutationObserver(onBodyMutation);
			self.observer.observe(document.documentElement, { childList: true, subtree: true });
			
			//
			self.wrapper.end();
		}
		
		// start first MutationObserver
		this.observer = new MutationObserver(onBodyMutation);
		this.observer.observe(document.documentElement, { childList: true, subtree: true });
	},
};