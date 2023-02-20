let image = new Image();
let resized = new Image();
let imgWithBackground = new Image();
let fileSelected = false;
let generatingXML = false;

let hiddenSelectFile = document.querySelector("input[type=\"file\"]");
let modeSelect = document.getElementById("modeSelect");
let width = document.getElementById("width");
let height = document.getElementById("height");
let optimize = document.getElementById("optimize");
let selectFile = document.getElementById("selectFile");
let generateXML = document.getElementById("generateXML");
let threshold = document.getElementById("threshold");

let imageCanvas = document.getElementById("imageCanvas");
let imageContext = imageCanvas.getContext("2d");

let resizedCanvas = document.getElementById("resizedCanvas");
let resizedContext = resizedCanvas.getContext("2d");

selectFile.addEventListener("click", function() {
    hiddenSelectFile.click();
    CalculateWidthHeight();
})

hiddenSelectFile.addEventListener("change", function() {
    file = hiddenSelectFile.files[0];
    if(file) {
        let fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.addEventListener("load", function() {
            let data = this.result;
            image.src=data;
            fileSelected = true;
            optimize.disabled = false;
            if(optimize.checked) {
                threshold.disabled = false;
            } else {
                threshold.disabled = true;
            }
            CalculateWidthHeight();
        })
    } else {
        fileSelected = false;
        optimize.disabled = true;
        threshold.disabled = true;
    }
    CalculateWidthHeight();
})

modeSelect.addEventListener("change", function () {
    CalculateWidthHeight();
})

width.addEventListener("change", function() {
    width.value=Math.min(Math.max(width.value,1),4096);
    CalculateWidthHeight()
})

height.addEventListener("change", function() {
    height.value=Math.min(Math.max(height.value,1),4096);
    CalculateWidthHeight()
})

optimize.addEventListener("change", function() {
    if(optimize.checked) {
        threshold.disabled = false;
    } else {
        threshold.disabled = true;
    }
})

threshold.addEventListener("change", function() {
    threshold.value=Math.min(Math.max(threshold.value,0),255);
})

generateXML.addEventListener("click", function() {
    CalculateWidthHeight();
    if(!generatingXML) {
        generateXML.disabled = true;
        generatingXML = true;
        let newY = Math.floor(Math.max(((image.height/image.width) * width.value * 9), 1));
        let newX = Math.floor(Math.max(((image.width/image.height) * height.value * 9), 1));
    
        if(modeSelect.value == 1) {
            resized = GetResizedImage(image, width.value * 9, height.value * 9);
        } else if(modeSelect.value == 2) {
            resized = GetResizedImage(image, width.value * 9, newY);
        } else if(modeSelect.value == 3) {
            resized = GetResizedImage(image, newX, height.value * 9);
        }

        resizedCanvas.width = Math.ceil(resized.width / 9) * 9;
        resizedCanvas.height = Math.ceil(resized.height / 9) * 9;

        resizedContext.globalCompositeOperation = 'destination-under';
        resizedContext.fillStyle = "rgba(255,255,255,255)"
        resizedContext.fillRect(0, 0, resized.width, resized.height);
        resized.onload = function() {
            resizedContext.drawImage(resized, 0, 0, resized.width, resized.height);
        }

        imgWithBackground = new Image(resizedCanvas.width, resizedCanvas.height);
        imgWithBackground.onload = function() {
            GenerateXML(imgWithBackground);   

            generatingXML=false;
            generateXML.disabled = false;
        }
        imgWithBackground.src = resizedCanvas.toDataURL("image/png");
    }
})

let output="";
function GenerateXML(img) {
    output = "";
    const stormworksVehicleBeginingData = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><vehicle data_version=\"3\" bodies_id=\"0\"><authors/><bodies><body unique_id=\"0\"><components>";
    const stormworksVehicleEndingData = "</components></body></bodies><logic_node_links/></vehicle>";
    const imageWidthBlocks = Math.floor(img.width / 9);
    const imageHeightBlocks = Math.floor(img.height / 9);

    output += stormworksVehicleBeginingData;

    for(let blockX=0;blockX<imageWidthBlocks;blockX++) {
        for(let blockY=0;blockY<imageHeightBlocks;blockY++) {
            let pixels = Array(243);
            let xmlColorData = "";
            for(let x=0;x<9;x++) {
                for(let y=0;y<9;y++) {
                    const rgba = resizedContext.getImageData(Math.abs((blockX * 9 + x + 1) - img.width), Math.abs((blockY * 9 + y + 1) - img.height), 1, 1).data;
                    const hex = ColorToHex(rgba, true)
                    pixels[(x * 9 + y) * 3] = rgba[0];
                    pixels[(x * 9 + y) * 3 + 1] = rgba[1];
                    pixels[(x * 9 + y) * 3 + 2] = rgba[2];
                    xmlColorData+=hex;
                    if(x * 9 + y != 80) {xmlColorData += ",";}
                }
            }

            if(optimize.checked && IsPixelDataInThreshold(pixels, threshold.value)) {
                AddBlockData(GetPixelAverage(pixels), blockY - imageHeightBlocks / 2, blockX - imageWidthBlocks / 2);
            } else {
                AddPaintableSignData(xmlColorData, blockY - imageHeightBlocks / 2, blockX - imageWidthBlocks / 2);
            }
        }
    }

    output += stormworksVehicleEndingData;
    DownloadTextFile("Generated.xml", output);
}

