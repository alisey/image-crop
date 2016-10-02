// Dependencies
var transformImage = window.transformImage;
var saveAs = window.saveAs;
var ImageMarkers = window.ImageMarkers;

function CropComponent(options) {
    this.width            = options.width;
    this.height           = options.height;
    this.backgroundColor  = options.backgroundColor;
    this.enableFilePicker = options.enableFilePicker;
    this.enableDownload   = options.enableDownload;
    this.enableUpload     = options.enableUpload;
    this.maxMarkerCount   = options.enableMarkers && options.maxMarkerCount;
    this.uploadURL        = options.uploadURL;

    this.imageFilename = '';
    this.markers = new ImageMarkers(this.maxMarkerCount || 0);

    this.resetDrag();
    this.resetTransform();
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
    this.node = document.createElement('div');
    this.node.className = 'crop-component';
    this.node.innerHTML =
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

    this.imageBoxNode          = this.node.querySelector('.crop-component-image-box');
    this.imageNode             = this.node.querySelector('.crop-component-image');
    this.filePickerSectionNode = this.node.querySelector('.crop-component-control-file-picker');
    this.fauxInputFileNode     = this.node.querySelector('.crop-component-faux-input-file');
    this.inputFileNode         = this.node.querySelector('.crop-component-input-file');
    this.inputRotateNode       = this.node.querySelector('.crop-component-input-rotate');
    this.inputScaleNode        = this.node.querySelector('.crop-component-input-scale');
    this.downloadButtonNode    = this.node.querySelector('.crop-component-download');
    this.uploadButtonNode      = this.node.querySelector('.crop-component-upload');

    this.node.style.width          = this.width  + 'px';
    this.imageBoxNode.style.width  = this.width  + 'px';
    this.imageBoxNode.style.height = this.height + 'px';

    this.filePickerSectionNode.style.display = this.enableFilePicker ? '' : 'none';
    this.downloadButtonNode.style.display    = this.enableDownload   ? '' : 'none';
    this.uploadButtonNode.style.display      = this.enableUpload     ? '' : 'none';

    this.imageBoxNode.style.backgroundColor = this.backgroundColor;

    this.imageBoxNode.appendChild(this.markers.getDOMNode());
};

CropComponent.prototype.initDOMEvents = function() {
    this.fauxInputFileNode.addEventListener('click',
        this.inputFileNode.click.bind(this.inputFileNode));

    this.inputFileNode.addEventListener('change',   this.onFileSelect.bind(this));
    this.inputRotateNode.addEventListener('input',  this.onRotationChange.bind(this));
    this.inputScaleNode.addEventListener('input',   this.onScaleChange.bind(this));
    this.inputRotateNode.addEventListener('change', this.onRotationChange.bind(this)); // IE
    this.inputScaleNode.addEventListener('change',  this.onScaleChange.bind(this)); // IE

    this.imageBoxNode.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove',          this.onMouseMove.bind(this));
    document.addEventListener('mouseup',            this.onMouseUp.bind(this));

    this.downloadButtonNode.addEventListener('click', this.download.bind(this));
    this.uploadButtonNode.addEventListener('click',   this.upload.bind(this));
};

CropComponent.prototype.reset = function() {
    this.resetDrag();
    this.resetControls();
    this.resetTransform();
    this.updateTransformStyle();
    this.markers.removeAll();
};

CropComponent.prototype.resetControls = function() {
    this.inputRotateNode.value = this.inputRotateNode.defaultValue;
    this.inputScaleNode.value = this.inputScaleNode.defaultValue;
};

// =========================== DRAGGING ======================================

CropComponent.prototype.resetDrag = function() {
    this.dragging = false;

    this.dragStartRelativeX = 0;
    this.dragStartRelativeY = 0;

    // For detecting drag vs. click
    this.dragLastX     = 0;
    this.dragLastY     = 0;
    this.dragStartTime = 0;
    this.dragDistance  = 0;
};

