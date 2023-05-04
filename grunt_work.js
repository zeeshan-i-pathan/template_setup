#! /usr/bin/env node
const fs = require('fs');
const { template } = require("lodash");

let args = {};
for (let index = 0; index < process.argv.length; index+=2){
  args[process.argv[index]] = process.argv[index+1]
}
if (args['-m']=='synctemplate' && args['-t']) {
    let t = args['-t']
    let template = require(t)
    template.templateKey = args['-o']
    template.tid = args['-o']
    if (typeof template.template=='object') {
        template.template = JSON.stringify(template.template);
    }
    if (typeof template.optionsMap=='object') {
        template.optionsMap = JSON.stringify(template.optionsMap);
    }
    fs.writeFile('./'+args['-o']+"-template.json", JSON.stringify(template), error => {

    });
}
console.log(args)
if (args['-m']=='formula') {
    console.log("Inside")
    const formula = require('./formula')
    let template = require(args['-o'])
    template.formulas.transformBack = formula.toString();
    console.log(template.formulas);
    fs.writeFile(args['-o'], JSON.stringify(template), error => {

    });
}