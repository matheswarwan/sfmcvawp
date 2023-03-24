const axios = require('axios')
const express = require('express')
const path = require('path');
const hbs = require('hbs');
const html_to_pdf = require('html-pdf-node');
const FormData = require('form-data');
const bodyParser = require('body-parser');
var fs = require('fs');
var pdf = require('html-pdf');
const { 
  v1: uuidv1,
  v4: uuidv4,
} = require('uuid');
const { response } = require('express');

const production  = CF_PAGES_URL || 'https://sfmcvawp.pages.dev';
console.log('CF_PAGES_URL: ', CF_PAGES_URL );
console.log('Env: ', Env );
const development = 'http://localhost:8080';
const url = ( Env ? production : development);


const configSFMC = {
  authURI : process.env.authURI || "https://mcd5j7pnjymj6szljbfqhdb6jx2y.auth.marketingcloudapis.com/",
  restURI : process.env.restURI || "https://mcd5j7pnjymj6szljbfqhdb6jx2y.rest.marketingcloudapis.com/",
  clientId : process.env.clientId || "lnacybd1kedh6c6zetquhwbh",
  clientSecret : process.env.clientSecret || "YTHRYyp0it504hdibpJG92ls", 
  accountId: process.env.accountId || "1486252",
  packageName : process.env.packageName || "test",
  sendLogDE :  {
    name: process.env.name || "SendLog",
    key : process.env.key || "EAE6B1F7-D33E-43FE-910C-FD3EB94DA315",
    subscriberKey : process.env.subscriberKey || "AccountID",
    emailAddres : process.env.emailAddres || "emailaddr"
  },
  sfmcDomain : process.env.sfmcDomain || "email.alc.ca"
}

console.log('******************CONFIG VARIABLE*********************');
console.log(configSFMC);

let auth  = {
  accessToken : "",
  expiresIn : 0
}
const init = async () => {
  //1. Get Auth Token to read from DE 

  auth = await getAccessToken();
  console.log('Auth outisde ' , auth)

  deRows = await queryDE();
  console.log('DE Result ' , JSON.stringify(deRows.items));

  //2. STUB: Get view as webpage URL 

  let vawpURL = "http://view.sfmc.nait.ca/?qs=ccc627f5722b44cdd2c4a5ca36c452a1b1ae195ad93e71efdffb1908b217adbdefe9c01bcc543fe6be727432d54fbbbf5c4494bcc16dfcb45c17c79b61e221d336cad976e6351aa8193a303d68ed589c";
  vawpHtml = await getEmailHTML(vawpURL);


  //3. Replace tracker URLs 
  /*
    click, view - click.subdomain & view.subdomain 
  */
  // vawpHtml = vawpHtml.replaceAll('click.' + configSFMC.sfmcDomain , '')
  //             .replaceAll('open.' + configSFMC.sfmcDomain , '')

  //console.log(vawpHtml);

}

//init();

//Global Functions 
async function getAccessToken() { 
  let tmpAuth = {};
  let authURL = configSFMC.authURI + "v2/token";
  let body = {
    "grant_type": "client_credentials",
    "client_id": configSFMC.clientId,
    "client_secret": configSFMC.clientSecret,
    "account_id": configSFMC.accountId
    }

  return new Promise( (resolve, reject) => { 
    axios.post(
      authURL,
      body
    )
      .then(function(response){
        if(response.status == 200) {
          let date = new Date();
          date.setSeconds(date.getSeconds() + response.data.expires_in);
          tmpAuth.accessToken = response.data.access_token;
          tmpAuth.expiresIn = date;

          //console.log(tmpAuth);
          resolve(tmpAuth);
        }
      })
      .catch(function(error){
        console.error('UNABLE TO AUTHENTICATE!!')
        reject(error);
      })
  });
}

