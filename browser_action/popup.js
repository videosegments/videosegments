document.addEventListener('DOMContentLoaded', restoreOptions);

document.getElementById('autoPauseDuration').addEventListener('change', 	function() { updatePreferenceValue(this.id); });
document.getElementById('progressBar').addEventListener('change', 			function() { updatePreferenceBool(this.id); });

document.getElementById('content').addEventListener('change', 				function() { updatePreferenceBool(this.id); });
document.getElementById('adContent').addEventListener('change', 			function() { updatePreferenceBool(this.id); });
document.getElementById('intro').addEventListener('change', 				function() { updatePreferenceBool(this.id); });
document.getElementById('advertisement').addEventListener('change', 		function() { updatePreferenceBool(this.id); });
document.getElementById('credits').addEventListener('change', 				function() { updatePreferenceBool(this.id); });
document.getElementById('interactive').addEventListener('change', 			function() { updatePreferenceBool(this.id); });
document.getElementById('cutscene').addEventListener('change', 				function() { updatePreferenceBool(this.id); });
document.getElementById('offtop').addEventListener('change', 				function() { updatePreferenceBool(this.id); });
document.getElementById('scam').addEventListener('change', 					function() { updatePreferenceBool(this.id); });

document.getElementById('colorContent').addEventListener('change', 			function() { updatePreferenceColor(this.id, 'c'); });
document.getElementById('colorAdContent').addEventListener('change', 		function() { updatePreferenceColor(this.id, 'ac'); });
document.getElementById('colorIntro').addEventListener('change', 			function() { updatePreferenceColor(this.id, 'i'); });
document.getElementById('colorAdvertisement').addEventListener('change', 	function() { updatePreferenceColor(this.id, 'a'); });
document.getElementById('colorCredits').addEventListener('change', 			function() { updatePreferenceColor(this.id, 'c'); });
document.getElementById('colorInteractive').addEventListener('change', 		function() { updatePreferenceColor(this.id, 'ia'); });
document.getElementById('colorCutscene').addEventListener('change', 		function() { updatePreferenceColor(this.id, 'cs'); });
document.getElementById('colorOfftop').addEventListener('change', 			function() { updatePreferenceColor(this.id, 'o'); });
document.getElementById('colorScam').addEventListener('change', 			function() { updatePreferenceColor(this.id, 's'); });

document.getElementById('contentDuration').addEventListener('change', 		function() { updatePreferenceDuration(this.id, 'c'); });
document.getElementById('adContentDuration').addEventListener('change', 	function() { updatePreferenceDuration(this.id, 'ac'); });
document.getElementById('introDuration').addEventListener('change', 		function() { updatePreferenceDuration(this.id, 'i'); });
document.getElementById('advertisementDuration').addEventListener('change', function() { updatePreferenceDuration(this.id, 'a'); });
document.getElementById('creditsDuration').addEventListener('change', 		function() { updatePreferenceDuration(this.id, 'c'); });
document.getElementById('interactiveDuration').addEventListener('change', 	function() { updatePreferenceDuration(this.id, 'ia'); });
document.getElementById('cutsceneDuration').addEventListener('change', 		function() { updatePreferenceDuration(this.id, 'cs'); });
document.getElementById('offtopDuration').addEventListener('change', 		function() { updatePreferenceDuration(this.id, 'o'); });
document.getElementById('scamDuration').addEventListener('change', 			function() { updatePreferenceDuration(this.id, 's'); });

