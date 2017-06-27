//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    http = require('http');
    
Object.assign=require('object-assign');

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

var environment = process.env;   

// this is to get the k8s info
const Api = require('kubernetes-client');
const JSONStream = require('json-stream');
const jsonStream = new JSONStream(); 

// determine the cluster host and port
var k8sHost = process.env.KUBERNETES_SERVICE_HOST;
var k8sPort = process.env.KUBERNETES_SERVICE_PORT;
if (!process.env.KUBERNETES_SERVICE_HOST || !process.env.KUBERNETES_SERVICE_PORT) {
  k8sHost = '54.153.181.249.nip.io';
  k8sPort = '8443';
  console.log('env KUBERNETES_SERVICE_HOST or KUBERNETES_SERVICE_PORT not set');
  //console.log(`using https://${k8sHost}:${k8sPort}`);
}
//  k8sHost = '54.153.181.249.nip.io';
//  k8sPort = '8443';
console.log(`Will connect to kubernetes cluster using https://${k8sHost}:${k8sPort}`);
// read the token from the service account
var token = "";
if (process.env.MYTOKEN) {
  token = process.env.MYTOKEN;
  console.log('Kubes: Using MYTOKEN');
} else  {
  if (fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')) {
     token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
     console.log('Kubes: Using serviceaccount/token');
  } else {
      console.log('ERROR: Kubes no token')
  }
}
var namespace = "";
if (fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace')) {
   namespace = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace', 'utf8');
}
// connect to the API server

  const core = new Api.Core({
    url: `https://${k8sHost}:${k8sPort}`,
    auth: {
      bearer: token,
    },
    insecureSkipTlsVerify: true,
    version: 'v1',
    namespace: namespace
  });


//console.log("token: " + token);
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

var getK8SInfo = function() {

  //console.log('connecting to k8s api at ' + core.url);

  //const core = new Api.Core(Api.config.getInCluster());
  //console.log('core: ' + JSON.stringify(core))


  core.namespaces.pods.get(function (err, result) {
    if (err) {
      console.log("error getting pods: " + err)
      return err;
    }
    console.log("pods: " + JSON.stringify(err || result, null, 2));
    return result;
  });
  //return core; //JSON.stringify(core);
};

app.get('/', function (req, res) {
  var requested_n = req.query.num;
  var n = 1000000;
  if (requested_n) { n = parseInt(requested_n)}
  
  var pagecount = {};

  // TODO: replace pagecount with array of primes
  var beHost = process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_HOST;
  var bePort = process.env.NODEJS_MONGODB_EXAMPLE_SERVICE_PORT;
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
  });
  //var primesdata = calcPrimes(n);
  /*res.render('index.html', { 
                pname : platformname, 
                interfaces: networkInterfaces, 
                totalPrimes: primesdata.countPrimes, 
                totalTime: primesdata.totalTime,
                luckyPrime: primesdata.luckyPrime,
                pageCount: pagecount,
                n: n })
                */
});

app.get('/pagecount', function (req, res) {
  
    res.send('{"pageCount": -1 }');
});

app.get('/kubes', function (req, res) {
    var k = getK8SInfo();

    var k0 = k.pods.items[0].metadata.name;
    console.log(k0)
    //var a = JSON.stringify(getK8SInfo(),null,4);
    //console.log(`kubes info: ${a}`)
    //res.setHeader('Content-Type', 'application/json');
    res.send(k0);
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
