var express = require('express');
var app = express();
var rp = require('request-promise');
const cheerio = require('cheerio')
const tabletojson = require('tabletojson').Tabletojson;
const mongoose = require('mongoose');
var DayInfection = require('./models/infection.model');
require('dotenv').config({path: __dirname + '/.env'})
// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


// Set up mongoose connection
const mongoDB = process.env.MONGODB_URI;


let stateMap = new Map();
stateMap.set("Andhra Pradesh",[15.325,	78.611])
stateMap.set("Andaman and Nicobar Islands",[12.468,	92.815])
stateMap.set("Bihar",[25.66,86.257])
stateMap.set("Chandigarh",[30.730,76.766])
stateMap.set("Chhattisgarh",[22.267,	81.731])
stateMap.set("Delhi",[28.62,	77.205])
stateMap.set("Goa",[15.367,	73.968])
stateMap.set("Gujarat",[22.43,	70.898])
stateMap.set("Haryana",[29.112,	75.952])
stateMap.set("Himachal Pradesh",[32.081,	76.853])
stateMap.set("Karnataka",[14.731,	75.447])
stateMap.set("Kerala",[10.421,	76.348])
stateMap.set("Madhya Pradesh",[23.441,	77.183])
stateMap.set("Maharashtra",[19.537,	74.809])
stateMap.set("Manipur",[24.605,	93.618])
stateMap.set("Mizoram",[23.474,	92.868])
stateMap.set("Odisha",[20.444,	84.283])
stateMap.set("Puducherry",[11.948,	79.697])
stateMap.set("Punjab",[30.34,	75.094])
stateMap.set("Rajasthan",[26.829,	73.622])
stateMap.set("Tamil Nadu",[10.856,	79.426])
stateMap.set("Telengana",[17.88,	79.11])
stateMap.set("Jammu and Kashmir",[34.03,	76.288])
stateMap.set("Ladakh",[34.402,	78.291])
stateMap.set("Uttar Pradesh",[27.82, 79.721])
stateMap.set("Uttarakhand",[30.133,	78.973])
stateMap.set("West Bengal",[23.011,	87.658])
// set the home page route
app.get('/', function(req, res) {
    var largestInfected = 0;
    var thisUpdate = new Date();
    DayInfection.findOne({}).sort({updatedAt: -1}).exec(function(err,dayInf){
       if(err) {
        console.error(err);
        res.render('index');
       }
       var innerArr = dayInf.infections;
       var infectionArr = [];
        for(var i in innerArr){
            console.log(innerArr[i].state)
            var infection = innerArr[i].current;
            if (infection > largestInfected){
                largestInfected = infection;
            }
            if(stateMap.get(innerArr[i].state) === undefined) {
                stateMap.set(innerArr[i].state,[18.98,	67.76])
            }
            stateMap.get(innerArr[i].state).push(infection);
        }
        console.log(largestInfected);
         // ejs render automatically looks in the views folder
         res.render('index',{states:stateMap, largestInfected: largestInfected});
        //console.log(converted);
    });


});
app.get('/2', function(req, res) {
    var largestInfected = 0;
    var thisUpdate = new Date();
    rp('https://www.mohfw.gov.in/')
    .then(function (htmlString) {
        $ = cheerio.load(htmlString)
        obj = $('.content > div:nth-child(2)');
       // console.log(obj.html())
       const converted = tabletojson.convert(obj.html());
       var innerArr = converted[0];
       var infectionArr = [];
        for(var i in innerArr){
            if(i > innerArr.length -2) {
                continue;
            }
            console.log(innerArr[i]["Name of State / UT"])
            var infection = parseInt(innerArr[i]["Total Confirmed cases *"]);
            if (infection > largestInfected){
                largestInfected = infection;
            }
            if(stateMap.get(innerArr[i]["Name of State / UT"]) === undefined) {
                stateMap.set(innerArr[i]["Name of State / UT"],[18.98,	67.76])
            }
            stateMap.get(innerArr[i]["Name of State / UT"]).push(infection);
            infectionArr.push( {
                state: innerArr[i]["Name of State / UT"],
                current: infection,
                cured: parseInt(innerArr[i]["Cured/Discharged/Migrated"]),
                death: parseInt(innerArr[i]["Death"])
                
            });
        }
        var inf = new DayInfection({
            infections: infectionArr,
            updatedAt: thisUpdate
        });
    
        inf.save(function (err) {
            if (err) {
                console.log(err)
            }
        });
        console.log(largestInfected);
         // ejs render automatically looks in the views folder
         res.render('index',{states:stateMap, largestInfected: largestInfected});
        //console.log(converted);
    })
    .catch(function (err) {
        // Crawling failed...
        console.error(err);
        res.render('index');
    });

});
app.listen(port, function() {
    mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.connection.once('open', () => {
        console.info('Connected to Mongo via Mongoose');
    });
    mongoose.connection.on('error', (err) => {
        console.error('Unable to connect to Mongo via Mongoose', err);
    });
    console.log('Our app is running on http://localhost:' + port);
});