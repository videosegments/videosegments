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

// translateTextById('settingsSegmentsBarPosition');
// translateTextById('segmentsBarPositionWatchHeaderLabel');
// translateTextById('segmentsBarPositionCommentsLabel');
// translateTextById('segmentsBarPositionNoneLabel');

translateTextById('settingsSegmentsToPlay');
translateTextByClass('segmentContentLabel');
translateTextByClass('segmentIntroLabel');
translateTextByClass('segmentAdvertisementLabel');
translateTextByClass('segmentCutsceneLabel');
translateTextByClass('segmentInteractiveLabel');
translateTextByClass('segmentCreditsLabel');
translateTextByClass('segmentScamLabel');
translateTextByClass('segmentOfftopLabel');

// translateTextById('optionsUpdate');
