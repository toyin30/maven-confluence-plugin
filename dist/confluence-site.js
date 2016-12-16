"use strict";
var xml = require("xml2js");
var filesystem = require("fs");
var Rx = require("rx");
(function (ElementType) {
    ElementType[ElementType["PAGE"] = 0] = "PAGE";
    ElementType[ElementType["ATTACHMENT"] = 1] = "ATTACHMENT";
})(exports.ElementType || (exports.ElementType = {}));
var ElementType = exports.ElementType;
var toPage = function (v) {
    return Object.assign(v, { type: ElementType.PAGE });
};
var toAttachment = function (v) {
    return Object.assign(v, { type: ElementType.ATTACHMENT });
};
function rxProcessChild(child) {
    if (!child || child.length == 0)
        return Rx.Observable.empty();
    var first = child[0];
    var childObservable = Rx.Observable.just(first).map(toPage);
    var attachmentsObservable = Rx.Observable.fromArray(first['attachment'] || []).map(toAttachment);
    var childrenObservable = Rx.Observable.fromArray(first['child'] || [])
        .concatMap(function (value) {
        var o1 = Rx.Observable.just(value).map(toPage);
        var o2 = Rx.Observable.fromArray(value['attachment'] || []).map(toAttachment);
        var o3 = rxProcessChild(value['child'] || []).map(toPage);
        return Rx.Observable.concat(o1, o2, o3);
    });
    return Rx.Observable.concat(childObservable, attachmentsObservable, childrenObservable);
}
var parser = new xml.Parser();
var rxReadFile = Rx.Observable.fromNodeCallback(filesystem.readFile);
var rxParseString = Rx.Observable.fromNodeCallback(parser.parseString);
function rxSite(sitePath) {
    return rxReadFile(sitePath)
        .flatMap(function (value) { return rxParseString(value.toString()); })
        .doOnCompleted(function () { return console.log('Done'); })
        .map(function (value) {
        for (var first in value)
            return value[first]['home'];
    })
        .flatMap(function (value) { return rxProcessChild(value); });
}
exports.rxSite = rxSite;