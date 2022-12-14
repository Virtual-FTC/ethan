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

let OpMode = ""
const directions = {
	'frontLeft': 0,
	'frontRight': 1,
	'backLeft': 2,
	'backRight': 3,
	'motor5': 5,
	'motor6': 6,
	'motor7': 7,
	'motor8': 8
}
const gamepadBoxVars = {
	a: 0, b: 1, c: 2, d: 3
}

const replaceJSString = [
	,[": number", ""]
	,[": string", ""]
	, ["{}", "{\n}"]
	, ['opModeIsActive', 'linearOpMode.opModeIsActive']
	, ['Range.clip(', 'range.clip(']
]
const colorData = {
	'frontColorSensor': 0
}
var mortorVars = {}
var colorVars = {}
var elapsedTimeVars = {}
var accelerateVars = {}
var normalizedColors = {}

const gamepadValues = {
	"left_stick_x": 0,
	"left_stick_y": 1,
	"right_stick_x": 2,
	"right_stick_y": 3,
	"right_stick_button": 11
}
const getBracketContent = (str) => {
	let returnStr = ""
	let bracketCount = 0

	for (var i = 0; i < str.length; i++) {
		if (str[i] == "(") bracketCount++
		else if (str[i] == ")") bracketCount--
		if (bracketCount < 0) break
		returnStr += str[i]
	}

	return returnStr

}

