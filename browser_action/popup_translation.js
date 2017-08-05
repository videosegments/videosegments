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
function translateTextByClass(className) {
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

translateTextById('segmentContentLabel');
translateTextById('segmentIntroLabel');
translateTextById('segmentAdvertisementLabel');
translateTextById('segmentCutsceneLabel');
translateTextById('segmentInteractiveLabel');
translateTextById('segmentCreditsLabel');
translateTextById('segmentScamLabel');
translateTextById('segmentOfftopLabel');

translateTextById('playLabel');
translateTextById('segmentNameLabel');
translateTextById('segmentColorLabel');
translateTextById('segmentFastForwardLabel');
translateTextByClass('segmentFastForwardFirstLabel');
translateTextByClass('segmentFastForwardSecondLabel');
translateTextByClass('segmentFastForwardThirdLabel');
