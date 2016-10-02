// Dependencies
var transformImage = window.transformImage;
var saveAs = window.saveAs;
var ImageMarkers = window.ImageMarkers;

function CropComponent(options) {
    this.width = options.width;
    this.height = options.height;
    this.enableFilePicker = options.enableFilePicker;
    this.enableDownload = options.enableDownload;
    this.enableUpload = options.enableUpload;
    this.enableMarkers = options.enableMarkers;
    this.maxMarkerCount = options.maxMarkerCount || 0;
    this.uploadURL = options.uploadURL;

    this.baseScale = 1;
    this.scale = 1;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.imageFilename = '';
    this.imageBlobURL = '';
    this.markers = new ImageMarkers(this.enableMarkers ? this.maxMarkerCount : 0);

    this.dragging = false;
    this.dragStartTime = 0;
    this.dragStartPointerX = 0;
    this.dragStartPointerY = 0;
    this.dragStartOffsetX = 0;
    this.dragStartOffsetY = 0;
    this.dragPreviousX = 0;
    this.dragPreviousY = 0;
    this.dragDistance = 0;

    this.initDOM();
    this.initDOMEvents();

    if (options.imageURL) {
        this.setImage(options.imageURL, options.imageURL);
    }
}

CropComponent.prototype.getDOMNode = function() {
    return this.node;
};

CropComponent.prototype.initDOM = function() {
    var root = document.createElement('div');
    root.className = 'crop-component';
    root.innerHTML =
        '<div class="crop-component-image-box">' +
            '<img class="crop-component-image" alt="">' +
        '</div>' +
        '<div class="crop-component-controls">' +
            '<div class="crop-component-control crop-component-control-file-picker">' +
                '<button class="crop-component-faux-input-file">Choose image</button>' +
                '<input class="crop-component-input-file" type="file" accept="image/*">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<label>Rotate</label>' +
                '<input class="crop-component-input-rotate" type="range" min="-1" max="1" step="0.001" value="0">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<label>Scale</label>' +
                '<input class="crop-component-input-scale" type="range" min="0" max="1" step="0.001" value="0">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<button class="crop-component-download">Download</button>' +
                '<button class="crop-component-upload">Upload</button>' +
            '</div>' +
        '</div>';

    this.node = root;
    this.imageBoxNode = this.node.querySelector('.crop-component-image-box');
    this.imageNode = this.node.querySelector('.crop-component-image');
    this.filePickerSectionNode = this.node.querySelector('.crop-component-control-file-picker');
    this.fauxInputFileNode = this.node.querySelector('.crop-component-faux-input-file');
    this.inputFileNode = this.node.querySelector('.crop-component-input-file');
    this.inputRotateNode = this.node.querySelector('.crop-component-input-rotate');
    this.inputScaleNode = this.node.querySelector('.crop-component-input-scale');
    this.downloadButtonNode = this.node.querySelector('.crop-component-download');
    this.uploadButtonNode = this.node.querySelector('.crop-component-upload');

    this.node.style.width = this.width + 'px';
    this.imageBoxNode.style.width = this.width + 'px';
    this.imageBoxNode.style.height = this.height + 'px';

    this.filePickerSectionNode.style.display = this.enableFilePicker ? '' : 'none';
    this.downloadButtonNode.style.display = this.enableDownload ? '' : 'none';
    this.uploadButtonNode.style.display = this.enableUpload ? '' : 'none';

    this.imageBoxNode.appendChild(this.markers.getDOMNode());
};

CropComponent.prototype.initDOMEvents = function() {
    this.fauxInputFileNode.addEventListener('click',
        this.inputFileNode.click.bind(this.inputFileNode));

    this.inputFileNode.addEventListener('change', this.onFileSelect.bind(this));
    this.inputRotateNode.addEventListener('input', this.onRotationChange.bind(this));
    this.inputScaleNode.addEventListener('input', this.onScaleChange.bind(this));
    this.inputRotateNode.addEventListener('change', this.onRotationChange.bind(this)); // IE
    this.inputScaleNode.addEventListener('change', this.onScaleChange.bind(this)); // IE

    this.imageBoxNode.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));

    this.downloadButtonNode.addEventListener('click', this.download.bind(this));
    this.uploadButtonNode.addEventListener('click', this.upload.bind(this));
};

CropComponent.prototype.setImage = function(imageURL, imageFilename) {
    this.imageNode.onload = function() {
        this.node.classList.add('crop-component-image-selected');
        this.baseScale = Math.min(
            1, // don't upscale tiny images
            this.width  / this.imageNode.naturalWidth,
            this.height / this.imageNode.naturalHeight
        );
    }.bind(this);
    this.imageFilename = imageFilename;
    this.imageNode.src = imageURL;
    this.resetControls();
    this.resetTransform();
    this.applyTransform();

    this.markers.resetMarkers();
    this.markers.resetTransform();
};

CropComponent.prototype.onFileSelect = function(event) {
    if (this.imageBlobURL && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.imageBlobURL);
    }

    this.imageBlobURL = URL.createObjectURL(event.target.files[0]);
    this.setImage(this.imageBlobURL, event.target.value);
};

CropComponent.prototype.resetControls = function() {
    this.inputRotateNode.value = this.inputRotateNode.defaultValue;
    this.inputScaleNode.value = this.inputScaleNode.defaultValue;
};

CropComponent.prototype.resetTransform = function() {
    this.scale = 1;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
};

CropComponent.prototype.getImageBoundingBox = function() {
    var w = this.imageNode.naturalWidth  * this.baseScale * this.scale;
    var h = this.imageNode.naturalHeight * this.baseScale * this.scale;
    var a = this.rotation * Math.PI;
    return {
        width:  Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)),
        height: Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))
    };
};

