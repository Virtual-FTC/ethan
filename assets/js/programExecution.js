//---TempVariable will be replaced by vars.js---
var currentProjectName = "program";
var javaProjectName = "program";

var lastSaved = null;

//---Sending Data to Unity---
const abortedMsg = "aborted";
localStorage.setItem('startMatch', false);
localStorage.setItem('stopMatch', false);
localStorage.setItem('resetField', false);
localStorage.setItem('playMode', "Autonomous");

//---Prompts---
var overlayReturned = null;

//Overrides Window.Prompt for Variable Renaming
window.prompt = function overlayPrompt(message, placeholder) {
	overlayReturned = null;
	overlay(true, (message == "New variable name:" ? 2 : 3));
	return new Promise(function (resolve, reject) {
		var returnChecker = setInterval(function () {
			if (overlayReturned == -1) {
				reject();
				clearInterval(returnChecker);
			} else if (overlayReturned != null) {
				resolve(overlayReturned);
				clearInterval(returnChecker);
			}
		}, 250);
	});
}

//---Gamepad Connections---
window.addEventListener("gamepadconnected", (event) => {
	if (event.gamepad.index < 2) {
		document.getElementById("telemetryText").innerText = 'New Controller: "' + event.gamepad.id + '".\nSet Controller to gamepad' + (event.gamepad.index + 1) + ".";
	}
});

window.addEventListener("gamepaddisconnected", (event) => {
	if (event.gamepad.index < 2) {
		document.getElementById("telemetryText").innerText = 'Controller disconnected: "' + event.gamepad.id + '".\nGamepad' + (event.gamepad.index + 1) + " lost.";
	}
});

//---Functions for OnBotJava---
function getSelectedRange() {
	return {
		from: editor.getCursor(true),
		to: editor.getCursor(false)
	};
}

function autoFormatSelection() {
	var cursor = editor.getCursor();
	CodeMirror.commands["selectAll"](editor);
	var range = getSelectedRange();
	editor.autoFormatRange(range.from, range.to);
	editor.setCursor(cursor);
}

//---Switching between Blocks and Java---
function switchToBlocks() {
	document.getElementById('blocksBttn').classList.add('button1Selected');
	document.getElementById('javaBttn').classList.remove('button1Selected');

	document.getElementById('blocklyDiv').hidden = false;
	document.getElementById('onBotJavaDiv').hidden = true;
	isUsingBlocks = true;
	if (currentProjectName != "program")
		try {
			lastSaved = Blockly.Xml.textToDom(localStorage.getItem("Program Name: " + currentProjectName))
		}
		catch {
			lastSaved = null;
		}
	else
		lastSaved = null;
	prepareUiToLoadProgram();
	if (Blockly.mainWorkspace)
		Blockly.svgResize(Blockly.mainWorkspace);
}

function switchToOnBotJava() {
	document.getElementById('javaBttn').classList.add('button1Selected');
	document.getElementById('blocksBttn').classList.remove('button1Selected');

	resetProgramExecution();
	document.getElementById('blocklyDiv').hidden = true;
	document.getElementById('onBotJavaDiv').hidden = false;
	isUsingBlocks = false;
	if (javaProjectName != "program")
		lastSaved = localStorage.getItem("Java Program Name: " + javaProjectName);
	else
		lastSaved = null;
	prepareUiToLoadProgram();
}

var editor;

function setUpOnBotJava(javaCode) {
	editor = CodeMirror(function (elt) {
		document.getElementById('onBotJavaDiv').replaceChild(elt, document.getElementById('onBotJavaDiv').firstElementChild);
	}, {
		value: javaCode || "",
		mode: "text/x-java",
		lineNumbers: true,
		theme: "darcula",
		scrollbarStyle: "native",
		autocorrect: true,
		autoCloseBrackets: true,
	});
	//autoFormatSelection();
}