//https://salesforce.stackexchange.com/questions/152409/marketing-cloud-rest-api-get-method-to-data-extensions
async function queryDE(emailAddres) { 
  let tmpAuth = {};
  //GET https://{{et_subdomain}}.rest.marketingcloudapis.com/data/v1/customobjectdata/key/{{DataExtensionKey}}/rowset?$pageSize=20&$page=1&$filter={{columnName}}%20eq%20'{{value}}'
  let restURL = configSFMC.restURI 
    + "data/v1/customobjectdata/key/"
    + configSFMC.sendLogDE.key
    + "/rowset?$pageSize=20&$page=1&$filter="
    + configSFMC.sendLogDE.emailAddres
    +"%20eq%20'"
    +emailAddres
    +"'";


  console.log(restURL)

  let header = {
    headers : {
      Authorization : "Bearer " + auth.accessToken
    }
  }

  console.log('header in rest API ' , header)

  return new Promise( (resolve, reject) => { 
    axios.get(
      restURL,
      header
    )
      .then(function(response){
        //console.log(response);
        if(response.status == 200) {
          
          //console.log(tmpAuth);
          resolve(response.data);
        }
      })
      .catch(function(error){
        console.error('UNABLE TO AUTHENTICATE!!')
        reject(error);
      })
  });
}





async function getEmailHTML(url) { 
  return new Promise( (resolve, reject) => { 
    axios.get(
      url
    )
      .then(function(response){
        if(response.status == 200) {
          console.log(response.data)
          let vawpHtml = response.data;
          vawpHtml = vawpHtml.replaceAll('click.' + configSFMC.sfmcDomain , '')
          .replaceAll('open.' + configSFMC.sfmcDomain , '')
          .replaceAll('view.' + configSFMC.sfmcDomain , '')

          //console.log(tmpAuth);
          resolve(vawpHtml);
        }
      })
      .catch(function(error){
        console.error('UNABLE TO AUTHENTICATE!!')
        reject(error);
      })
  });
}


//Express App

const app = express()
const port = process.env.PORT || 8080;
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('.'));
app.use(bodyParser.json());



// https://blog.logrocket.com/top-express-js-template-engines-for-dynamic-html-pages/
// https://blog.bitsrc.io/how-to-render-static-and-dynamic-files-in-express-with-handlebars-2046609e1c8f
app.get("/", function(req, res){

  res.setHeader("Content-Type", "text/html")
  res.send(vawpHtml)


  //res.sendFile(path.join(__dirname, '/index.html'));

  // res.render("index", {
  //   name: vawpHtml, age: 24
  // });

  // res.render('index', {
  //   subject: 'Pug template engine',
  //   vawpHtml: vawpHtml,
  //   link: 'https://google.com'
  // });
});

app.get("/search", function(req, res){
  res.sendFile(path.join(__dirname, '/index.html'));
});

//https://www.npmjs.com/package/html-pdf?activeTab=readme
var html = fs.readFileSync('./index.html', 'utf8');

async function genPdfLocal(html, uuid) {
  return new Promise( (resolve, reject) => { 
    pdf.create(html).toFile('./pdfs/'+uuid+'.pdf', function(err, res){
      console.log('PDF Creation completed. ' + res.filename);
      resolve(res.filename);
    });  
  });
}

async function genPdf(html, uuid) {
  return new Promise( (resolve, reject) => { 
    // pdf.create(html).toFile('./pdfs/'+uuid+'.pdf', function(err, res){
    //   console.log('PDF Creation completed. ' + res.filename);
    //   resolve(res.filename);
    // });  

    const options = { format: 'A4', base: './pdfs/' }
    const fileName = uuid;
    const output = `./pdfs/${fileName}.pdf`
    pdf.create(html, options).toStream(function(err, stream){
      console.log('******* STREAMED PDF********* ', err, stream);
      resolve(stream);
    });
  //   pdf.create(html, options).toFile(output, function(error, response) {
  //     if (error) {
  //         console.log('****PDF Creation ERRORED****', error);
  //         reject(error);
  //     }
  //     else {
  //         console.log('****PDF Creation Successful****', response);
  //         resolve(response.filename);
  //     }
  //  });

  });
}

app.get("/download", async function(req, res){ 
  //console.log('html pdf called...' , html)
  // pdf.create( html ).toStream(function(err, stream){
  //   stream.pipe(fs.createWriteStream('./foo.pdf'));
  // });
  await genPdfLocal(vawpHtml);
  res.sendFile(path.join(__dirname, './bc.pdf'))
  
});