CropComponent.prototype.applyTransformConstraints = function() {
    // If the image bounding box is leaving the cropped area, push it back.

    var imageAABB = this.getImageBoundingBox();
    var overflowX = Math.max(0, imageAABB.width  - this.width);
    var overflowY = Math.max(0, imageAABB.height - this.height);

    this.offsetX = Math.min(this.offsetX,  overflowX / 2);
    this.offsetX = Math.max(this.offsetX, -overflowX / 2);
    this.offsetY = Math.min(this.offsetY,  overflowY / 2);
    this.offsetY = Math.max(this.offsetY, -overflowY / 2);
};

CropComponent.prototype.applyTransform = function() {
    this.imageNode.style.transform =
        'translate(' + this.offsetX + 'px, ' + this.offsetY + 'px) ' +
        'rotate(' + 180 * this.rotation + 'deg) ' +
        'scale(' + this.scale + ', ' + this.scale + ')';

    this.markers.updateTransform({
        scale: this.scale,
        rotation: this.rotation,
        offsetX: this.width  / 2 + this.offsetX,
        offsetY: this.height / 2 + this.offsetY
    });
};

CropComponent.prototype.updateTransform = function() {
    this.applyTransformConstraints();
    this.applyTransform();
};

CropComponent.prototype.onDragStart = function(event) {
    if (event.which === 1 && !this.markers.wantToHandle(event)) {
        event.preventDefault(); // block native dragging and text selection
        this.dragging = true;
        this.dragStartTime = Date.now();
        this.dragStartPointerX = event.pageX;
        this.dragStartPointerY = event.pageY;
        this.dragStartOffsetX = this.offsetX;
        this.dragStartOffsetY = this.offsetY;
        this.dragPreviousX = event.pageX;
        this.dragPreviousY = event.pageY;
        this.dragDistance = 0;
    }
};

CropComponent.prototype.onDragMove = function(event) {
    if (this.dragging) {
        this.offsetX = this.dragStartOffsetX + event.pageX - this.dragStartPointerX;
        this.offsetY = this.dragStartOffsetY + event.pageY - this.dragStartPointerY;
        this.updateTransform();

        this.dragDistance += Math.sqrt(
            Math.pow(event.pageX - this.dragPreviousX, 2),
            Math.pow(event.pageY - this.dragPreviousY, 2)
        );
        this.dragPreviousX = event.pageX;
        this.dragPreviousY = event.pageY;
    }
};

CropComponent.prototype.onDragEnd = function(event) {
    if (this.dragging && event.which === 1) {
        this.dragging = false;
        if (this.dragDistance < 4 && Date.now() - this.dragStartTime < 500) {
            this.markers.addAtScreenCoords(event.clientX, event.clientY);
        }
    }
};

CropComponent.prototype.onRotationChange = function() {
    var newRotation = this.inputRotateNode.value;

    // Rotate as if the transform origin is at the center of the box.
    var a = (newRotation - this.rotation) * Math.PI;
    var x = this.offsetX;
    var y = this.offsetY;
    this.offsetX = x * Math.cos(a) - y * Math.sin(a);
    this.offsetY = x * Math.sin(a) + y * Math.cos(a);

    this.rotation = newRotation;
    this.updateTransform();
};

CropComponent.prototype.onScaleChange = function() {
    var newScale = Math.pow(10, this.inputScaleNode.value);

    // Scale as if the transform origin is at the center of the box.
    this.offsetX *= newScale / this.scale;
    this.offsetY *= newScale / this.scale;

    this.scale = newScale;
    this.updateTransform();
};

CropComponent.prototype.getTransformedImageFilename = function() {
    var filename = this.imageFilename;
    filename = filename.split(/[\/\\]/).pop(); // strip path
    filename = filename.replace(/\.[^.]*$/g, ''); // strip extension
    filename = filename.trim() || 'image';
    return 'Processed ' + filename + '.jpg';
};

CropComponent.prototype.getTransformedImageBlob = function(callback) {
    var self = this;

    // Since transformImage can block, give UI some time to update.
    setTimeout(function() {
        transformImage(
            self.imageNode,
            self.width, self.height,
            self.rotation * Math.PI,
            self.baseScale * self.scale,
            self.offsetX, self.offsetY,
            '#bebebe',
            function(canvas) {
                canvas.toBlob(callback, 'image/jpeg', 0.95);
            }
        );
    }, 32);
};

CropComponent.prototype.download = function() {
    var self = this;
    self.downloadButtonNode.disabled = true;

    self.getTransformedImageBlob(function(blob) {
        saveAs(blob, self.getTransformedImageFilename());
        self.downloadButtonNode.disabled = false;
    });
};

CropComponent.prototype.upload = function() {
    var self = this;
    self.uploadButtonNode.disabled = true;

    self.getTransformedImageBlob(function(blob) {
        var form = new FormData();
        form.append('image', blob, self.getTransformedImageFilename());
        self.markers.getPoints().forEach(function(point) {
            form.append('x[]', point.x);
            form.append('y[]', point.y);
        });

        var request = new XMLHttpRequest();
        request.open('POST', self.uploadURL);
        request.addEventListener('load', function() {
            // ...
        });
        request.addEventListener('error', function() {
            alert('Upload error');
        });
        request.addEventListener('abort', function() {
            // ...
        });
        request.addEventListener('loadend', function() {
            self.uploadButtonNode.disabled = false;
        });
        request.send(form);
    });
};