function convert2JS(callback) {
	// console.log("java code : ", editor.getValue())    
	var javaString = editor.getValue()
	let result = ""


	const tjs_url = 'https://transpiler.vrobotsim.online/students/convert-js'
	// 'http://localhost:8080/students/convert-js' 
	convert_2js(tjs_url, javaString, (rowSource, finalResult) => {
		console.log("===========> js code source start<============ \n" + finalResult)
		if (rowSource == "parse error") {
			//alert("JS convert failed.")
			localStorage.setItem('stopMatch', true);
			document.getElementById("telemetryText").innerText = "<Java to Javascript Failed!>\n" + finalResult;
			resetProgramExecution();
			throw finalResult;
		} else {

			// console.log("===========> js code start<============ \n" + result)
			// console.log("===========> js code end <============")    

			callback(finalResult)
			//editor.setValue(result)
		}
	})


	// result = convert_2js(javaString)

}

//---Functionality for New Program Overlay Buttons---
//"Sample Program"
function sampleProgram(blockProgram) {
	var sampleProgram;
	if (typeof blockProgram == "string")
		sampleProgram = blockProgram;
	else if (blockProgram)
		sampleProgram = document.getElementById('blockSelect').value;
	else
		sampleProgram = document.getElementById('javaSelect').value;
	//Load Basic Program From Files
	var client = new XMLHttpRequest();
	client.open('GET', './blocks/samples/' + sampleProgram + (blockProgram ? '.blk' : '.java'));
	client.onload = function () {
		var content = client.responseText;
		if (content !== '') {
			if (blockProgram) {
				var i = content.indexOf('</xml>');
				content = content.substring(0, i + 6);
				currentProjectName = "program";
				//Goes through blockly naming then back to loadBlocksXML
				blocklyNaming(content, true);
			} else {
				javaProjectName = "program";
				lastSaved = null;
				if (settingUp == 0)
					switchToOnBotJava();
				else
					settingUp -= 1;
				setUpOnBotJava(javaNaming(content));
				if (settingUp == 0)
					document.getElementById("telemetryText").innerText = 'Loaded Sample Program \n';
			}
		}
	}
	client.send();
	overlay(false, 0);
}

//"Upload Program"
document.getElementById('filePrompt').addEventListener('change', function () {
	var fileReader = new FileReader();
	fileReader.onload = function () {
		uploadProgram(document.getElementById('filePrompt').files[0].name, fileReader.result);
	}
	fileReader.readAsText(document.getElementById('filePrompt').files[0]);
});

function uploadProgram(programName, content) {
	document.getElementById('filePrompt').value = '';
	var fileType = programName.split('.')[programName.split('.').length - 1]
	if (fileType == "blk") {
		programName = programName.substring(0, programName.length - fileType.length - 1);
		currentProjectName = programName;
		var i = content.indexOf('</xml>');
		content = content.substring(0, i + 6);
		//Goes through blockly naming then back to loadBlocksXML
		blocklyNaming(content, false);
	} else if (fileType == "java" || fileType == "txt") {
		switchToOnBotJava();
		programName = programName.substring(0, programName.length - fileType.length - 1);
		javaProjectName = programName
		lastSaved = javaNaming(content);
		setUpOnBotJava(javaNaming(content));
		document.getElementById("telemetryText").innerText = 'Loaded new \"' + javaProjectName + '\" Program \n';
		localStorage.setItem("Java Program Name: " + javaProjectName, content);
		prepareUiToLoadProgram();
		overlay(false, 0);
	}
}

