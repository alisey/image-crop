function ImageMarkers(maxCount) {
    this.maxCount = maxCount;
    this.markers = [];

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
    if (this.markers.length < this.maxCount) {
        var markerNode = document.createElement('div');
        this.node.appendChild(markerNode);
        this.markers.push({x: x, y: y, node: markerNode});
    } else {
        var closest = this.findClosestMarker(x, y);
        if (closest) {
            closest.x = x;
            closest.y = y;
        }
    }
    this.redraw();
};

ImageMarkers.prototype.addAtScreenCoords = function(screenX, screenY) {
    var box = this.node.getBoundingClientRect();
    this.add(screenX - box.left, screenY - box.top);
};

ImageMarkers.prototype.redraw = function() {
    this.markers.forEach(function(marker) {
        marker.node.style.left = marker.x + 'px';
        marker.node.style.top  = marker.y + 'px';
    });
};

ImageMarkers.prototype.getPoints = function() {
    return this.markers.map(function(marker) {
        return {x: marker.x, y: marker.y};
    });
};

ImageMarkers.prototype.findClosestMarker = function(x, y) {
    var closest = null;
    var minDistance = Infinity;
    this.markers.forEach(function(m) {
        var distance = Math.sqrt(Math.pow(m.x - x, 2) + Math.pow(m.y - y, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closest = m;
        }
    });
    return closest;
};

ImageMarkers.prototype.onMouseDown = function(event) {
    if (event.which === 1) {
        this.markers.forEach(function(marker) {
            if (marker.node === event.target) {
                event.preventDefault();
                this.dragging = true;
                this.dragPreviousX = event.pageX;
                this.dragPreviousY = event.pageY;
                this.dragItem = marker;
            }
        }.bind(this));
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

