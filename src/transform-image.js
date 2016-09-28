// We start with the image centered in the crop box, then apply offset,
// rotation, and scaling with transform origin at the center of the image.
// If the image does not fully cover the crop box, transparent pixels are filled
// with backgroundColor. Hermite interpolation is used for resampling.
// Returns: canvas containing transformed image.

function transformImage(image, cropWidth, cropHeight, angle, scale, offsetX, offsetY, backgroundColor) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    // Step 1. Translate, rotate and crop without resampling.

    canvas.width   = Math.round(cropWidth / scale);
    canvas.height  = Math.round(cropHeight / scale);

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(
        cropWidth  / scale / 2 + offsetX / scale,
        cropHeight / scale / 2 + offsetY / scale
    );
    context.rotate(angle);
    context.drawImage(
        image,
        -image.naturalWidth  / 2,
        -image.naturalHeight / 2
    );

    // Step 2. Hermite resampling of the cropped area.

    var srcWidth  = canvas.width;
    var srcHeight = canvas.height;
    var dstWidth  = cropWidth;
    var dstHeight = cropHeight;

    var ratioW = srcWidth / dstWidth;
    var ratioH = srcHeight / dstHeight;
    var halfRatioW = Math.ceil(ratioW / 2);
    var halfRatioH = Math.ceil(ratioH / 2);

    var srcImg = context.getImageData(0, 0, srcWidth, srcHeight);
    var dstImg = context.createImageData(dstWidth, dstHeight);
    var srcData = srcImg.data;
    var dstData = dstImg.data;

    for (var j = 0; j < dstHeight; j++) {
        for (var i = 0; i < dstWidth; i++) {
            var x2 = (i + j * dstWidth) * 4;
            var weight = 0;
            var weights = 0;
            var weightsAlpha = 0;
            var gxR = 0;
            var gxG = 0;
            var gxB = 0;
            var gxA = 0;
            var centerY = (j + 0.5) * ratioH;
            var yyStart = Math.floor(j * ratioH);
            var yyStop = Math.ceil((j + 1) * ratioH);

            for (var yy = yyStart; yy < yyStop; yy++) {
                var dy = Math.abs(centerY - (yy + 0.5)) / halfRatioH;
                var centerX = (i + 0.5) * ratioW;
                var w0 = dy * dy;
                var xxStart = Math.floor(i * ratioW);
                var xxStop = Math.ceil((i + 1) * ratioW);
                for (var xx = xxStart; xx < xxStop; xx++) {
                    var dx = Math.abs(centerX - (xx + 0.5)) / halfRatioW;
                    var w = Math.sqrt(w0 + dx * dx);
                    if (w >= 1) {
                        continue;
                    }
                    // Hermite filter
                    weight = 2 * w * w * w - 3 * w * w + 1;
                    var posX = 4 * (xx + yy * srcWidth);
                    // Alpha
                    gxA += weight * srcData[posX + 3];
                    weightsAlpha += weight;
                    // Colors
                    if (srcData[posX + 3] < 255) {
                        weight = weight * srcData[posX + 3] / 250;
                    }
                    gxR += weight * srcData[posX];
                    gxG += weight * srcData[posX + 1];
                    gxB += weight * srcData[posX + 2];
                    weights += weight;
                }
            }
            dstData[x2 + 0] = gxR / weights;
            dstData[x2 + 1] = gxG / weights;
            dstData[x2 + 2] = gxB / weights;
            dstData[x2 + 3] = gxA / weightsAlpha;
        }
    }

    canvas.width = dstWidth;
    canvas.height = dstHeight;
    context.putImageData(dstImg, 0, 0);

    return canvas;
}