//After resolving config naming
function loadBlocksXML(xmlString, sampleProg) {
	//String to XML to Blockly
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(xmlString, "text/xml");
	//Convert 2 Duals to Quad
	var blocks = xmlDoc.getElementsByTagName("block");
	for (var i = 0; i < blocks.length - 1; i++) {
		if (blocks[i].getElementsByTagName("next")[0]) {
			for (var c = 0; c < blocks[i].getElementsByTagName("next")[0].childNodes.length; c++)
				if (blocks[i].getElementsByTagName("next")[0].childNodes[c].tagName == "block")
					nextBlock = blocks[i].getElementsByTagName("next")[0].childNodes[c];
			if (blocks[i].getAttribute("type").startsWith("dcMotor_setDualProperty") && nextBlock.getAttribute("type").startsWith("dcMotor_setDualProperty") &&
				blocks[i].getElementsByTagName("field")[0].childNodes[0].nodeValue == nextBlock.getElementsByTagName("field")[0].childNodes[0].nodeValue) {
				blocks[i].setAttribute("type", "dcMotor_setQuadProperty" + blocks[i].getAttribute("type").substring(23));
				for (var c = nextBlock.childNodes.length - 1; c > 0; c--)
					if (nextBlock.childNodes[c].tagName && nextBlock.childNodes[c].getAttribute("name")) {
						var num = parseInt(nextBlock.childNodes[c].getAttribute("name").substring(nextBlock.childNodes[c].getAttribute("name").length - 1));
						nextBlock.childNodes[c].setAttribute("name", nextBlock.childNodes[c].getAttribute("name").substring(0, nextBlock.childNodes[c].getAttribute("name").length - 1) + (num + 2));
						blocks[i].appendChild(nextBlock.childNodes[c]);
					}
				blocks[i].removeChild(blocks[i].getElementsByTagName("next")[0]);
				if (nextBlock.getElementsByTagName("next")[0])
					blocks[i].appendChild(nextBlock.getElementsByTagName("next")[0]);
			}
		}
	}
	//Loads Content to Workspace
	content = new XMLSerializer().serializeToString(xmlDoc);
	console.log(content);
	Blockly.mainWorkspace.clear();
	if (settingUp == 0)
		switchToBlocks();
	else
		settingUp -= 1;
	Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(content), workspace);
	resetProgramExecution();
	//Checks for Changes Later
	if (currentProjectName == 'program')
		lastSaved = null;
	else
		lastSaved = Blockly.Xml.textToDom(content);
	//Sets UI Values
	if (currStep == 0)
		if (currentProjectName != 'program')
			document.getElementById("telemetryText").innerText = 'Loaded new \"' + currentProjectName + '\" Program \n';
		else if (settingUp == 0 && currStep == 0)
			document.getElementById("telemetryText").innerText = 'Loaded Sample Program \n';
	if (!sampleProg)
		localStorage.setItem("Program Name: " + currentProjectName, content);
	prepareUiToLoadProgram();
	setTimeout(function () { Blockly.mainWorkspace.trashcan.contents_ = []; }, 1);
}

//"Export to OnBotJava"
function convertToJava() {
	var javaCode = generateJavaCode();
	javaProjectName = "program";
	lastSaved = null;
	switchToOnBotJava();
	setUpOnBotJava(configNaming(javaCode));
	overlay(false, 0);
	document.getElementById("telemetryText").innerText = 'Exported "' + currentProjectName + '" to Java';
}

//Coped from FTC Code
function generateJavaCode() {
	// Get the blocks as xml (text).
	Blockly.FtcJava.setClassNameForFtcJava_((currentProjectName != "program") ? currentProjectName : null);
	var blocksContent = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
	// Don't bother exporting if there are no blocks.
	if (blocksContent.indexOf('<block') > -1) {
		// Generate Java code.
		return Blockly.FtcJava.workspaceToCode(workspace);
	}
	return '';
}

//---Functionality of Middle Buttons---
function saveProgram() {
	modifiedResult(3);
	if (isUsingBlocks) {
		currentProjectName = document.getElementById('saveProgramName').value;
		var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
		lastSaved = xml;
		localStorage.setItem("Program Name: " + currentProjectName, Blockly.Xml.domToText(xml));
		localStorage.setItem("Last Program", "Program Name: " + currentProjectName);
		overlay(false, 0);
		document.getElementById("telemetryText").innerText = 'Saved new "' + currentProjectName + '" Program \n';
		//HowTo Tutorial Addition
		if (currStep > 0) {
			document.getElementById('howToText').children[2].children[1].disabled = false;
			document.getElementById('saveAs').style.position = "inherit";
			document.getElementById('saveAs').style.zIndex = "inherit";
		}
	}
	else {
		javaProjectName = document.getElementById('saveProgramName').value;
		lastSaved = editor.getValue();
		localStorage.setItem("Java Program Name: " + javaProjectName, editor.getValue());
		localStorage.setItem("Last Program", "Java Program Name: " + javaProjectName);
		overlay(false, 0);
		document.getElementById("telemetryText").innerText = 'Saved new "' + javaProjectName + '" Program \n';
	}
	prepareUiToLoadProgram();
}

