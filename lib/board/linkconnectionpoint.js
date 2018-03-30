// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    joint = require('joint');

var allBorders = {top: true, left: true, bottom: true, right: true};

function fixBorders(borders) {
    if (!borders) { return allBorders; }
    if (borders.top || borders.left || borders.bottom || borders.right) { return borders; }
    return allBorders;
}

function nearestPointOnBorder(me, other, borders) {
    borders = fixBorders(borders);
    var left =   borders.left   ? Math.abs(me.origin().x - other.origin().x) : Infinity,
        top =    borders.top    ? Math.abs(me.origin().y - other.origin().y) : Infinity,
        right =  borders.right  ? Math.abs(me.corner().x - other.corner().x) : Infinity,
        bottom = borders.bottom ? Math.abs(me.corner().y - other.corner().y) : Infinity,
        min = Math.min(left, top, right, bottom),
        center = me.containsRect(other) ? other.center() : me.center();
    if (min === top) {    return joint.g.point(center.x,      me.origin().y); }
    if (min === left) {   return joint.g.point(me.origin().x, center.y); }
    if (min === bottom) { return joint.g.point(center.x,      me.corner().y); }
    return joint.g.point(me.corner().x, center.y);
}

function perpendicular(me, other) {
    if (me.intersect(other)) { return false; }
    var minX = Math.max(me.origin().x, other.origin().x),
        maxX = Math.min(me.corner().x, other.corner().x),
        minY = Math.max(me.origin().y, other.origin().y),
        maxY = Math.min(me.corner().y, other.corner().y);
    if (minX <= maxX) {
        return me.pointNearestToPoint(joint.g.point((minX + maxX) / 2, other.center().y));
    }
    if (minY <= maxY) {
        return me.pointNearestToPoint(joint.g.point(other.center().x, (minY + maxY) / 2));
    }
    return false;
}

function fixPointByAngle(bbox, angle, point) {
    if (!point) { return; }
    angle = joint.g.normalizeAngle(angle);
    if (angle % 90 === 0) { return point; }
    var rbbox = bbox.bbox(angle),
        center = bbox.center(),
        rorigin = bbox.origin().rotate(center, angle),
        rtopRight = bbox.topRight().rotate(center, angle),
        rcorner = bbox.corner().rotate(center, angle),
        rbottomLeft = bbox.bottomLeft().rotate(center, angle),
        leftLine = joint.g.line(rorigin, rbottomLeft),
        topLine = joint.g.line(rtopRight, rorigin),
        bottomtLine = joint.g.line(rcorner, rbottomLeft),
        rightLine = joint.g.line(rtopRight, rcorner),
        intersectionLine;
    switch (rbbox.sideNearestToPoint(point)) {
    case "top":
        intersectionLine = joint.g.line(point, joint.g.point(point.x, rbbox.corner().y));
        break;
    case "left":
        intersectionLine = joint.g.line(point, joint.g.point(rbbox.origin().x, point.y));
        break;
    case "right":
        intersectionLine = joint.g.line(point, joint.g.point(rbbox.corner().x, point.y));
        break;
    case "bottom":
        intersectionLine = joint.g.line(point, joint.g.point(point.x, rbbox.origin().y));
        break;
    }
    return _.chain([leftLine, topLine, bottomtLine, rightLine])
        .map(_.bind(intersectionLine.intersection, intersectionLine))
        .reduce(function (previousValue, currentValue) {
            if (!currentValue) { return previousValue; }
            if (!previousValue) { return currentValue; }
            if (point.distance(previousValue) > point.distance(currentValue)) { return currentValue; }
            return previousValue;
        }).value();
}

function linkConnectionPoint(linkView, view, magnet, reference) {
    var element = view.model,
        dTargetBorders,
        dTargetAngle = 0,
        dTargetBBox = (function () {
            var link = linkView.model,
                other,
                vertices = link.get('vertices'),
                source = link.get('source').id,
                target = link.get('target').id;
            if (source === element.id) {
                if (vertices && vertices.length > 0) {
                    return joint.g.rect(vertices[0].x, vertices[0].y, 0, 0);
                }
                if (target) {
                    other = link.getTargetElement();
                    dTargetAngle = other.get('angle');
                    dTargetBorders = other.get('borders');
                    return other.getBBox({useModelGeometry: true});
                }
            } else {
                if (vertices && vertices.length > 0) {
                    return joint.g.rect(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y, 0, 0);
                }
                if (source) {
                    other = link.getSourceElement();
                    dTargetAngle = other.get('angle');
                    dTargetBorders = other.get('borders');
                    return other.getBBox({useModelGeometry: true});
                }
            }
            return joint.g.rect(reference.x, reference.y, 0, 0);
        }());
    function defaultConnectionPoint(bbox, targetBBox, angle, targetAngle) {
        targetBBox = targetBBox || dTargetBBox;
        targetAngle = targetAngle || dTargetAngle;
        angle = angle || element.get('angle');
        bbox = bbox || element.getBBox({useModelGeometry: true});
        var rbbox = bbox.bbox(angle),
            rTargetBBox = targetBBox;
        if (rbbox.containsRect(rTargetBBox)) {
            return fixPointByAngle(bbox, angle, nearestPointOnBorder(rbbox, rTargetBBox, dTargetBorders));
        }
        if (rTargetBBox.containsRect(rbbox)) {
            return fixPointByAngle(bbox, angle, nearestPointOnBorder(rbbox, rTargetBBox, element.get('borders')));
        }
        return fixPointByAngle(bbox, angle, perpendicular(rbbox, rTargetBBox)) ||
                bbox.intersectionWithLineFromCenterToPoint(targetBBox.center(), angle) ||
                fixPointByAngle(bbox, angle, rbbox.pointNearestToPoint(targetBBox.center()));
    }
    if (view.model.linkConnectionPoint) {
        return view.model.linkConnectionPoint(linkView, view, magnet, reference, dTargetBBox, dTargetAngle, defaultConnectionPoint);
    }
    return defaultConnectionPoint();
}

exports.linkConnectionPoint = linkConnectionPoint;
