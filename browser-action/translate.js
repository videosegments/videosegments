// crossbrowser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

document.addEventListener('DOMContentLoaded', function() {
	// get all elements to translate
	var elements = document.getElementsByClassName('translate-me');
	for ( var i = 0; i < elements.length; ++i ) {
		var element = elements[i];
		// get translation
		var text = document.createTextNode(browser.i18n.getMessage(element.innerHTML));
		// remove previous text 
		element.removeChild(element.firstChild);
		// add translation
		element.appendChild(text);
	}
});