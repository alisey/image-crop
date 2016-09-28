// Dependencies
var pica = window.pica;

// We start with the image centered in the crop box, then apply offset,
// rotation, and scaling with transform origin at the center of the image.
// If the image does not fully cover the crop box, transparent pixels are filled
// with backgroundColor.

function transformImage(image, cropWidth, cropHeight, angle, scale, offsetX, offsetY, backgroundColor, callback) {
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

    // Step 2. Lanczos resampling.

    var resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = cropWidth;
    resizedCanvas.height = cropHeight;
    pica.resizeCanvas(canvas, resizedCanvas,
        {
            unsharpAmount: 40,
            unsharpRadius: 0.6,
            unsharpThreshold: 2
        },
        function() {
            callback(resizedCanvas);
        }
    );
}
