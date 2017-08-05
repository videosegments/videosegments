document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('autoPauseDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('progressBar').addEventListener('change', function() { updatePreferenceBool(this.id); });

document.getElementById('content').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('intro').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('advertisement').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('credits').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('interactive').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('cutscene').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('offtop').addEventListener('change', function() { updatePreferenceBool(this.id); });
document.getElementById('scam').addEventListener('change', function() { updatePreferenceBool(this.id); });

document.getElementById('colorContent').addEventListener('change', function() { updatePreferenceColor(this.id, 'c'); });
document.getElementById('colorIntro').addEventListener('change', function() { updatePreferenceColor(this.id, 'i'); });
document.getElementById('colorAdvertisement').addEventListener('change', function() { updatePreferenceColor(this.id, 'a'); });
document.getElementById('colorCredits').addEventListener('change', function() { updatePreferenceColor(this.id, 'c'); });
document.getElementById('colorInteractive').addEventListener('change', function() { updatePreferenceColor(this.id, 'ia'); });
document.getElementById('colorCutscene').addEventListener('change', function() { updatePreferenceColor(this.id, 'cs'); });
document.getElementById('colorOfftop').addEventListener('change', function() { updatePreferenceColor(this.id, 'o'); });
document.getElementById('colorScam').addEventListener('change', function() { updatePreferenceColor(this.id, 's'); });

document.getElementById('contentDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('introDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('advertisementDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('creditsDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('interactiveDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('cutsceneDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('offtopDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('scamDuration').addEventListener('change', function() { updatePreferenceValue(this.id); });

document.getElementById('contentSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('introSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('advertisementSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('creditsSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('interactiveSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('cutsceneSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('offtopSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('scamSpeed').addEventListener('change', function() { updatePreferenceValue(this.id); });

// load user settings 
// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

function updatePreferenceValue(preferenceName) 
{
	var preferenceValue = document.getElementById(preferenceName).value;
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

function notifyWrapper(preferenceName, preferenceSubname, preferenceValue)
{
	var querying = browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, {preferenceName:preferenceName, preferenceSubname:preferenceSubname, preferenceValue:preferenceValue});
		}
	});
}

function restoreOptions() {
	browser.storage.local.get({
		/* stop playing until segments are fetched */ 
		autoPauseDuration: 	1,
		/* add segments below progress bar*/ 
		progressBar: 			true,
		
		/* segments to play */ 
		content:				true,
		intro:					false,
		advertisement:			false,
		credits:				false,
		interactive:			false,
		cutscene:				false,
		offtop:					false,
		scam:					false,
		
		/* colors of segments */ 
		colorContent:			'#00FF00',
		colorIntro:				'#0000FF',
		colorAdvertisement:		'#FF0000',
		colorCredits:			'#FFFF00',
		colorInteractive:		'#00FFFF',
		colorCutscene:			'#808080',
		colorOfftop:			'#FF00FF',
		colorScam:				'#008080',
			
		/* fast forward settings */ 
		contentDuration:		0.0,
		introDuration:			0.0,
		advertisementDuration:	0.0,
		creditsDuration:		0.0,
		interactiveDuration:	0.0,
		cutsceneDuration:		5.0,
		offtopDuration:			3.0,
		scamDuration:			0.0,
		
		scamSpeed:				500,
		offtopSpeed:			300,
		cutsceneSpeed:			200,
		interactiveSpeed:		500,
		creditsSpeed:			500,
		advertisementSpeed:		500,
		introSpeed:				500,
		contentSpeed:			100,
		
	}, function(result) {
		document.getElementById('autoPauseDuration').value = result.autoPauseDuration;
		document.getElementById('progressBar').checked = result.progressBar;
		
		document.getElementById('content').checked = result.content;
		document.getElementById('intro').checked = result.intro;
		document.getElementById('advertisement').checked = result.advertisement;
		document.getElementById('cutscene').checked = result.cutscene;
		document.getElementById('interactive').checked = result.interactive;
		document.getElementById('credits').checked = result.credits;
		document.getElementById('scam').checked = result.scam;
		document.getElementById('offtop').checked = result.offtop;
		
		document.getElementById('colorContent').jscolor.fromString(result.colorContent.substr(1));
		document.getElementById('colorIntro').jscolor.fromString(result.colorIntro.substr(1));
		document.getElementById('colorAdvertisement').jscolor.fromString(result.colorAdvertisement.substr(1));
		document.getElementById('colorCutscene').jscolor.fromString(result.colorCutscene.substr(1));
		document.getElementById('colorInteractive').jscolor.fromString(result.colorInteractive.substr(1));
		document.getElementById('colorCredits').jscolor.fromString(result.colorCredits.substr(1));
		document.getElementById('colorScam').jscolor.fromString(result.colorScam.substr(1));
		document.getElementById('colorOfftop').jscolor.fromString(result.colorOfftop.substr(1));
		
		document.getElementById('contentDuration').value = result.contentDuration;
		document.getElementById('introDuration').value = result.introDuration;
		document.getElementById('advertisementDuration').value = result.advertisementDuration;
		document.getElementById('creditsDuration').value = result.creditsDuration;
		document.getElementById('interactiveDuration').value = result.interactiveDuration;
		document.getElementById('cutsceneDuration').value = result.cutsceneDuration;
		document.getElementById('offtopDuration').value = result.offtopDuration;
		document.getElementById('scamDuration').value = result.scamDuration;
		
		document.getElementById('contentSpeed').value = result.contentSpeed;
		document.getElementById('introSpeed').value = result.introSpeed;
		document.getElementById('advertisementSpeed').value = result.advertisementSpeed;
		document.getElementById('creditsSpeed').value = result.creditsSpeed;
		document.getElementById('interactiveSpeed').value = result.interactiveSpeed;
		document.getElementById('cutsceneSpeed').value = result.cutsceneSpeed;
		document.getElementById('offtopSpeed').value = result.offtopSpeed;
		document.getElementById('scamSpeed').value = result.scamSpeed;
	});
}
