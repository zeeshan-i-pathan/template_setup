'use strict';


/**
 *
 * returns convertResponse
 **/
exports.pdfToBase64POST = function(req) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    var convertedData = {
      "organization" : req.body.organization_id,
      "version" : 1,
      effectiveDT : new Date().toISOString(),
      expiryDT: new Date().toISOString().replace(/[0-9]{4}/,"2999"),
      "status" : "ACTIVE",
      "template": {},
      "templateKey" : req.body.templateKey,
      "tid": req.body.templateKey 
    }
    convertedData.template.file = req.files[0].mimetype+";base64,"+req.files[0].buffer.toString("base64");
    convertedData.template = JSON.stringify(convertedData.template);
    examples['application/json'] = convertedData;

    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