function ColorToHex(c, useWhiteSpecialCase) {
    const r = c[0];
    const g = c[1];
    const b = c[2];
    if (r === 255 && g === 255 && b === 255 && useWhiteSpecialCase) {return "x";}
    if (r === 0 && g === 0 && b === 0) {return "";}
    let hex = r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
    if (r === 0 && g === 0) {return hex.substring(2);}
    if (r === 0) {return hex.substring(1);}
    return hex;
}

function AddPaintableSignData(colorData, x, z) {
    output += ("<c d=\"sign_na\"><o r=\"1,0,0,0,1,0,0,0,1\" sc=\"6\" gc=\"");
    output += (colorData);
    if (x != 0 && z != 0) output += ("\"><vp x=\"" + x + "\" z=\"" + z + "\"/><logic_slots><slot/></logic_slots></o></c>");
    else if (x == 0 && z != 0) output += ("\"><vp z=\"" + z + "\"/><logic_slots><slot/></logic_slots></o></c>");
    else if (x != 0 && z == 0) output += ("\"><vp x=\"" + x + "\"/><logic_slots><slot/></logic_slots></o></c>");
    else if (x == 0 && z == 0) output += ("\"><vp/><logic_slots><slot/></logic_slots></o></c>");
}

function AddBlockData(color, x, z) {
    output += ("<c><o r=\"1,0,0,0,1,0,0,0,1\" sc=\"6,x,x," + color + ",x,x,x");
    if (x != 0 && z != 0) output += ("\"><vp x=\"" + x + "\" z=\"" + z + "\"/></o></c>");
    else if (x == 0 && z != 0) output += ("\"><vp z=\"" + z + "\"/></o></c>");
    else if (x != 0 && z == 0) output += ("\"><vp x=\"" + x + "\"/></o></c>");
    else if (x == 0 && z == 0) output += ("\"><vp/></o></c>");
}

function IsPixelDataInThreshold(pixels, threshold) {
    if (GetGreatestValue(pixels, 0) - GetSmallestValue(pixels, 0) > threshold) return false;
    if (GetGreatestValue(pixels, 1) - GetSmallestValue(pixels, 1) > threshold) return false;
    if (GetGreatestValue(pixels, 2) - GetSmallestValue(pixels, 2) > threshold) return false;
    return true;
}

function GetSmallestValue(pixels, subpixelNum) {
    let min = pixels[subpixelNum];
    for (let i = 0; i < 81; i++) if (pixels[i * 3 + subpixelNum] < min) min = pixels[i * 3 + subpixelNum];
    return min;
}

function GetGreatestValue(pixels, subpixelNum) {
    let max = pixels[subpixelNum];
    for (let i = 0; i < 81; i++) if (pixels[i * 3 + subpixelNum] > max) max = pixels[i * 3 + subpixelNum];
    return max;
}

function GetPixelAverage(pixels) {
    let rAverage = 0;
    let gAverage = 0;
    let bAverage = 0;
    for(let i=0;i<81;i++) {
        rAverage += pixels[i * 3];
        gAverage += pixels[i * 3 + 1];
        bAverage += pixels[i * 3 + 2];
    }
    return ColorToHex([rAverage/81, gAverage/81, bAverage/81], false);
}

function CalculateWidthHeight() {
    if(fileSelected) {
        if(modeSelect.value != 0 && !generatingXML) {
            generateXML.disabled = false;
        } else {
            generateXML.disabled = true;
        }
        if(modeSelect.value == 0) {
            width.disabled = true;
            height.disabled = true;
            width.value = 1;
            height.value = 1;
        } else if(modeSelect.value == 1) {
            width.disabled = false;
            height.disabled = false;
        } else if(modeSelect.value == 2) {
            width.disabled = false;
            height.disabled = true;
            let newHeight = (image.height/image.width) * width.value * 9;
            let newHeightBlocks = Math.max(Math.ceil(Math.floor(newHeight)/9), 1);
            if(isNaN(newHeightBlocks)) {
                height.value = 1;
            } else {
                height.value = newHeightBlocks;
            }
        } else if(modeSelect.value == 3) {
            width.disabled = true;
            height.disabled = false;
            let newWidth = (image.width/image.height) * height.value * 9;
            let newWidthBlocks = Math.max(Math.ceil(Math.floor(newWidth)/9), 1);
            if(isNaN(newWidthBlocks)) {
                width.value = 1;
            } else {
                width.value = newWidthBlocks;
            }
        } else if(modeSelect.value == 4) {
            width.disabled = true;
            height.disabled = true;
            width.value = Math.ceil(image.width / 9);
            height.value = Math.ceil(image.height / 9);
        }
    } else {
        width.disabled = true;
        height.disabled = true;
        width.value = 1;
        height.value = 1;
    }
}

function GetResizedImage(img, w, h) {
    imageCanvas.width=w;
    imageCanvas.height=h;
    imageContext.drawImage(img, 0, 0, w, h);
    img = new Image(w, h);
    img.src = imageCanvas.toDataURL("image/png");
    return img;
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