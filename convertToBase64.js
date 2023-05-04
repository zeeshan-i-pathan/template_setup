#! /usr/bin/env node
let args = {};
for (let index = 0; index < process.argv.length; index+=2){
  args[process.argv[index]] = process.argv[index+1]
}
if (Object.keys(args).indexOf("-help")>-1) {
  console.log("Usage \n","-t templateKey\n","-f fileToBase64\n","-e fileFormat (E.g data:application/pdf)\n","-o outputFile")
} else {
  let template = {
    organization: "",
    version: 1,
    effectiveDT: new Date().toISOString(),
    expiryDT: new Date().toISOString().replace(/[0-9]{4}/,"2999"),
    status: "ACTIVE",
    template: {},
    templateKey: args['-t'],
    tid: args['-t'],
  };
  var {exec} = require('child_process');
  console.log(`base64 "${args['-f']}"`)
  exec(`base64 "${args['-f']}"`,(error, stdout, stderr) => {
    console.log(stdout)
    file = {file: args['-e']+';base64,'+stdout}
    template.template = JSON.stringify(file);
    const fs = require('fs');
    fs.writeFile(args['-o'], JSON.stringify(template), error => {

    });
  });
}


