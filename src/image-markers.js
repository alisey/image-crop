function ImageMarkers(maxCount) {
    this.maxCount = maxCount;
    this.markers = [];

    this.scale    = 1;
    this.rotation = 0;
    this.offsetX  = 0;
    this.offsetY  = 0;

    this.dragging  = false;
    this.dragLastX = 0;
    this.dragLastY = 0;
    this.dragItem  = null;

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
        // The least recently used marker is replaced first.
        var removedMarker = this.markers.shift();
        this.node.removeChild(removedMarker.node);
    }

    this.redraw();
};

ImageMarkers.prototype.addAtWindowCoords = function(windowX, windowY) {
    var origin = this.node.getBoundingClientRect();
    this.add(windowX - origin.left, windowY - origin.top);
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
                // Block native drag and drop, and text selection.
                event.preventDefault();

                this.dragging  = true;
                this.dragLastX = event.pageX;
                this.dragLastY = event.pageY;
                this.dragItem  = marker;

                // The marker most recently interacted with is the last to
                // be replaced when adding new markers.
                this.markers.splice(i, 1);
                this.markers.push(marker);
                break;
            }
        }
    }
};

ImageMarkers.prototype.onMouseMove = function(event) {
    if (this.dragging) {
        this.dragItem.x += event.pageX - this.dragLastX;
        this.dragItem.y += event.pageY - this.dragLastY;
        this.dragLastX = event.pageX;
        this.dragLastY = event.pageY;
        this.redraw();
    }
};

ImageMarkers.prototype.onMouseUp = function(event) {
    if (this.dragging && event.which === 1) {
        this.dragging = false;
    }
};

ImageMarkers.prototype.wantToHandleDrag = function(event) {
    return this.node.contains(event.target);
};

ImageMarkers.prototype.setTransform = function(transform) {
    this.scale    = transform.scale;
    this.rotation = transform.rotation;
    this.offsetX  = transform.offsetX;
    this.offsetY  = transform.offsetY;
};

ImageMarkers.prototype.updateTransform = function(transform) {
    this.markers.forEach(function(marker) {
        var x = marker.x - this.offsetX;
        var y = marker.y - this.offsetY;

        x *= transform.scale / this.scale;
        y *= transform.scale / this.scale;

        var a = (transform.rotation - this.rotation) * Math.PI;
        marker.x = x * Math.cos(a) - y * Math.sin(a);
        marker.y = x * Math.sin(a) + y * Math.cos(a);

        marker.x += transform.offsetX;
        marker.y += transform.offsetY;
    }.bind(this));

    this.setTransform(transform);
    this.redraw();
};

ImageMarkers.prototype.removeAll = function() {
    for (var i = 0; i < this.markers.length; i++) {
        this.node.removeChild(this.markers[i].node);
    }
    this.markers = [];
};
