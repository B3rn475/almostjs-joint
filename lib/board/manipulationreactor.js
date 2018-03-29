// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    backbone = require('backbone'),
    joint = require('joint'),
    mousetrap = require('mousetrap'),
    navigator = require('navigator'),
    createResizeReactor = require('./resizereactor').ResizeReactor,
    createRotateReactor = require('./rotatereactor').RotateReactor;

function propertyChecker(property, defaultValue) {
    return function (model) {
        if (model[property] === undefined) { return defaultValue; }
        if (typeof model[property] === 'function') { return model[property](); }
        return model[property];
    };
}

function isMultiselect(e) {
    if (navigator.platform.substr(0, 3).toLowerCase() === 'mac') { return e.metaKey; }
    return e.ctrlKey;
}

var canResize = propertyChecker('resizable', false),
    canRotate = propertyChecker('rotatable', false);

function ManipulationReactor(options) {
    if (!(this instanceof ManipulationReactor)) { return new ManipulationReactor(options); }
    _.extend(this, backbone.Events);
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (options.actions && !Array.isArray(options.actions)) { throw new Error('actions option should be an array'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }
    if (typeof options.gridSize !== 'number') { throw new Error('gridSize option is mandatory and has to be a number'); }
    if (options.gridSize < 0) { throw new Error('gridSize cannot be less than zero'); }
    if (!options.undoReactor || typeof options.undoReactor !== 'object') { throw new Error('undoReactor option is mandatory'); }

    var self = this,
        el = $($(options.el)[0]),
        paper = options.paper,
        model = options.model,
        gridSize = options.gridSize,
        actions = options.actions || [exports.edit, exports.delete],
        resize = options.resize === undefined ? true : !!options.resize,
        rotate = options.resize === undefined ? true : !!options.rotate,
        magnetize = options.magnetize === undefined ? true : !!options.magnetize,
        selectedViews = {},
        undoReactor = options.undoReactor;

    el.attr('tabindex', 1);

    function updateManipulator(element) {
        if (element.isLink()) { return; }
        var bundle = selectedViews[element.id],
            bbox,
            angle;
        if (!bundle) { return; }
        bbox = bundle.view.getBBox({useModelGeometry: true});
        bundle.el
            .css('left', bbox.x - gridSize)
            .css('top', bbox.y - gridSize)
            .css('width', bbox.width + 2 * gridSize)
            .css('height', bbox.height + 2 * gridSize);
        angle = element.get('angle');
        $(bundle.el.find('.almost-joint-marker-rotate'))
            .css('left', (bbox.width + 94) / 2 * (1 + Math.cos(joint.g.toRad(angle))) - 36)
            .css('top', (bbox.height + 94) / 2 * (1 + Math.sin(joint.g.toRad(angle))) - 36);
    }

    function updateManipulators() {
        _.map(selectedViews, function (bundle) {
            updateManipulator(bundle.view.model);
        });
    }

    function closeManipulator(element) {
        var bundle = selectedViews[element.id];
        if (!bundle) { return; }
        if (bundle.view.model.demagnetize) { bundle.view.model.demagnetize(); }
        bundle.el.remove();
        bundle.view.off('change:position change:size', updateManipulator);
        delete selectedViews[element.id];
    }

    function closeManipulators(currentid) {
        _.map(selectedViews, function (bundle, id) {
            if (id === currentid) { return; }
            closeManipulator(bundle.view.model);
        });
    }

    function toggleManipulator(cellView, evt) {
        if (cellView.model.isLink()) { return; }
        if (!isMultiselect(evt)) { closeManipulators(cellView.model.id); }
        var id = cellView.model.id,
            bundle = selectedViews[id],
            tab;
        if (!bundle) {
            bundle = selectedViews[cellView.model.id] = {
                el: (function () {var manipulator = $(require('./manipulator.html')); el.append(manipulator); return manipulator; }()),
                view: cellView,
            };
            bundle.view.model.on('change:position change:size change:angle', updateManipulator);
            bundle.view.model.on('change:id', function () {
                delete selectedViews[id];
                id = this.id;
                selectedViews[this.id] = bundle;
            });
            tab = $(bundle.el.find('.almost-joint-marker-tab'));
            bundle.context = {
                undoReactor: undoReactor,
                close: function () {
                    closeManipulator(bundle.view.model);
                }
            };
            if (magnetize && bundle.view.model.magnetize && bundle.view.model.demagnetize) {
                (function () {
                    var linkmarker = $(_.first($(require('./link.svg')))),
                        movemarker = $(_.first($(require('./move.svg'))));
                    linkmarker.on('click', function () {
                        var res = bundle.view.model.magnetize();
                        if (res === undefined || res) {
                            linkmarker.after(movemarker);
                            linkmarker.detach();
                        }
                    });
                    movemarker.on('click', function () {
                        bundle.view.model.demagnetize();
                        movemarker.after(linkmarker);
                        movemarker.detach();
                    });
                    bundle.magnetizeCycle = function () {
                        if (movemarker.parent().length) {
                            movemarker.click();
                            linkmarker.click();
                        }
                    };
                    tab.append(linkmarker);
                }());
            }
            _.forEach(actions, function (action) {
                if (action.checker(cellView.model)) {
                    if (action.click) {
                        (function () {
                            function click() {
                                action.click.call(bundle.context, bundle.view);
                            }
                            tab.append($(action.marker).clone().on('click', click));
                        }());
                    }
                    if (action.event) {
                        (function () {
                            var trigger = function () {
                                self.trigger('cell:' + action.event, bundle.view);
                            };
                            tab.append($(action.marker).clone().on('click', trigger));
                        }());
                    }
                }
            });
            if (resize && canResize(cellView.model)) {
                bundle.el.addClass('almost-joint-resizable');
                ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].forEach(function (direction) {
                    bundle.el.find('.almost-joint-marker-' + direction).on('mousedown', function () {
                        createResizeReactor({view: bundle.view, paper: paper, model: model, el: el, direction: direction, gridSize: gridSize, undoReactor: undoReactor});
                    });
                });
            }
            if (rotate && canRotate(cellView.model)) {
                bundle.el.addClass('almost-joint-rotatable');
                bundle.el.find('.almost-joint-marker-rotate').on('mousedown', function () {
                    createRotateReactor({view: bundle.view, paper: paper, model: model, el: el, angleStep: 15, undoReactor: undoReactor});
                });
            }
            updateManipulator(cellView.model);
        }
    }

    function mouseover() {
        el.focus();
    }

    paper.on('cell:pointerdown', toggleManipulator);
    paper.on('scale translate', updateManipulators);
    paper.on('cell:pointermove', function (cellView) { updateManipulator(cellView.model); });
    model.on('change:target', function (link) {
        var bundle = selectedViews[link.get('source').id];
        link.toFront();
        if (!bundle || !bundle.view.model.magnetize || !bundle.view.model.demagnetize) { return; }
        bundle.magnetizeCycle();
    });
    model.on('remove', function (element) {
        closeManipulator(element);
    });
    el.mouseover(mouseover);

    mousetrap(el[0]).bind('esc', _.ary(closeManipulators, 0));
    paper.on('blank:pointerdown', _.ary(closeManipulators, 0));
    _.forEach(actions, function (action) {
        if (action.shortcut) {
            mousetrap(el[0]).bind(action.shortcut, function () {
                _.forEach(selectedViews, function (bundle) {
                    if (action.checker(bundle.view.model)) {
                        if (action.click) {
                            action.click.call(bundle.context, bundle.view);
                        }
                        if (action.event) {
                            self.trigger('cell:' + action.event, bundle.view);
                        }
                    }
                });
            });
        }
    });
}

exports.ManipulationReactor = ManipulationReactor;


exports.delete = {
    marker: require('./delete.svg'),
    checker: propertyChecker('deletable', true),
    click: function (view) {
        this.undoReactor.start();
        view.model.remove();
        this.undoReactor.stop();
        this.close();
    },
    shortcut: 'del'
};
exports.edit = {
    marker: require('./edit.svg'),
    checker: propertyChecker('editable', false),
    event: 'edit'
};
