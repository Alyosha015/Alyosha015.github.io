let praser = new DOMParser();
let data;
let xmlDoc;
let fileSelected = false;
let colorSelected = false;
let generating = false;

let r = 0;
let g = 0;
let b = 0;
let colorNum = 0;
let colors;
let intensity = 1;

let originalColorIsWhite = false;
let originalColor = "";
let originalColorSide = "";

let hiddenSelectFile = document.querySelector("input[type=\"file\"]");
let colorToWeather = document.getElementById("colorToWeather");
let numColors = document.getElementById("numColors");
let percentToWeather = document.getElementById("percentToWeather");
let selectFile = document.getElementById("selectFile");
let generateXML = document.getElementById("generateXML");

selectFile.addEventListener("click", function() {
    hiddenSelectFile.click();
})

hiddenSelectFile.addEventListener("change", function() {
    file = hiddenSelectFile.files[0];
    if(file) {
        let fileReader = new FileReader();
        fileReader.readAsText(file);
        fileReader.addEventListener("load", function() {
            data = this.result;
            fileSelected = true;
            generateXML.disabled = false;
        })
    } else {
        fileSelected = false;
        generateXML.disabled = true;
    }
})

numColors.addEventListener("change", function() {
    numColors.value = Clamp(numColors.value, 1, 999);
})

percentToWeather.addEventListener("change", function() {
    percentToWeather.value = Clamp(percentToWeather.value, 1, 100);
})

generateXML.addEventListener("click", function() {
    if(fileSelected && !generating) {
        generating=true;
        generateXML.disabled = true;
        
        data = data.replaceAll("\n","&#xA;");

        xmlDoc = praser.parseFromString(data, "text/xml");
        const rgb = colorToWeather.value.split(" ");
        if(rgb.length != 3) {
            alert("\""+colorToWeather.value+"\" is not a valid rgb input.");
            return;
        }
        r = Clamp(Number(rgb[0]),0,255);
        g = Clamp(Number(rgb[1]),0,255);
        b = Clamp(Number(rgb[2]),0,255);

        originalColorIsWhite = (r===255 && g===255 && b===255);
        originalColor = ColorToStormworksHex(r, g, b, false);
        originalColorSide = ColorToStormworksHex(r, g, b, true);
        colorNum = numColors.value;
        colors = GenColors(colorNum);
        intensity = percentToWeather.value;

        xmlDoc = Weather(xmlDoc);
        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString(xmlDoc);
        DownloadTextFile("Weathered.xml", xmlString);
    }
    generating = false;
    generateXML.disabled = false;
})

function Weather(xml) {
    let blocks = xml.getElementsByTagName("o");
    let len = blocks.length;
    for(let i = 0; i < len; i++) {
        const bcColor = blocks[i].getAttribute("bc");
        const acColor = blocks[i].getAttribute("ac");
        const scColor = blocks[i].getAttribute("sc");

        const newBaseColor = RandomColorBCAC();
        let baseColorMatches = false;
        if(blocks[i].hasAttribute("bc")) {
            if(bcColor === originalColor) {
                baseColorMatches = true;
                blocks[i].setAttribute("bc",newBaseColor);
            }
        } else {
            if(originalColorIsWhite) baseColorMatches = true;
        }
        if(blocks[i].hasAttribute("ac")) {
            if(acColor === originalColor) {
                baseColorMatches = true;
                blocks[i].setAttribute("ac",newBaseColor);
            }
        } else {
            if(originalColorIsWhite) baseColorMatches = true;
        }
        if(blocks[i].hasAttribute("sc")) {
            let value = scColor;
            let sideCount;
            let scTemp = scColor;
            if(!value.includes(",")) sideCount = Number(value);
            else sideCount = Number(value.substring(0, value.indexOf(",")));
            if(baseColorMatches && !value.includes(",")) {
                let newValue = value;
                for(let j = 0; j < sideCount; j++) {
                    newValue += "," + originalColorSide;
                }
                scTemp = newValue;
            }

            value = scTemp;
            let newData = String(sideCount);
            let scColors = value.split(",");
            for(let j = 1; j < scColors.length; j++) {
                if(scColors[j] == originalColorSide) {
                    if(Random(0,100) <= intensity) newData += "," + RandomColorSC();
                    else newData += "," + scColors[j];
                } else {
                    newData += "," + scColors[j];
                }
            }
            blocks[i].setAttribute("sc", newData);
        }
    }
    return xml;
}

function RandomColorSC() {
    let color = RandomColorBCAC();
    if(color=="FFFFFF") color = "x";
    return color;
}

function RandomColorBCAC() {
    return colors[Random(0, colors.length)];
}

function GenColors(colorNum) {
    colors = new Array(colorNum);
    colors[0] = ColorToStormworksHex(r, g, b, false);
    for(let i=1;i<colorNum;i++) {
        rgb = ColorToStormworksHex(Random(0,255), Random(0,255), Random(0,255), false);
        colors[i] = rgb;
    }
    return colors;
}

function Random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function Clamp(n, min, max) {
    if(n < min) return min;
    if(n > max) return max;
    return n;
}

function ColorToStormworksHex(r, g, b, useWhiteSpecialCase) {
    if (r === 255 && g === 255 && b === 255 && useWhiteSpecialCase) {return "x";}
    if (r === 0 && g === 0 && b === 0) {return "";}
    if (r === 0 && g === 0) {return (b.toString(16)).toUpperCase()}
    if (r === 0) {return (g.toString(16) + b.toString(16).padStart(2, "0")).toUpperCase();}
    return (r.toString(16) + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0")).toUpperCase();
}

function DownloadTextFile(fileName, data) {
    let element = document.createElement("a");
    element.hidden = true;
    element.setAttribute("href","data:text/plain;charset=utf-8, " + encodeURIComponent(data));
    element.setAttribute("download", fileName);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}