// cross browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

/* there must be a proper way to do it */
function translateTextById(id) {
	var currentElement = document.getElementById(id);
	if ( currentElement ) {
		currentElement.appendChild(document.createTextNode(browser.i18n.getMessage(id)));
	}
}
function translateTextByClassName(className) {
	var elements = document.getElementsByClassName(className);
	for ( let i = 0; i < elements.length; ++i ) {
		elements[i].appendChild(document.createTextNode(browser.i18n.getMessage(className)));
	}
}

// function translateButtonById(id) {
	// var currentElement = document.getElementById(id);
	// currentElement.value = browser.i18n.getMessage(id);
// }

translateTextById('extensionName');

translateTextById('settingsGlobal');
translateTextById('autoPauseFirstLabel');
translateTextById('autoPauseSecondLabel');
translateTextById('progressBarLabel');

translateTextByClassName('segmentContentLabel');
translateTextByClassName('segmentIntroLabel');
translateTextByClassName('segmentAdvertisementLabel');
translateTextByClassName('segmentCutsceneLabel');
translateTextByClassName('segmentInteractiveLabel');
translateTextByClassName('segmentCreditsLabel');
translateTextByClassName('segmentScamLabel');
translateTextByClassName('segmentOfftopLabel');

translateTextById('segmentsToPlayLabel');
translateTextById('segmentsToFastForwardLabel');

translateTextByClassName('segmentNameLabel');
translateTextById('segmentColorLabel');
translateTextById('segmentLengthLabel');
translateTextById('segmentSpeedLabel');

	
var tooltips = document.querySelectorAll('[data-tip]');
var t = browser.i18n.getMessage('speedWarningLabel')
for ( i in tooltips ) {
	// throws error but works
	try {
		tooltips[i].dataset.tip = t;
	}
	catch (e) {
		
	}
}