// cross browser support
var translator;
// firefox
if ( typeof browser !== 'undefined' ) {
	translator = browser;
}
// chrome
else {
	translator = chrome;
}

/* there must be a proper way to do it */
function translateTextById(id) {
	var currentElement = document.getElementById(id);
	if ( currentElement ) {
		currentElement.appendChild(document.createTextNode(translator.i18n.getMessage(id)));
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
translateTextById('segmentContentLabel');
translateTextById('segmentIntroLabel');
translateTextById('segmentAdvertisementLabel');
translateTextById('segmentCutsceneLabel');
translateTextById('segmentInteractiveLabel');
translateTextById('segmentCreditsLabel');
translateTextById('segmentScamLabel');
translateTextById('segmentOfftopLabel');

translateTextById('settingsSegmentsColors');
translateTextById('segmentContentColor');
translateTextById('segmentIntroColor');
translateTextById('segmentAdvertisementColor');
translateTextById('segmentCutsceneColor');
translateTextById('segmentInteractiveColor');
translateTextById('segmentCreditsColor');
translateTextById('segmentScamColor');
translateTextById('segmentOfftopColor');

translateTextById('optionsUpdate');
