// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    navigator = require('navigator'),
    joint = require('joint'),
    mousetrap = require('mousetrap'),
    addToHistory = require('./addtohistory'),
    optimizeHistory = require('./optimizehistory'),
    utils = require('../../utils');

function UndoReactor(options) {
    if (!(this instanceof UndoReactor)) { return new UndoReactor(options); }
    options = options || {};

    if (!options.model || typeof options.model !== 'object' || !(options.model instanceof joint.dia.Graph)) { throw new Error('model option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }

    var self = this,
        el = $(options.el)[0],
        model = options.model,
        undoing = false,
        redoing = false,
        record = true,
        environments = [],
        changes = {
            history: [],
            future: []
        };

    function currentChangesStack() {
        if (!record) {
            return [];
        }
        if (undoing) {
            return changes.future;
        }
        if (redoing) {
            return changes.history;
        }
        changes.future.length = 0;
        return changes.history;
    }

    function reapply(history) {
        _([history]).flattenDeep()
            .forEachRight(function (step) {
                if (step.id) {
                    utils.changeId(step.model, step.id);
                }
                if (step.delta) {
                    step.model.set(step.delta);
                }
                if (step.add) {
                    step.model.remove();
                }
                if (step.remove) {
                    model.addCell(step.model);
                }
            }).commit();
    }

    model.on('add', function (elem) {
        var stack,
            target;
        if (elem.isLink() && !(undoing || redoing)) {
            target = elem.get('target');
            if (!(target && target.id)) {
                self.start();
            }
        }
        stack = currentChangesStack();
        stack.push({
            model: elem,
            add: true
        });
    });

    function shouldStart(elem, changedAttributes) {
        var endpoint;
        if (undoing || redoing) {
            return false;
        }
        if (elem.isLink()) {
            if (changedAttributes.source) {
                endpoint = elem.previous('source');
                if (endpoint && endpoint.id) {
                    endpoint = elem.get('source');
                    if (!(endpoint && endpoint.id)) {
                        return true;
                    }
                }
            }
            if (changedAttributes.target) {
                endpoint = elem.previous('target');
                if (endpoint && endpoint.id) {
                    endpoint = elem.get('target');
                    if (!(endpoint && endpoint.id)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function shouldStop(elem, changedAttributes) {
        var endpoint;
        if (undoing || redoing) {
            return false;
        }
        if (elem.isLink()) {
            if (changedAttributes.source) {
                endpoint = elem.get('source');
                if (endpoint && endpoint.id) {
                    endpoint = elem.previous('source');
                    if (!(endpoint && endpoint.id)) {
                        return true;
                    }
                }
            }
            if (changedAttributes.target) {
                endpoint = elem.get('target');
                if (endpoint && endpoint.id) {
                    endpoint = elem.previous('target');
                    if (!(endpoint && endpoint.id)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    model.on('change', function (elem, opt) {
        var stack,
            changedAttributes = elem.changedAttributes(),
            entry;
        delete changedAttributes.attrs;
        if (!_.keys(changedAttributes).length) {
            return;
        }
        if (shouldStart(elem, changedAttributes)) {
            self.start();
        }
        stack = currentChangesStack();
        entry = {
            model: elem,
            delta: _.mapValues(changedAttributes, function (value, key) {
                _.noop(value);
                return elem.previous(key);
            })
        };
        if (entry.delta.id) {
            entry.id = entry.delta.id;
            delete entry.delta.id;
        }
        addToHistory(stack, entry, opt);
        if (shouldStop(elem, changedAttributes)) {
            self.stop();
        }
    });
    model.on('remove', function (elem) {
        var stack = currentChangesStack();
        stack.push({
            model: elem,
            remove: true
        });
    });

    self.start = function () {
        changes.future.length = 0;
        environments.push(changes);
        changes = {
            history: [],
            future: []
        };
    };

    self.stop = function () {
        if (!environments.length) {
            return;
        }
        var history = optimizeHistory(changes.history);
        changes = environments.pop();
        if (history.length) {
            if (history.length === 1) {
                history = _.head(history);
            }
            changes.history.push(history);
            return true;
        }
        return false;
    };

    self.undo = function (save) {
        if (arguments.length < 1) {
            save = true;
        }
        if (!changes.history.length) {
            return;
        }
        undoing = true;
        record = save;
        var step = changes.history.pop(),
            future = changes.future.slice();
        self.start();
        reapply(step);
        future.push(_.flattenDeep(changes.future));
        self.stop();
        changes.future = future;
        undoing = false;
        record = true;
    };

    self.redo = function () {
        if (!changes.future.length) {
            return;
        }
        redoing = true;
        var step = changes.future.pop(),
            future = changes.future.slice();
        self.start();
        reapply(step);
        self.stop();
        changes.future = future;
        redoing = false;
    };

    self.clear = function () {
        environments = [];
        changes = {
            history: [],
            future: []
        };
    };

    mousetrap(el).bind('mod+z', function () {
        self.undo();
        return false;
    });
    mousetrap(el).bind(/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'mod+shift+z' : 'mod+y', function () {
        self.redo();
        return false;
    });
}

exports.UndoReactor = UndoReactor;
