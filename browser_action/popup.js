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

document.getElementById('colorContent').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorIntro').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorAdvertisement').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorCredits').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorInteractive').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorCutscene').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorOfftop').addEventListener('change', function() { updatePreferenceColor(this.id); });
document.getElementById('colorScam').addEventListener('change', function() { updatePreferenceColor(this.id); });

// load user settings 
// cross-browser support
var crossBrowser;
// gecko
if ( (typeof browser != 'undefined') && browser.storage ) {
	crossBrowser = browser;
}
// chromium
else if ( (typeof chrome != 'undefined') && chrome.storage ) {
	crossBrowser = chrome;
}
else {
	console.log('failed: ', crossBrowser);
}

function updatePreferenceValue(preferanceName) 
{
	var preferenceValue = document.getElementById(preferanceName).value;
	var preferance = {};
	preferance[preferanceName] = preferenceValue;
	storage.set(preferance);
	notifyWrapper();
}

function updatePreferenceBool(preferanceName) 
{
	var preferenceValue = document.getElementById(preferanceName).checked;
	var preferance = {};
	preferance[preferanceName] = preferenceValue;
	storage.set(preferance);
	notifyWrapper();
}

function updatePreferenceColor(preferanceName) 
{
	var preferenceValue = document.getElementById(preferanceName).style.backgroundColor;
	var preferance = {};
	preferance[preferanceName] = preferenceValue;
	storage.set(preferance);
	notifyWrapper();
}

function notifyWrapper()
{
	var querying = crossBrowser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			crossBrowser.tabs.sendMessage(tabs[i].id, {});
		}
	});
}

// cross-browser support
var storage;
// firefox
if ( typeof(browser) !== 'undefined' ) {
	storage = browser.storage.local;
}
// chrome
else {
	storage = chrome.storage.sync;
}

function saveOptions() {
	var autoPauseDuration = document.getElementById('autoPauseDuration').value;
	var progressBar = document.getElementById('progressBar').checked;
	
	var content = document.getElementById('segmentContent').checked;
	var intro = document.getElementById('segmentIntro').checked;
	var advertisement = document.getElementById('segmentAdvertisement').checked;
	var credits = document.getElementById('segmentCredits').checked;
	var interactive = document.getElementById('segmentInteractive').checked;
	var cutscene = document.getElementById('segmentCutscene').checked;
	var offtop = document.getElementById('segmentOfftop').checked;
	var scam = document.getElementById('segmentScam').checked;
	
	var colorContent = document.getElementById('segmentContentColorButton').style.backgroundColor;
	var colorIntro = document.getElementById('segmentIntroColorButton').style.backgroundColor;
	var colorAdvertisement = document.getElementById('segmentAdvertisementColorButton').style.backgroundColor;
	var colorCredits = document.getElementById('segmentCreditsColorButton').style.backgroundColor;
	var colorInteractive = document.getElementById('segmentInteractiveColorButton').style.backgroundColor;
	var colorCutscene = document.getElementById('segmentCutsceneColorButton').style.backgroundColor;
	var colorOfftop = document.getElementById('segmentOfftopColorButton').style.backgroundColor;
	var colorScam = document.getElementById('segmentScamColorButton').style.backgroundColor;
	
	storage.set({
		autoPauseDuration: autoPauseDuration, 
		progressBar: progressBar, 
		
		content: content,
		intro: intro,
		advertisement: advertisement,
		credits: credits,
		interactive: interactive,
		cutscene: cutscene,
		offtop: offtop,
		scam: scam,
		
		colorContent: colorContent,
		colorIntro: colorIntro,
		colorAdvertisement:	colorAdvertisement,
		colorCredits: colorCredits,
		colorInteractive: colorInteractive,
		colorCutscene: colorCutscene,
		colorOfftop: colorOfftop,
		colorScam: colorScam,
		
	}, function() {
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
			
		var optionsSaved = document.getElementById('optionsSaved');
		optionsSaved.appendChild(document.createTextNode(translator.i18n.getMessage('optionsSaved')));
		setTimeout(function() {
			optionsSaved.innerHTML = '\xa0';
		}, 2000);
	});
}

function restoreOptions() {
	storage.get({
		/* stop playing until segments are fetched */ 
		autoPauseDuration: 	1,
		
		/* add segments below progress bar*/ 
		progressBar: 		true,
		
		/* segments to play */ 
		content:			true,
		intro:				false,
		advertisement:		false,
		credits:			false,
		interactive:		false,
		cutscene:			false,
		offtop:				false,
		scam:				false,
		
		/* colors of segments */ 
		colorContent:		'#00ff00',
		colorIntro:			'#0000ff',
		colorAdvertisement:	'#ff0000',
		colorCredits:		'#ffff00',
		colorInteractive:	'#00ffff',
		colorCutscene:		'#808080',
		colorOfftop:		'#ff00ff',
		colorScam:			'#008080',
		
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
		
		document.getElementById('colorContent').style.backgroundColor = result.colorContent;
		document.getElementById('colorIntro').style.backgroundColor = result.colorIntro;
		document.getElementById('colorAdvertisement').style.backgroundColor = result.colorAdvertisement;
		document.getElementById('colorCutscene').style.backgroundColor = result.colorCutscene;
		document.getElementById('colorInteractive').style.backgroundColor = result.colorInteractive;
		document.getElementById('colorCredits').style.backgroundColor = result.colorCredits;
		document.getElementById('colorScam').style.backgroundColor = result.colorScam;
		document.getElementById('colorOfftop').style.backgroundColor = result.colorOfftop;
		
		document.getElementById('colorContent').value = getHexRGBColor(result.colorContent).toUpperCase();
		document.getElementById('colorIntro').value = getHexRGBColor(result.colorIntro).toUpperCase();
		document.getElementById('colorAdvertisement').value = getHexRGBColor(result.colorAdvertisement).toUpperCase();
		document.getElementById('colorCutscene').value = getHexRGBColor(result.colorCutscene).toUpperCase();
		document.getElementById('colorInteractive').value = getHexRGBColor(result.colorInteractive).toUpperCase();
		document.getElementById('colorCredits').value = getHexRGBColor(result.colorCredits).toUpperCase();
		document.getElementById('colorScam').value = getHexRGBColor(result.colorScam).toUpperCase();
		document.getElementById('colorOfftop').value = getHexRGBColor(result.colorOfftop).toUpperCase();
		
	});
}

function getHexRGBColor(color)
{
  color = color.replace(/\s/g,"");
  var aRGB = color.match(/^rgb\((\d{1,3}[%]?),(\d{1,3}[%]?),(\d{1,3}[%]?)\)$/i);

  if(aRGB)
  {
    color = '';
    for (var i=1;  i<=3; i++) color += Math.round((aRGB[i][aRGB[i].length-1]=="%"?2.55:1)*parseInt(aRGB[i])).toString(16).replace(/^(.)$/,'0$1');
  }
  else color = color.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3');
  
  return color.substr(1);
}