function loadProgram() {
	if (isUsingBlocks) {
		Blockly.mainWorkspace.clear();
		var nameOfProject = "Program Name: " + document.getElementById("programSelect").value;
		currentProjectName = document.getElementById('programSelect').value;
		if (nameOfProject == "Program Name: Load Program") {
			document.getElementById("blockSelect").value = 'BasicAutoOpMode';
			sampleProgram(true);
		} else if (typeof (Storage) !== "undefined") {
			var xml = Blockly.Xml.textToDom(localStorage.getItem(nameOfProject));
			lastSaved = xml;
			Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
			resetProgramExecution();
			if (settingUp == 0)
				document.getElementById("telemetryText").innerText = 'Loaded "' + currentProjectName + '" Program \n';
			prepareUiToLoadProgram();
		}
		setTimeout(function () { Blockly.mainWorkspace.trashcan.contents_ = []; }, 1);
	}
	else {
		var nameOfProject = "Java Program Name: " + document.getElementById("programSelect").value;
		javaProjectName = document.getElementById('programSelect').value;
		if (nameOfProject == "Java Program Name: Load Program") {
			document.getElementById("javaSelect").value = 'BlankLinearOpMode';
			sampleProgram(false);
		} else if (typeof (Storage) !== "undefined") {
			setUpOnBotJava(localStorage.getItem(nameOfProject));
			lastSaved = localStorage.getItem(nameOfProject);
			resetProgramExecution();
			if (settingUp == 0)
				document.getElementById("telemetryText").innerText = 'Loaded "' + javaProjectName + '" Program \n';
			prepareUiToLoadProgram();
		}
	}
}

function autoSave() {
	var programName = document.getElementById('programSelect').value;
	if (isUsingBlocks) {
		var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
		lastSaved = xml;
		localStorage.setItem("Program Name: " + programName, Blockly.Xml.domToText(xml));
		localStorage.setItem("Last Program", "Program Name: " + programName);
	}
	else {
		localStorage.setItem("Java Program Name: " + programName, editor.getValue());
		lastSaved = editor.getValue();
		localStorage.setItem("Last Program", "Java Program Name: " + programName);
	}
	document.getElementById("telemetryText").innerText = 'Saved "' + programName + '" Program \n';
}

function deleteProgram() {
	var programName = document.getElementById('programSelect').value;
	if (isUsingBlocks) {
		currentProjectName = "program";
		lastSaved = null;
		localStorage.removeItem("Program Name: " + programName);
		document.getElementById("blockSelect").value = 'BasicAutoOpMode';
		sampleProgram(true);
	}
	else {
		javaProjectName = "program";
		lastSaved = null;
		localStorage.removeItem("Java Program Name: " + programName);
		document.getElementById("javaSelect").value = 'BlankLinearOpMode';
		sampleProgram(false);
	}
	prepareUiToLoadProgram();
	resetProgramExecution();
	document.getElementById("telemetryText").innerText = 'Deleted "' + programName + '" Program \n';
	overlay(false, 0);
}

function downloadProgram(button) {
	if (isUsingBlocks) {
		var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
		//Blockly to XML to String
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(configNaming(Blockly.Xml.domToText(xml)), "text/xml");
		//Convert Quad to 2 Duals
		var blocks = xmlDoc.getElementsByTagName("block");
		for (var i = 0; i < blocks.length; i++)
			if (blocks[i].getAttribute("type").startsWith("dcMotor_setQuadProperty")) {
				var secondDual = blocks[i].cloneNode();
				blocks[i].setAttribute("type", "dcMotor_setDualProperty" + blocks[i].getAttribute("type").substring(23));
				secondDual.setAttribute("type", blocks[i].getAttribute("type"));
				secondDual.appendChild(blocks[i].childNodes[0].cloneNode(true));
				for (var c = blocks[i].childNodes.length - 1; c > 0; c--)
					if (blocks[i].childNodes[c].getAttribute("name")) {
						var num = parseInt(blocks[i].childNodes[c].getAttribute("name").substring(blocks[i].childNodes[c].getAttribute("name").length - 1));
						if (num > 2) {
							blocks[i].childNodes[c].setAttribute("name", blocks[i].childNodes[c].getAttribute("name").substring(0, blocks[i].childNodes[c].getAttribute("name").length - 1) + (num - 2));
							secondDual.appendChild(blocks[i].childNodes[c]);
						}
					}
				if (blocks[i].getElementsByTagName("next")[0])
					secondDual.appendChild(blocks[i].getElementsByTagName("next")[0]);
				blocks[i].appendChild(xmlDoc.createElement("next"));
				blocks[i].getElementsByTagName("next")[0].appendChild(secondDual);
			}
		//Download Program
		button.parentElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(xmlDoc).replace(/xmlns=\"(.*?)\"/g, '')));
		button.parentElement.setAttribute('download', document.getElementById('programSelect').value + ".blk");
	}
	else {
		//Download Program
		button.parentElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(editor.getValue()));
		button.parentElement.setAttribute('download', document.getElementById('programSelect').value + ".java");
	}
}