app.get("/download-old", function(req, res){ 
  console.log('download called')
  let options = { format: 'A4' };
  let file = { content: "<h1>Welcome to html-pdf-node</h1>" , name: 'somefilename.pdf' };
  // let file = { url: "https://example.com" , name : 'example.pdf' };

  html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
    console.log("PDF Buffer:-", pdfBuffer);
    res.send(pdfBuffer)
  });
  
});

app.get("/d", function(req, res){ 
  console.log('Download with axios processing...')
  // Prepare the PDF Generation schema.
  const generation = {
    html: 'template.html',
  };

  // Read the HTML template from disk.
  const template = fs.readFileSync('./template.html', { encoding: 'utf8' });

  // Pack the data in a multipart request.
  const body = new FormData();
  body.append('template.html', template, { filename: 'template.html' });
  body.append('generation', JSON.stringify(generation));

  (async () => {
    // Send the request to Processor.
    const response = await axios.post(url+'/process', body, {
      headers: body.getHeaders(),
      responseType: 'stream',
    });
    // Save the result to a file on disk.
    await response.data.pipe(fs.createWriteStream('invoice.pdf'));
  })();
  
});

//API endpoints 
app.get("/search/:email", async function(req, res){
  let email = req.params.email;
  let responseJson = {};
  console.log('Search for this email ', email);
  auth = await getAccessToken();
  console.log('Auth in email serachnig ' , auth)

  deRows = await queryDE(email);
  console.log('DE Result ' , JSON.stringify(deRows));
  if(deRows.items.length > 0 ) {
    responseJson['status'] = 'Records Found';
    responseJson['count'] = deRows.items.length;
    responseJson['emails'] = [];
    for(item in deRows.items) {
      let tmp = {};
      tmp['EmailName'] = (deRows.items[item]['values']['emailname'] ? deRows.items[item]['values']['emailname'] : 'Email Name Not Found') ; //TODO: Parameterize this
      tmp['View_Email_URL'] = deRows.items[item]['values']['view_email_url'];
      tmp['DateSent'] = (deRows.items[item]['values']['sentdate'] ? deRows.items[item]['values']['sentdate'] : 'No Date Found') ; //TODO: Parameterize this
      responseJson['emails'].push(tmp);
    }
  }
  console.log('Search result ' , responseJson)
  res.send(responseJson);
});

//Get View_email_url as input parameter and return html as ouput parameter 
app.post("/preview", async function(req, res){
  console.log(req.body);
  let reqBody = req.body;
  let view_email_url = req.body.view_email_url;
  let emailHtml = await getEmailHTML(view_email_url);

  res.send(emailHtml)
});

app.post("/download", async function(req, res){
  console.log(req.body);
  let uuid = uuidv4();
  let reqBody = req.body;
  let download_email_url = req.body.download_email_url;
  let emailHtml = await getEmailHTML(download_email_url);
  let filePath = await genPdfLocal(emailHtml, uuid);
  //res.sendFile(path.join(__dirname, './'+uuid+'.pdf'))
  let responseJson = {}
  responseJson['fileName'] = uuid + '.pdf';
  responseJson['filePath'] = filePath;
  responseJson['fileLocation'] = url + "/pdfs/"+uuid+".pdf";

  res.send(responseJson);
});


app.post("/downloadStream", async function(req, res){
  console.log(req.body);
  let uuid = uuidv4();
  let reqBody = req.body;
  let download_email_url = req.body.download_email_url;
  let emailHtml = await getEmailHTML(download_email_url);

  /* pdf.create(emailHtml, { format: 'A4', base: './pdfs/' }).toBuffer(function(err, buffer) {
    if (err) return res.send(err);
    res.type('pdf');
    res.end(buffer, 'binary');
  }); */

  let stream = await genPdf(emailHtml, uuid);
  //res.sendFile(path.join(__dirname, './'+uuid+'.pdf'))
  console.log('Stream in downloda endpoint ' , stream)
  // res.setHeader('Content-Length', stream.size);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename='+uuid+'.pdf');
  // res.setHeader('Content-Disposition', 'inline; filename='+uuid+'.pdf');
  stream.pipe(res);
  //res.send(responseJson); 
});

app.listen(port);
console.log('Server started at ' + url);
