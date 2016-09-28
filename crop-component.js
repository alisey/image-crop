// Dependencies
var transformImage = window.transformImage;
var saveAs = window.saveAs;

function CropComponent(width, height, imageURL) {
    this.width = width;
    this.height = height;
    this.baseScale = 1;
    this.scale = 1;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.imageFilename = '';
    this.dragging = false;
    this.dragStartPointerX = 0;
    this.dragStartPointerY = 0;
    this.dragStartOffsetX = 0;
    this.dragStartOffsetY = 0;

    this.initDOM();
    this.initDOMEvents();

    if (imageURL) {
        this.setImage(imageURL, imageURL);
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
            '<div class="crop-component-control">' +
                '<button class="crop-component-faux-input-file">Choose image</button>' +
                '<input class="crop-component-input-file" type="file" accept="image/*">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<label>Rotate</label>' +
                '<input class="crop-component-input-rotate" type="range" min="-180" max="180" step="0.1" value="0">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<label>Scale</label>' +
                '<input class="crop-component-input-scale" type="range" min="1" max="5" step="0.1" value="1">' +
            '</div>' +
            '<div class="crop-component-control crop-component-control-manipulate">' +
                '<button class="crop-component-download">Download</button>' +
            '</div>' +
        '</div>';

    this.node = root;
    this.imageBoxNode = this.node.querySelector('.crop-component-image-box');
    this.imageNode = this.node.querySelector('.crop-component-image');
    this.fauxInputFileNode = this.node.querySelector('.crop-component-faux-input-file');
    this.inputFileNode = this.node.querySelector('.crop-component-input-file');
    this.inputRotateNode = this.node.querySelector('.crop-component-input-rotate');
    this.inputScaleNode = this.node.querySelector('.crop-component-input-scale');
    this.downloadButtonNode = this.node.querySelector('.crop-component-download');

    this.node.style.width = this.width + 'px';
    this.imageBoxNode.style.width = this.width + 'px';
    this.imageBoxNode.style.height = this.height + 'px';
};

CropComponent.prototype.initDOMEvents = function() {
    this.fauxInputFileNode.addEventListener('click',
        this.inputFileNode.click.bind(this.inputFileNode));
    this.inputFileNode.addEventListener('change', this.onFileSelect.bind(this));
    this.inputRotateNode.addEventListener('input', this.onRotationChange.bind(this));
    this.inputScaleNode.addEventListener('input', this.onScaleChange.bind(this));
    this.inputRotateNode.addEventListener('change', this.onRotationChange.bind(this)); // IE
    this.inputScaleNode.addEventListener('change', this.onScaleChange.bind(this)); // IE
    this.downloadButtonNode.addEventListener('click', this.onDownloadClick.bind(this));
    this.imageBoxNode.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
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
};

CropComponent.prototype.onFileSelect = function(event) {
    var fileReader = new FileReader();
    fileReader.addEventListener('load', function() {
        var blob = new Blob([fileReader.result]);
        var blobURL = URL.createObjectURL(blob);
        this.setImage(blobURL, event.target.value);
    }.bind(this));
    fileReader.readAsArrayBuffer(event.target.files[0]);
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

CropComponent.prototype.applyTransformConstraints = function() {
    // Just making sure we don't offset the image beyond
    // its axis-aligned bounding box.

    var imageAABB = this.imageNode.getBoundingClientRect();
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
        'rotate(' + this.rotation + 'deg) ' +
        'scale(' + this.scale + ', ' + this.scale + ')';
};

CropComponent.prototype.onDragStart = function(event) {
    if (event.which === 1) {
        event.preventDefault(); // block native dragging and text selection
        this.dragging = true;
        this.dragStartPointerX = event.pageX;
        this.dragStartPointerY = event.pageY;
        this.dragStartOffsetX = this.offsetX;
        this.dragStartOffsetY = this.offsetY;
    }
};

CropComponent.prototype.onDragMove = function(event) {
    if (this.dragging) {
        this.offsetX = this.dragStartOffsetX + event.pageX - this.dragStartPointerX;
        this.offsetY = this.dragStartOffsetY + event.pageY - this.dragStartPointerY;
        this.applyTransformConstraints();
        this.applyTransform();
    }
};

CropComponent.prototype.onDragEnd = function(event) {
    if (event.which === 1) {
        this.dragging = false;
    }
};

CropComponent.prototype.onRotationChange = function() {
    this.rotation = this.inputRotateNode.value;
    this.applyTransformConstraints();
    this.applyTransform();
};

CropComponent.prototype.onScaleChange = function() {
    this.scale = this.inputScaleNode.value;
    this.applyTransformConstraints();
    this.applyTransform();
};

CropComponent.prototype.getDownloadFilename = function(originalFilename, extension) {
    var filename = originalFilename;
    filename = filename.split(/[\/\\]/).pop(); // strip path
    filename = filename.replace(/\.[^.]*$/g, ''); // strip extension
    filename = filename.trim() || 'image';
    return 'Cropped ' + filename + '.' + extension;
};

CropComponent.prototype.onDownloadClick = function() {
    var canvas = transformImage(
        this.imageNode,
        this.width, this.height,
        this.rotation * Math.PI / 180,
        this.baseScale * this.scale,
        this.offsetX, this.offsetY,
        '#bebebe'
    );

    canvas.toBlob(function(blob) {
        saveAs(blob, this.getDownloadFilename(this.imageFilename, 'jpg'));
    }.bind(this), 'image/jpeg', 0.95);
};
