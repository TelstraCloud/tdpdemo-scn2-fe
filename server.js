//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    request = require('request'),
    http = require('http');
    
Object.assign=require('object-assign');

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

var environment = process.env;   

var test_output_global;

const nodeMap = {
  "ip-172-31-32-19.ap-southeast-2.compute.internal" : "DC1",
  "ip-172-31-33-133.ap-southeast-2.compute.internal": "AZ1",
  "ip-172-31-38-70.ap-southeast-2.compute.internal" : "AZ2",
  "ip-172-31-42-224.ap-southeast-2.compute.internal": "DC2"
};

var myDetails; // = getMyDetails();

function getMyDetails() {
  var project_namespace = process.env.OPENSHIFT_BUILD_NAMESPACE;
  var hostname = process.env.HOSTNAME;

  if (hostname && project_namespace) {
    var url = `http://tdp-api-tdp.54.153.181.249.nip.io/projects/${project_namespace}/pods`;
    console.log("getting TDP API at: " + url);
    var project_info;

    request(url, function(err,res,body){
      if (res.statusCode === 200) {
            project_info = body;
            //console.log("project_info: " + project_info);

            var project = JSON.parse(project_info);
            var pod;

            for (i=0; i<project.pods.length; i++){
              if (project.pods[i].metadata.name === hostname) {
                pod = project.pods[i];
                break;
              }
            };
            if (!pod) { return defaultDetails();};

            var node = pod.spec.nodeName;

            var output = {
              zone: nodeMap[node],
              node: node,
              hostname: hostname,
              project: project_namespace
            };

            console.log("output:\n" + JSON.stringify(output,null,4) );
            myDetails = output; //lets make it global
            return;// output;

      } else {
        console.log("error retreiving TDP-API info: " + err);
        console.log("response status code: " + res.statusCode)
        return defaultDetails();
      }
    });

  };

  if (! (hostname && project_namespace /*&& project_info*/)) {
    // then something went wrong so we need to make up data
    console.log("something went wrong getting project_info OR ENV vars not set")
    return defaultDetails();
  };

  

}; //end getMyDetails()

function defaultDetails() {
  // this is what we send back if there's no pod info or we can't connect to the API or can't find env vars
  myDetails =  {
    zone: "UNK",
    node: "unknown node",
    hostname: "unknown host",
    project: "unknown project"
  };
  return;
}

getMyDetails();


console.log("myDetails:\n " + JSON.stringify(myDetails,null,4));

// this is to get network and OS info
var os = require( 'os' );
var networkInterfaces = os.networkInterfaces( ); //this is an object
var platformname = os.platform(); // this is a string



var calcPrimes = function(n) {
  var t1 = Date.now();
  //var n = 50000000;  //find primes up to n
  var upperbound = Math.floor(Math.sqrt(n)) + 1 ;

  var A = []; //this is all the numbers from 2..n

  for (k = 2; k <= n; k++) {
      A[k] = true;
  } 

  for (i = 2; i < upperbound; i++ ) {
    if (A[i] === true) {
      for (j = i*i; j <= n; j = j + i) {
        A[j] = false;
      }
    }
  }

  var countprimes = 0;

  for (k = 2; k <= n; k++) {
    if (A[k] === true) {
      countprimes++;
    }
  } 

  // get a prime from somewhere between 2 and 3/4 of the way through the list
  var lucky_index = Math.floor((Math.random() * countprimes * .75) + 2);
  var lucky_prime = 2;
  for (k = lucky_index; k <= n; k++) {
      if (A[k] === true) {
        lucky_prime = k;
        break;
      }
  } 


  var totalt = Date.now() - t1;

  return { countPrimes:countprimes,totalTime:totalt,luckyPrime: lucky_prime};
}

function print(err, result) {
  console.log(JSON.stringify(err || result, null, 4));
}



app.get('/', function (req, res) {
  var requested_n = req.query.num;
  var n = 1000000;
  if (requested_n) { n = parseInt(requested_n)}
  
  var pagecount = {};

  // TODO: need to catch error here

  // TODO: replace pagecount with array of primes 


/*
  var beHost = process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_HOST.toUpperCase().replace(/-/g,'_');
  var bePort = process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_PORT.toUpperCase().replace(/-/g,'_');
  console.log(`Attempting connection to BACK END using http://${beHost}:${bePort}`);
  if (!process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_HOST || !process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_PORT) {
    beHost = 'nodejs-mongodb-example-marcin-proj.54.153.181.249.nip.io';
    bePort = 80;
    console.log('env NODEJS_MONGODB_EXAMPLE_SERVICE_HOST or NODEJS_MONGODB_EXAMPLE_SERVICE_PORT not set');
  };
  console.log(`Will connect to BACK END using http://${beHost}:${bePort}`);

  http.get(`http://${beHost}:${bePort}/pagecount`, function(resp){
    resp.on('data', function(chunk){
      pagecount = JSON.parse(chunk).pageCount; //should ideally have a try block around this
      console.log("Page count: " + pagecount);
      var primesdata = calcPrimes(n);
      res.render('index.html', { 
                  pname : platformname, 
                  interfaces: networkInterfaces, 
                  totalPrimes: primesdata.countPrimes, 
                  totalTime: primesdata.totalTime,
                  luckyPrime: primesdata.luckyPrime,
                  pageCount: pagecount,
                  n: n });
    });
  }).on("error", function(e){
    console.log("Got error: " + e.message);
    pagecount = -1;
  });*/
  var primesdata = calcPrimes(n);
  res.render('index.html', { 
                pname : platformname, 
                interfaces: networkInterfaces, 
                totalPrimes: primesdata.countPrimes, 
                totalTime: primesdata.totalTime,
                luckyPrime: primesdata.luckyPrime,
                pageCount: 0,
                details: myDetails,
                n: n })
                
});

app.get('/pagecount', function (req, res) {
  
    res.send('{"pageCount": -1 }');
});

app.get('/kubes', function (req, res) {
    
    console.log("/kubes, myDetails: " + JSON.stringify(myDetails,null,4));
    console.log("/kubes, test_output_global: " + JSON.stringify(test_output_global,null,4));
    res.send(myDetails);
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