document.getElementById('contentSpeed').addEventListener('change', 			function() { updatePreferenceSpeed(this.id, 'c'); });
document.getElementById('adContentSpeed').addEventListener('change', 		function() { updatePreferenceSpeed(this.id, 'ac'); });
document.getElementById('introSpeed').addEventListener('change', 			function() { updatePreferenceSpeed(this.id, 'i'); });
document.getElementById('advertisementSpeed').addEventListener('change', 	function() { updatePreferenceSpeed(this.id, 'a'); });
document.getElementById('creditsSpeed').addEventListener('change', 			function() { updatePreferenceSpeed(this.id, 'c'); });
document.getElementById('interactiveSpeed').addEventListener('change', 		function() { updatePreferenceSpeed(this.id, 'ia'); });
document.getElementById('cutsceneSpeed').addEventListener('change', 		function() { updatePreferenceSpeed(this.id, 'cs'); });
document.getElementById('offtopSpeed').addEventListener('change', 			function() { updatePreferenceSpeed(this.id, 'o'); });
document.getElementById('scamSpeed').addEventListener('change', 			function() { updatePreferenceSpeed(this.id, 's'); });

// load user settings 
// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

function updatePreferenceValue(preferenceName) 
{
	var preferenceValue = parseFloat(document.getElementById(preferenceName).value);
	var preference = {};
	preference[preferenceName] = preferenceValue;
	browser.storage.local.set(preference);
	notifyWrapper(preferenceName, null, preferenceValue);
}

function updatePreferenceBool(preferenceName) 
{
	var preferenceValue = document.getElementById(preferenceName).checked;
	var preference = {};
	preference[preferenceName] = preferenceValue;
	browser.storage.local.set(preference);
	notifyWrapper(preferenceName, null, preferenceValue);
}

function updatePreferenceColor(preferenceName, preferenceCode) 
{
	var preferenceValue = document.getElementById(preferenceName).jscolor.toHEXString();
	var preference = {};
	preference[preferenceName] = preferenceValue;
	browser.storage.local.set(preference);
	notifyWrapper('segmentsColors', preferenceCode, preferenceValue);
}

function updatePreferenceDuration(preferenceName, preferenceCode) 
{
	var preferenceValue = parseFloat(document.getElementById(preferenceName).value);
	var preference = {};
	preference[preferenceName] = preferenceValue;
	browser.storage.local.set(preference);
	notifyWrapper('segmentsDuration', preferenceCode, preferenceValue);
}

function updatePreferenceSpeed(preferenceName, preferenceCode) 
{
	var preferenceValue = parseInt(document.getElementById(preferenceName).value);
	var preference = {};
	preference[preferenceName] = preferenceValue;
	browser.storage.local.set(preference);
	notifyWrapper('segmentsSpeed', preferenceCode, preferenceValue / 100.0);
}

function notifyWrapper(preferenceName, preferenceSubname, preferenceValue)
{
	var querying = browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, {preferenceName:preferenceName, preferenceSubname:preferenceSubname, preferenceValue:preferenceValue});
		}
	});
}

function switchSettings()
{
	var p = document.getElementById('slider-body');
	if ( p.classList.contains('slide-animation-right') ) {
		p.classList.add('slide-animation-left');
		p.classList.remove("slide-animation-right");
		this.innerHTML = browser.i18n.getMessage('switchSettings1Label');
	}
	else {
		p.classList.add('slide-animation-right');
		p.classList.remove("slide-animation-left");
		this.innerHTML = browser.i18n.getMessage('switchSettings2Label');
	}
}

