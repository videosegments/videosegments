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

translateTextById('editorLabel');
translateTextById('authidLabel');

translateTextById('optionsUpdate');

translateTextById('buttonSave');