//---Functionality for Top Right Buttons---
function initProgram(code) {
	resetProgramExecution();
	programStart = false;
	document.getElementById('programInit').style.display = 'none';
	document.getElementById('programStartStop').style.display = 'inline-block';
	document.getElementById('startBttn').disabled = false;
	startTime = performance.now();
	if (code == "") {
		if (!isUsingBlocks) {
			convert2JS((javaCode) => {
				console.log("Java Code: ", javaCode);
				runProgram(javaCode);
			});
		}
		else {
			code = Blockly.JavaScript.workspaceToCode(Blockly.mainWorkspace);
			var finalCode = "";
			var inFunction = false;
			for (var line of code.split('\n')) {
				if (line.startsWith('function ')) {
					inFunction = true;
				}
				if (line.startsWith('async function '))
					inFunction = true;
				if (inFunction || line == '' || line.startsWith('var ') || line.startsWith('// '))
					finalCode += line + '\n';
				else
					finalCode += '//' + line + '\n';
				if (line == '}')
					inFunction = false;
			}

			finalCode += "\nawait runOpMode();\n";
			runProgram(finalCode);
		}
	} else
		runProgram(code);
}

function startProgram() {
	document.getElementById('startBttn').disabled = true;
	//HowTo Tutorial Thing
	if (currStep == 2) {
		document.getElementById('howToText').children[2].children[1].disabled = false;
		document.getElementById('programInit').style.position = "inherit";
		document.getElementById('programInit').style.zIndex = "inherit";
		document.getElementById('programStartStop').style.position = "inherit";
		document.getElementById('programStartStop').style.zIndex = "inherit";
	}
	else
		programStart = true;
	document.getElementById("telemetryText").innerText = "Program Started \n";
}

function stopProgram() {
	localStorage.setItem('stopMatch', true);
	resetProgramExecution();
	document.getElementById("telemetryText").innerText = "Program Aborted \n";
}

function resetField() {
	localStorage.setItem('resetField', true);
	document.getElementById("telemetryText").innerText = "Field Reset \n";
}

//---Funcionality for Running Blockly Code---
var programExecController = new AbortController();

async function runProgram(code) {
	console.log("===========> js code start<============ \n" + code)
	console.log("===========> js code end <============")
	let AsyncFunctionCtor = Object.getPrototypeOf(async function () { }).constructor;
	let program;
	try {
		program = new AsyncFunctionCtor(code);
	}
	catch (err) {
		localStorage.setItem('stopMatch', true);
		document.getElementById("telemetryText").innerText = "<Java to Javascript Failed!>\n" + err;
		resetProgramExecution();
		throw err;
	}

	//setup
	localStorage.setItem('startMatch', true);
	document.getElementById("telemetryText").innerText = "Program Initialized \n";

	programExecController = new AbortController();
	// execution
	try {
		await program();
	} catch (err) {
		// anything other than abortedMsg is an actual error
		if (err != abortedMsg) {
			localStorage.setItem('stopMatch', true);
			document.getElementById("telemetryText").innerText = "<Program has stopped!>\n" + err;
			resetProgramExecution();
			throw err;
		}
	}

	// end
	resetProperties();
	localStorage.setItem('stopMatch', true);
	if (!document.getElementById("telemetryText").innerText.startsWith("<Program has stopped!>"))
		document.getElementById("telemetryText").innerText = "Program Ended \n";
	document.getElementById('programInit').style.display = 'inline-block';
	document.getElementById('programStartStop').style.display = 'none';
}

function resetProgramExecution() {
	programExecController.abort();
	resetProperties();
	document.getElementById('programInit').style.display = 'inline-block';
	document.getElementById('programStartStop').style.display = 'none';
}