function restoreOptions() {
	document.getElementById('switchSettings').addEventListener('click', switchSettings);
	var inputs = document.getElementsByClassName('slide')[1].getElementsByTagName('input');
	for ( let i = 0; i < inputs.length; ++i ) {
		if ( inputs[i].type === 'text' ) {
			inputs[i].addEventListener('click', function() { this.select() });
		}
	}
	
	browser.storage.local.get({
		/* stop playing until segments are fetched */ 
		autoPauseDuration: 	1,
		/* add segments below progress bar*/ 
		progressBar: 			true,
		
		/* segments to play */ 
		content:				true,
		adContent:				true,
		intro:					false,
		advertisement:			false,
		credits:				false,
		interactive:			false,
		cutscene:				false,
		offtop:					false,
		scam:					false,
		
		/* colors of segments */ 
		colorContent:			'#00FF00',
		colorAdContent:			'#008800',
		colorIntro:				'#0000FF',
		colorAdvertisement:		'#FF0000',
		colorCredits:			'#FFFF00',
		colorInteractive:		'#00FFFF',
		colorCutscene:			'#808080',
		colorOfftop:			'#FF00FF',
		colorScam:				'#008080',
			
		/* fast forward settings */ 
		contentDuration:		0.0,
		adContentDuration:		0.0,
		introDuration:			0.0,
		advertisementDuration:	0.0,
		creditsDuration:		0.0,
		interactiveDuration:	0.0,
		cutsceneDuration:		0.0,
		offtopDuration:			0.0,
		scamDuration:			0.0,
		
		contentSpeed:			100,
		adContentSpeed:			100,
		introSpeed:				500,
		advertisementSpeed:		500,
		creditsSpeed:			500,
		interactiveSpeed:		500,
		cutsceneSpeed:			200,
		offtopSpeed:			300,
		scamSpeed:				500,
		
	}, function(result) {
		document.getElementById('autoPauseDuration').value = result.autoPauseDuration;
		document.getElementById('progressBar').checked = result.progressBar;
		
		document.getElementById('content').checked = result.content;
		document.getElementById('adContent').checked = result.adContent;
		document.getElementById('intro').checked = result.intro;
		document.getElementById('advertisement').checked = result.advertisement;
		document.getElementById('cutscene').checked = result.cutscene;
		document.getElementById('interactive').checked = result.interactive;
		document.getElementById('credits').checked = result.credits;
		document.getElementById('scam').checked = result.scam;
		document.getElementById('offtop').checked = result.offtop;
		
		document.getElementById('colorContent').jscolor.fromString(result.colorContent.substr(1));
		document.getElementById('colorAdContent').jscolor.fromString(result.colorAdContent.substr(1));
		document.getElementById('colorIntro').jscolor.fromString(result.colorIntro.substr(1));
		document.getElementById('colorAdvertisement').jscolor.fromString(result.colorAdvertisement.substr(1));
		document.getElementById('colorCutscene').jscolor.fromString(result.colorCutscene.substr(1));
		document.getElementById('colorInteractive').jscolor.fromString(result.colorInteractive.substr(1));
		document.getElementById('colorCredits').jscolor.fromString(result.colorCredits.substr(1));
		document.getElementById('colorScam').jscolor.fromString(result.colorScam.substr(1));
		document.getElementById('colorOfftop').jscolor.fromString(result.colorOfftop.substr(1));
		
		document.getElementById('contentDuration').value = result.contentDuration;
		document.getElementById('adContentDuration').value = result.adContentDuration;
		document.getElementById('introDuration').value = result.introDuration;
		document.getElementById('advertisementDuration').value = result.advertisementDuration;
		document.getElementById('creditsDuration').value = result.creditsDuration;
		document.getElementById('interactiveDuration').value = result.interactiveDuration;
		document.getElementById('cutsceneDuration').value = result.cutsceneDuration;
		document.getElementById('offtopDuration').value = result.offtopDuration;
		document.getElementById('scamDuration').value = result.scamDuration;
		
		document.getElementById('contentSpeed').value = result.contentSpeed;
		document.getElementById('adContentSpeed').value = result.contentSpeed;
		document.getElementById('introSpeed').value = result.introSpeed;
		document.getElementById('advertisementSpeed').value = result.advertisementSpeed;
		document.getElementById('creditsSpeed').value = result.creditsSpeed;
		document.getElementById('interactiveSpeed').value = result.interactiveSpeed;
		document.getElementById('cutsceneSpeed').value = result.cutsceneSpeed;
		document.getElementById('offtopSpeed').value = result.offtopSpeed;
		document.getElementById('scamSpeed').value = result.scamSpeed;
	});
}
