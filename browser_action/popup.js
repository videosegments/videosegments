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
		var translation = translator.i18n.getMessage('optionsSaved');
		optionsSaved.innerHTML = translation;
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
		
		document.getElementById('segmentContent').checked = result.content;
		document.getElementById('segmentIntro').checked = result.intro;
		document.getElementById('segmentAdvertisement').checked = result.advertisement;
		document.getElementById('segmentCutscene').checked = result.cutscene;
		document.getElementById('segmentInteractive').checked = result.interactive;
		document.getElementById('segmentCredits').checked = result.credits;
		document.getElementById('segmentScam').checked = result.scam;
		document.getElementById('segmentOfftop').checked = result.offtop;
		
		document.getElementById('segmentContentColorButton').style.backgroundColor = result.colorContent;
		document.getElementById('segmentIntroColorButton').style.backgroundColor = result.colorIntro;
		document.getElementById('segmentAdvertisementColorButton').style.backgroundColor = result.colorAdvertisement;
		document.getElementById('segmentCutsceneColorButton').style.backgroundColor = result.colorCutscene;
		document.getElementById('segmentInteractiveColorButton').style.backgroundColor = result.colorInteractive;
		document.getElementById('segmentCreditsColorButton').style.backgroundColor = result.colorCredits;
		document.getElementById('segmentScamColorButton').style.backgroundColor = result.colorScam;
		document.getElementById('segmentOfftopColorButton').style.backgroundColor = result.colorOfftop;
		
		document.getElementById('segmentContentColorButton').value = getHexRGBColor(result.colorContent).toUpperCase();
		document.getElementById('segmentIntroColorButton').value = getHexRGBColor(result.colorIntro).toUpperCase();
		document.getElementById('segmentAdvertisementColorButton').value = getHexRGBColor(result.colorAdvertisement).toUpperCase();
		document.getElementById('segmentCutsceneColorButton').value = getHexRGBColor(result.colorCutscene).toUpperCase();
		document.getElementById('segmentInteractiveColorButton').value = getHexRGBColor(result.colorInteractive).toUpperCase();
		document.getElementById('segmentCreditsColorButton').value = getHexRGBColor(result.colorCredits).toUpperCase();
		document.getElementById('segmentScamColorButton').value = getHexRGBColor(result.colorScam).toUpperCase();
		document.getElementById('segmentOfftopColorButton').value = getHexRGBColor(result.colorOfftop).toUpperCase();
		
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

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('buttonSave').addEventListener('click', saveOptions);