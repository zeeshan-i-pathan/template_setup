'use strict';

var utils = require('../utils/writer.js');
var Default = require('../service/DefaultService');

module.exports.pdfToBase64POST = function pdfToBase64POST (req, res, next) {
  Default.pdfToBase64POST(req)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