const valueConverter = (str) => {
	if (str.includes(".isBusy(")) {
		let sides = str.split(".isBusy(");
		const varName = sides[0];
		return `motor.isBusy(${directions[varName]})`
	} else if (str.includes(".getTargetPosition(")) {
		let sides = str.split(".getTargetPosition(");
		const varName = sides[0];
		return `motor.getProperty(${directions[varName]}, 'TargetPosition')`
	} else if (str.includes(".getCurrentPosition(")) {
		let sides = str.split(".getCurrentPosition(");
		const varName = sides[0];
		return `motor.getProperty(${directions[varName]}, 'CurrentPosition')`
	} else if (/this\.(\w+)\.blue()/.test(str)) {
		const values = /this\.(\w+)\.blue()/.exec(str)
		const varName = values[1];
		return `colorSensor.getProperty(${colorVars[varName]}, 'Blue')`
	}
	else if (/this\.(\w+)\.red()/.test(str)) {
		const values = /this\.(\w+)\.red()/.exec(str)
		const varName = values[1];
		return `colorSensor.getProperty(${colorVars[varName]}, 'Red')`
	}
	else if (/this\.(\w+)\.green()/.test(str)) {
		const values = /this\.(\w+)\.green()/.exec(str)
		const varName = values[1];
		return `colorSensor.getProperty(${colorVars[varName]}, 'Green')`
	}
	else if (str.includes("getRuntime(")) {
		return str.replaceAll('getRuntime(', "linearOpMode.getRuntime(");

	}else if (str.includes(".getDistance(")) {
		let sides = str.split(".getDistance(")
		let colorIndex = 0
		Object.keys(colorData).map((color) => {
			if (sides[0].includes(color)) colorIndex = color
		})
		let value = getBracketContent(sides[1])
		return `colorSensor.getDistance(${colorData[colorIndex]}, ${value})`;
	}

	else if(str.includes(".getPower()")){
		const exeVars = /this.(\w+).getPower/.exec(str)
		let returnStr = str.replace("()", "")
		return returnStr.replaceAll(/this.(\w+).getPower/g, `motor.getProperty(${mortorVars[exeVars[1]]}, 'Power')`)
	}
	else if(str.includes(".getGain()")){
		const exeVars = /\(?this.(\w+)\)?.getGain\(\)/.exec(str)
		return str.replaceAll(/\(?this.(\w+)\)?.getGain\(\)/g, `colorSensor.getProperty(${colorVars[exeVars[1]]}, "Gain")`)
	}
	else if(str.includes(".getNormalizedColors()")){
		const exeVars = /\(?this\.(\w+)\)?.getNormalizedColors\(\)/.exec(str)
		return str.replaceAll(/\(?this\.(\w+)\)?.getNormalizedColors\(\)/g, `JSON.parse(colorSensor.getNormalizedColors(${colorVars[exeVars[1]]}))`)
	}
	else if(str.includes("DistanceUnit.")){
		const exeVars = /DistanceUnit.(\w+)/g.exec(str)
		return str.replaceAll(`DistanceUnit.${exeVars[1]}`, `'${exeVars[1]}'`)
	}

	else if(/(\w+)\.toString\(\)/g.test(str)){
		let values = /(\w+).toString\(\)/g.exec(str)
		if(elapsedTimeVars[values[1]]){
			return str.replace(/(\w+).toString\(\)/g, `String(elapsedTime.toText(${values[1]}))`)
		}
	}

	else if(/(\w+)\.seconds\(\)/g.test(str)){
		let values = /(\w+).seconds\(\)/g.exec(str)
		if(elapsedTimeVars[values[1]]){
			return str.replace(/(\w+).seconds\(\)/g, `String(elapsedTime.get("Seconds", ${values[1]}))`)
		}
	}

	else if(/(\w+)\.reset\(\)/g.test(str)){
		let values = /(\w+).reset\(\)/g.exec(str)
		if(elapsedTimeVars[values[1]]){
			return str.replace(/(\w+).reset\(\)/g, `elapsedTime.reset(${values[1]})`)
		}
	}

	else if(/(\w+)\.toUnit\((\w+)\)/g.test(str)){
		let values = /(\w+).toUnit\((\w+)\)/g.exec(str)
		if(accelerateVars[values[1]]){
			return str.replace(/(\w+).toUnit\((\w+)\)/g, `acceleration.toDistanceUnit(${values[1]}, "${values[2]}")`)
		}
	}

	else if(str.includes(".getLightDetected()")){
		const values = /\(?this.(\w+)\)?.getLightDetected\(\)/g.exec(str)
		return str.replace(/\(?this.(\w+)\)?.getLightDetected\(\)/g, `colorSensor.getProperty(${colorVars[values[1]]}, "LightDetected")`)
	}


	else if(/\bmisc\.colorToValue\((\w+)\)/.test(str)){
		const values = /misc\.colorToValue\((\w+)\)/.exec(str)
		return str.replace(/misc.colorToValue\((\w+)\)/, `colorUtil.get("Hue", ${values[1]})`)
	}


	else if(/(\w+)\.toColor\(\)/.test(str)){
		const values = /(\w+).toColor\(\)/.exec(str)
		return str.replace(/(\w+).toColor\(\)/, `colorUtil.normalized("Color", ${values[1]})`)
	}

	else if(/\bmisc.colorToHue\((\w+)\)/.test(str)){
		const values = /\bmisc.colorToHue\((\w+)\)/.exec(str)
		return str.replace(/\bmisc.colorToHue\((\w+)\)/, `colorUtil.get("Hue", ${values[1]})`)
	}

	else if(/\bmisc\.colorToSaturation\((\w+)\)/.test(str)){
		const values = /\bmisc\.colorToSaturation\((\w+)\)/.exec(str)
		return str.replace(/\bmisc\.colorToSaturation\((\w+)\)/, `colorUtil.get("Saturation", ${values[1]})`)
	}

	else if(/\bmisc.formatNumber\(/.test(str)){
		return str.replace(/\bmisc.formatNumber\(/, "misc.roundDecimal(")
	}


	else if(/gamepad(\d+)\.(\w+)_stick_(\w)/.test(str)){
		const gamepadV = /gamepad(\d+).(\w+)_stick_(\w)/.exec(str)
		const keyV = `${gamepadV[2]}_stick_${gamepadV[3]}`
		let returnStr = ""
		if(gamepadValues[keyV]<4)
			returnStr =  `gamepad.numberValue(${gamepadV[1]-1}, ${gamepadValues[keyV]})`
		else
			returnStr =  `gamepad.boolValue(${gamepadV[1]-1}, ${gamepadValues[keyV]}, 'Both')`
		return returnStr

	}else if(/gamepad(\d+).(a|b|c|d)/.test(str)){
		const values = /gamepad(\d+).(a|b|c|d)/.exec(str)
		return `gamepad.boolValue(${values[1]-1}, ${gamepadBoxVars[values[2]]}, 'Xbox')`
	}
	else if(/\bmisc\.formatNumber\((\w+)\.(\w+),/.test(str)){
		const values = /misc.formatNumber\((\w+).(\w+),/.exec(str)
		return str.replace(/misc.formatNumber\((\w+).(\w+),/, `misc.roundDecimal(colorUtil.normalized("${capitalize(values[2])}", ${values[1]}),`)
	}
	else if(/\bColor\.parseColor\("(\w+)"\)/.test(str)){
		const values = /\bColor\.parseColor\("(\w+)"\)/.exec(str)
		console.log("color values : ", values)
		return str.replace(/\bColor\.parseColor\("(\w+)"\)/, `colorUtil.textToColor('${values[1]}')`)
	}



	return str
}
const capitalize = (str) => {
	const lower = str.toLowerCase();
	return str.charAt(0).toUpperCase() + lower.slice(1);
}
const valueChecker = (str) => {
	if (str.includes("JavaUtil.inListGet(")) {
		let sides = str.split("JavaUtil.inListGet(")
		let bracks = 0
		let listValue = ''
		for (var i = 0; i < sides[1].length; i++) {
			if (sides[1][i] == "(") bracks++
			else if (sides[1][i] == ")") bracks--

			if (bracks < 0) break;
			else listValue += sides[1][i]
		}
		let listValueArr = listValue.split(", ")
		listValueArr = `${listValueArr[0]}[${listValueArr[2]}]`
		return str.replaceAll("JavaUtil.inListGet(" + listValue + ")", listValueArr)
	}
	var words = str.split(" ")
	if (words.length > 0) {
		for (var i = 0; i < words.length; i++)
			words[i] = valueConverter(words[i]);
		return words.join(" ")
	} else
		return str;
}
const customConvert = (str) => {
	let result = str;
	if (result.includes('hardwareMap.get')) {
		let hardmaps = /this.(\w+) = hardwareMap.get\((\w+), "(\w+)"\);/g.exec(result);
		const varName = hardmaps[1];
		const varValue = hardmaps[3];
		if (hardmaps[2] == 'DcMotor')
			mortorVars[varName] = directions[varValue];
		else if (hardmaps[2] == 'ColorSensor')
			colorVars[varName] = colorData[varValue];
		console.log("color bars : ", colorVars)
		return "";
	}

	else if (str.includes("new ElapsedTime()")) {
		let values = /(\w+) = /.exec(str);
		elapsedTimeVars[values[1]] = true;
		return str.replace("new ElapsedTime()", "elapsedTime.create()");
	}

	else if (str.includes("new Acceleration()")) {
		let values = /this.(\w+) = /.exec(str);
		accelerateVars[values[1]] = true;
		return str.replace("new Acceleration()", "Acceleration.create()");
	}

	else if (result.includes('.setDirection')) {
		let hardmaps = /this.(\w+).setDirection\((DcMotorSimple|DcMotor).Direction.(\w+)\);/g.exec(result);
		const varName = hardmaps[1];
		const value = hardmaps[3];
		return `motor.setProperty([${mortorVars[varName]}], 'Direction', ['${value}']);`;
	}
	else if (str.includes('waitForStart()')) {
		return str.replace('waitForStart', 'await linearOpMode.waitForStart');
	}
	else if (str.includes('.setPower(')) {
		let matches = /this.(\w+).setPower\((.*)\);/g.exec(result);
		const varName = matches[1];
		const value = valueChecker(matches[2]);
		return `motor.setProperty([${mortorVars[varName]}], 'Power', [${value?value:0}]);`;
	}
	else if (str.includes('setMode(')) {
		let hardmaps = /this.(\w+).setMode\(DcMotor.RunMode.(\w+)\);/g.exec(str);
		const varName = hardmaps[1];
		const value = hardmaps[2];
		return `motor.setProperty([${mortorVars[varName]}], 'Mode', ['${value}']);`;
	}
	else if (str.includes('setTargetPosition(')) {
		let matches = /this.(\w+).setTargetPosition\((.*)\);/g.exec(str);
		const varName = matches[1];
		const value = valueChecker(matches[2]);
		return `motor.setProperty([${mortorVars[varName]}], 'TargetPosition', [${value?value:0}]);`;
	}
	else if (str.includes('setZeroPowerBehavior(')) {
		let matches = /this.(\w+).setZeroPowerBehavior\(DcMotor.ZeroPowerBehavior.(\w+)\);/g.exec(str);
		console.log("matches : ", matches)
		const varName = matches[1];
		const value = matches[2];
		return `motor.setProperty([${mortorVars[varName]}], 'ZeroPowerBehavior', ['${value}']);`;
	}
	else if (str.includes('setTargetPositionTolerance(')) {
		let matches = /this.(\w+).setTargetPositionTolerance\((.*)\);/g.exec(str);
		const varName = matches[1];
		const value = valueChecker(matches[2]);
		return `motor.setProperty([${mortorVars[varName]}], 'TargetPositionTolerance', [${value?value:0}]);`;
	}

	else if(str.includes(".setGain(")){
		const values = /\(?this.(\w+)\)?.setGain\((\w+)\)/.exec(str)
		return str.replace(/\(?this.(\w+)\)?.setGain\((\w+)\)/, `colorSensor.setProperty(${colorVars[values[1]]}, "Gain", ${values[2]})`);
	}


	else if(/\bmisc\.showColor\((.*), (.*)\);/.test(str)){
		const values = /\bmisc\.showColor\((.*), (.*)\);/.exec(str)
		return str.replace(/\bmisc\.showColor\((.*), (.*)\);/, `colorUtil.showColor( ${valueChecker(values[2])});`)
	}

	else if (str.includes("if (")) {
		let sides = str.split("if (");
		const value = valueChecker(sides[1].split(") {")[0]);
		return sides[0] + `if (${value}) {` + sides[1].split(") {")[1];
	}
	else if (str.includes("JavaUtil.createListWith(")) {
		let sides = str.split("JavaUtil.createListWith(");
		const value = valueChecker(sides[1].split(");")[0]);
		return `${sides[0]}[${value}];`;
	}
	else if (str.includes("GoToPosition(")) {
		let sides = str.split("GoToPosition(");
		const value = valueChecker(sides[1].split(");")[0]);
		return `${sides[0]} GoToPosition(${value});`;
	}
	else if (str.includes("while (")) {
		let sides = str.split("while (");
		const value = valueChecker(sides[1].split(") {")[0]);
		return `while (${value}) {await linearOpMode.sleep(1);\n` + sides[1].split(") {")[1];
	}
	else if (str.includes("for (")) {
		let sides = str.split("for (");
		const value = valueChecker(sides[1].split(") {")[0]);
		return `for (${value}) {` + sides[1].split(") {")[1];

	} else if (str.includes("telemetry.addData(")) {
		let sides = str.split("telemetry.addData(")[1].split(");")[0]
		// .split(" ")
		let bracketCount = 0
		let s = 0
		for (s = 0; s < sides.length; s++) {
			if (sides[s] == '(') bracketCount++
			else if (sides[s] == ')') bracketCount--
			if (bracketCount == 0 && sides[s] == ',') break;
		}
		const regexCommaNotBetweenQuotes = /("[^"]*")|,/g;
		let newVars = []
		const arguments = sides
			.split(regexCommaNotBetweenQuotes)
			.filter(a => typeof(a)==="string")
			.map(a=> a.trim())
			.filter(a => a!=="")
		arguments.map(item => {
			newVars.push(valueChecker(item))
		})
		newVars = newVars.join(", ");
		return `telemetry.addData(${newVars});`
	}
	else if (str.includes('sleep')) {
		return "await linearOpMode.sleep(" + str.split("sleep(")[1];
	} else if (/(\w+\s)*\w+\((\w+(,\s?\w+)*)?\)\s*(:\s*\w+)?\s*{/g.test(str)) {
		//replace <function header> with "async <function header>"
		return str.replace(/((\w+\s)*\w+\((\w+(,\s?\w+)*)?\)\s*(:\s*\w+)?\s*{)/g, "async $1")
	} else
		return valueChecker(str);
}
async function convert_2js(url, javaCode, callback) {
	var result = "";
	var jsString = ''
	var lineTxt = ""
	let rawSource = ""

	try {

		await axios({
			method: 'post',
			url,
			data: {
				javaCode
			}
		})
			.then(function (response) {
				result = response.data
				rawSource = response.data

			})



		replaceJSString.map(word => {
			result = result.replaceAll(word[0], word[1])
		})

		//Total remove vars
		result = result.replaceAll(/: (\w+);/g, " = null;")
		result = result.replaceAll(/<(\w+)>/g, "")
		result = result.replaceAll(/\bparseFloat\b/g, "")
		result = result.replaceAll(/\bJavaUtil./g, "misc.")

		const className = /export class (\w+)/g.exec(result)[1];

		if(/export class (\w+) extends LinearOpMode\b/g.test(result)){
			result = result.replace(/(export class (\w+)) extends LinearOpMode\b/g, "$1")
			OpMode = "LinearOpMode"
		}else if(/export class (\w+) extends OpMode\b/g.test(result)){
			result = result.replace(/(export class (\w+)) extends OpMode\b/g, "$1")
			OpMode = "OpMode"
		}else
			return "Parse Error"


		console.log(OpMode)
		result = result.split('\n');
		for (let i = 1; i < result.length; i++) {
			lineTxt = result[i].trim();
			var middleVars = /\bDistanceUnit.(\w+)/g.exec(lineTxt)
			// partial remove vars
			if(middleVars){
				lineTxt = lineTxt.replace(/\bDistanceUnit.(\w+)/g, `"${middleVars[1]}"`)
			}
			result[i] = customConvert(lineTxt)
		}

		const regexWordExportsNotBetweenQuotes = /("[^"]*")|(exports|export)/;
		const tsTranspiler = tsNode.register({transpileOnly:true})
		jsString = tsTranspiler
			.compile(result.join("\n"), "result.ts") //"result.ts" means nothing
			.split("\n")
			.filter(line => !line.includes('"use strict"') && !line.includes("'use strict'"))
			.filter(line => !regexWordExportsNotBetweenQuotes.test(line))
			.join("\n")

		if (OpMode == "LinearOpMode")
			jsString += `
            const program = new ${className}();
            await program.runOpMode();`
		else
			jsString += `
            const program = new ${className}()
            async function runOpMode() {
                await program.init();
                while (!linearOpMode.isStarted()) {
                    await program.init_loop();
                }
                await program.start();
                while (linearOpMode.opModeIsActive())
                    await program.loop();
                await program.stop();
            }

            await runOpMode();`

	} catch (e) {
		console.log(lineTxt)
		console.log("parse error : ", e)
		callback("parse error", e)
	}

	callback(rawSource, jsString)
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