CropComponent.prototype.onMouseDown = function(event) {
    if (event.which === 1 && !this.markers.wantToHandleDrag(event)) {
        // Block native drag and drop, and text selection.
        event.preventDefault();

        this.dragging = true;

        this.dragStartRelativeX = this.offsetX - event.pageX;
        this.dragStartRelativeY = this.offsetY - event.pageY;

        this.dragLastX     = event.pageX;
        this.dragLastY     = event.pageY;
        this.dragStartTime = Date.now();
        this.dragDistance  = 0;
    }
};

CropComponent.prototype.onMouseMove = function(event) {
    if (this.dragging) {
        this.offsetX = event.pageX + this.dragStartRelativeX;
        this.offsetY = event.pageY + this.dragStartRelativeY;
        this.updateTransform();

        var dx = event.pageX - this.dragLastX;
        var dy = event.pageY - this.dragLastY;
        this.dragDistance += Math.sqrt(dx * dx + dy * dy);
        this.dragLastX = event.pageX;
        this.dragLastY = event.pageY;
    }
};

CropComponent.prototype.onMouseUp = function(event) {
    if (this.dragging && event.which === 1) {
        this.dragging = false;

        var dragDistance = this.dragDistance;
        var dragDuration = Date.now() - this.dragStartTime;
        if (dragDistance < 4 && dragDuration < 500) {
            this.markers.addAtScreenCoords(event.clientX, event.clientY);
        }
    }
};

// =============================== TRANSFORMS ================================

CropComponent.prototype.resetTransform = function() {
    // The image's transform origin is at the center of the container.
    // `baseScale` is the initial scale factor applied to fit the image into
    // the container. While it could be combined with `scale`, it's more
    // convenient to have a separate `scale` going from 1.

    this.baseScale = 1;
    this.scale     = 1;
    this.rotation  = 0;
    this.offsetX   = 0;
    this.offsetY   = 0;

    this.markers.setTransform(this.getTransformForMarkers());
};

CropComponent.prototype.getTransformForMarkers = function() {
    // Markers' transform origin is at the top left corner of the container,
    // while the image's transform origin is at the center of the container.

    return {
        scale:    this.scale,
        rotation: this.rotation,
        offsetX:  this.width  / 2 + this.offsetX,
        offsetY:  this.height / 2 + this.offsetY
    };
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

CropComponent.prototype.updateTransformConstraints = function() {
    // Don't allow to completely drag the image out of the container.
    // If there's a gap between the axis-aligned bounding box of the image
    // and the container, push the image back by the size of the gap.
    // If there are gaps on both sides, e.g. when the image is smaller than
    // the container, equalize the gaps.

    var imageAABB = this.getImageBoundingBox();
    var overflowX = Math.max(0, imageAABB.width  - this.width);
    var overflowY = Math.max(0, imageAABB.height - this.height);

    this.offsetX = Math.min(this.offsetX,  overflowX / 2);
    this.offsetX = Math.max(this.offsetX, -overflowX / 2);
    this.offsetY = Math.min(this.offsetY,  overflowY / 2);
    this.offsetY = Math.max(this.offsetY, -overflowY / 2);
};

CropComponent.prototype.updateTransformStyle = function() {
    this.imageNode.style.transform =
        'translate(' + this.offsetX + 'px, ' + this.offsetY + 'px) ' +
        'rotate(' + 180 * this.rotation + 'deg) ' +
        'scale(' + this.scale + ', ' + this.scale + ')';
};

CropComponent.prototype.updateTransform = function() {
    this.updateTransformConstraints();
    this.updateTransformStyle();
    this.markers.updateTransform(this.getTransformForMarkers());
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

// ============================== INPUT / OUTPUT =============================

CropComponent.prototype.setImage = function(imageURL, imageFilename) {
    this.imageNode.onload = function() {
        if (URL.revokeObjectURL) {
            URL.revokeObjectURL(imageURL);
        }

        this.node.classList.add('crop-component-image-selected');
        this.baseScale = Math.min(
            1, // don't upscale tiny images
            this.width  / this.imageNode.naturalWidth,
            this.height / this.imageNode.naturalHeight
        );
    }.bind(this);

    this.reset();
    this.imageFilename = imageFilename;
    this.imageNode.src = imageURL;
};

CropComponent.prototype.onFileSelect = function(event) {
    var url = URL.createObjectURL(event.target.files[0]);
    this.setImage(url, event.target.value);
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
            self.backgroundColor,
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
