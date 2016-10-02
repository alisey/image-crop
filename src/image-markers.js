function ImageMarkers(maxCount) {
    this.maxCount = maxCount;
    this.markers = [];

    this.transformOriginX = 0;
    this.transformOriginY = 0;
    this.scale = 1;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.dragging = false;
    this.dragPreviousY = 0;
    this.dragPreviousX = 0;
    this.dragItem = null;

    this.node = document.createElement('div');
    this.node.className = 'image-markers';
    this.initDOMEvents();
}

ImageMarkers.prototype.getDOMNode = function() {
    return this.node;
};

ImageMarkers.prototype.initDOMEvents = function() {
    this.node.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
};

ImageMarkers.prototype.add = function(x, y) {
    var markerNode = document.createElement('div');
    markerNode.appendChild(document.createElement('div'));
    this.node.appendChild(markerNode);
    this.markers.push({x: x, y: y, node: markerNode});

    if (this.markers.length > this.maxCount) {
        this.node.removeChild(this.markers.shift().node);
    }

    this.redraw();
};

ImageMarkers.prototype.addAtScreenCoords = function(screenX, screenY) {
    var box = this.node.getBoundingClientRect();
    this.add(screenX - box.left, screenY - box.top);
};

ImageMarkers.prototype.redraw = function() {
    this.markers.forEach(function(marker) {
        marker.node.style.transform = 'translate(' + marker.x + 'px, ' + marker.y + 'px)';
    });
};

ImageMarkers.prototype.getPoints = function() {
    return this.markers.map(function(marker) {
        return {x: Math.round(marker.x), y: Math.round(marker.y)};
    });
};

ImageMarkers.prototype.onMouseDown = function(event) {
    if (event.which === 1) {
        for (var i = 0; i < this.markers.length; i++) {
            var marker = this.markers[i];
            if (marker.node.contains(event.target)) {
                event.preventDefault();
                this.dragging = true;
                this.dragPreviousX = event.pageX;
                this.dragPreviousY = event.pageY;
                this.dragItem = marker;

                // Make the most recently used item the last candidate for deletion.
                this.markers.push(this.markers.splice(i, 1).pop());
            }
        }
    }
};

ImageMarkers.prototype.onMouseMove = function(event) {
    if (this.dragging) {
        this.dragItem.x += event.pageX - this.dragPreviousX;
        this.dragItem.y += event.pageY - this.dragPreviousY;
        this.dragPreviousX = event.pageX;
        this.dragPreviousY = event.pageY;
        this.redraw();
    }
};

ImageMarkers.prototype.onMouseUp = function(event) {
    if (this.dragging && event.which === 1) {
        this.dragging = false;
    }
};

ImageMarkers.prototype.wantToHandle = function(event) {
    return this.node.contains(event.target);
};

ImageMarkers.prototype.setTransformOrigin = function(x, y) {
    this.transformOriginX = x;
    this.transformOriginY = y;
};

ImageMarkers.prototype.updateTransform = function(transform) {
    this.markers.forEach(function(marker) {
        var x = marker.x - this.transformOriginX - this.offsetX;
        var y = marker.y - this.transformOriginY - this.offsetY;

        x *= transform.scale / this.scale;
        y *= transform.scale / this.scale;

        var a = (transform.rotation - this.rotation) * Math.PI;
        marker.x = x * Math.cos(a) - y * Math.sin(a);
        marker.y = x * Math.sin(a) + y * Math.cos(a);

        marker.x += this.transformOriginX + transform.offsetX;
        marker.y += this.transformOriginY + transform.offsetY;
    }.bind(this));

    this.scale = transform.scale;
    this.rotation = transform.rotation;
    this.offsetX = transform.offsetX;
    this.offsetY = transform.offsetY;

    this.redraw();
};

ImageMarkers.prototype.resetTransform = function() {
    this.scale = 1;
    this.rotation = 0;
    this.offsetX = 0;
    this.offsetY = 0;
};

ImageMarkers.prototype.resetMarkers = function() {
    for (var i = 0; i < this.markers.length; i++) {
        this.node.removeChild(this.markers[i].node);
    }
    this.markers = [];
};
