var express = require('express');
var app = express();
var rp = require('request-promise');
const cheerio = require('cheerio')
const tabletojson = require('tabletojson').Tabletojson;
const mongoose = require('mongoose');
var DayInfection = require('./models/infection.model');
var SummaryInfection = require('./models/summary.model');
var CronJob = require('cron').CronJob;
const { fetch } = require("./scrapers/index.js");
require('dotenv').config({path: __dirname + '/.env'})
// set the port of our application
// process.env.PORT lets the port be set by Heroku (?=<!--)([\s\S]*?)-->
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


// Set up mongoose connection
const mongoDB = process.env.MONGODB_URI;

let regexp = /(?<=<!--)([\s\S]*?)-->/m;


let stateMap;
function setStates() {
    stateMap = new Map();
stateMap.set("Andhra Pradesh",[15.325,	78.611])
stateMap.set("Andaman and Nicobar Islands",[12.468,	92.815])
stateMap.set("Arunachal Pradesh",[28.179,	94.688])
stateMap.set("Assam",[26.629,92.546])
stateMap.set("Bihar",[25.66,86.257])
stateMap.set("Chandigarh",[30.730,76.766])
stateMap.set("Chhattisgarh",[22.267,	81.731])
stateMap.set("Dadra and Nagar Haveli and Daman and Diu",[20.179,	73.021])	
stateMap.set("Delhi",[28.62,	77.205])
stateMap.set("Goa",[15.367,	73.968])
stateMap.set("Gujarat",[22.43,	70.898])
stateMap.set("Haryana",[29.112,	75.952])
stateMap.set("Himachal Pradesh",[32.081,	76.853])
stateMap.set("Jharkhand",[23.483,	85.302])
stateMap.set("Karnataka",[14.731,	75.447])
stateMap.set("Kerala",[10.421,	76.348])
stateMap.set("Madhya Pradesh",[23.441,	77.183])
stateMap.set("Maharashtra",[19.537,	74.809])
stateMap.set("Manipur",[24.605,	93.618])
stateMap.set("Meghalaya",[25.573,	91.209])
stateMap.set("Mizoram",[23.474,	92.868])
stateMap.set("Nagaland",[26.152,	94.598])
stateMap.set("Odisha",[20.444,	84.283])
stateMap.set("Puducherry",[11.948,	79.697])
stateMap.set("Punjab",[30.34,	75.094])
stateMap.set("Rajasthan",[26.829,	73.622])
stateMap.set("Sikkim",[27.558,	88.439])
stateMap.set("Tamil Nadu",[10.856,	79.426])
stateMap.set("Telengana",[17.88,	79.11])
stateMap.set("Tripura",[23.795,	91.673])
stateMap.set("Jammu and Kashmir",[34.03,	76.288])
stateMap.set("Ladakh",[34.402,	78.291])
stateMap.set("Uttar Pradesh",[27.82, 79.721])
stateMap.set("Uttarakhand",[30.133,	78.973])
stateMap.set("West Bengal",[23.011,	87.658])
}
// set the home page route
app.get('/', function(req, res) {
    setStates();
    var largestInfected = 0;
    var thisUpdate = new Date();
    DayInfection.findOne({}).sort({updatedAt: -1}).exec(function(err,dayInf){
       if(err) {
        console.error(err);
        res.render('index');
       }
       var innerArr = dayInf.infections;
       var confirmedArr = [];
        for(var i in innerArr){
            
            var confirmed = innerArr[i].current + innerArr[i].cured + innerArr[i].death;
            if (confirmed > largestInfected){
                largestInfected = confirmed;
            }
            if(stateMap.get(innerArr[i].state) === undefined) {
                stateMap.set(innerArr[i].state,[18.98,	67.76])
            }
            console.log(innerArr[i].state, confirmed);
            stateMap.get(innerArr[i].state).push(confirmed);
        }
        console.log(largestInfected);
        fillSummaryInf(res,largestInfected);
       
        //console.log(converted);
    });


});

function fillSummaryInf(res,largestInfected){
    var days = [];
    var current = [];
    var mortality = [];
    SummaryInfection.find({ }).sort({day: 1}).exec(function(err,dayInf){ //day: {$gte: new Date(2020, 5, 1)}
     //   console.log("dayInf",dayInf);
        if(err) {
         console.error(err);
        }
        for(var i in dayInf) {
            let date1 = dayInf[i].day;
            let month = parseInt(date1.substring(date1.indexOf("-")+1,date1.lastIndexOf("-")))
            if( month < 5) {
                continue;
            }
            let dayofMonth = parseInt(date1.substring(date1.lastIndexOf("-")+1))
            if(month < 8) {
                let day = parseInt(date1.substring(date1.lastIndexOf("-")+1));
                if(!isOdd(day))
                    continue;
            }
            days.push(date1.substring(date1.indexOf('-')+1));
            if ((month == 7 && dayofMonth > 26) || month > 7) {
                console.log(dayInf[i].infections[0].current , dayInf[i].infections[0].cured , dayInf[i].infections[0].death)
                current.push(dayInf[i].infections[0].current + dayInf[i].infections[0].cured +  dayInf[i].infections[0].death);
            } else {
                current.push(dayInf[i].infections[0].current);
            }
            mortality.push(dayInf[i].infections[0].death);
        }
        console.log("days",days);
        // ejs render automatically looks in the views folder
        res.render('index',{states:stateMap, largestInfected: largestInfected, days: days, current: current, mortality: mortality});
    });

}
function isOdd(num) { return num % 2;}

 function  update(res) {
    var largestInfected = 0;
    var thisUpdate = new Date();

    fetch(
        'https://www.mohfw.gov.in/',
        error => {
          console.log(error);
        },
        htmlString => {
            try {
                
                $ = cheerio.load(htmlString)
                obj = $('#state-data > div > div > div > div');
                let body = obj.html()//.match(regexp);
               console.log(body)
               const converted = tabletojson.convert("<table>"+body+"</table>");
               var innerArr = converted[0];
               var confirmedArr = [];
               let current = 0,cured = 0,death = 0;
               for (var i = 0; i < innerArr.length; i++){
                   const rowVal = Object.values(innerArr[i]);
                   let sn = rowVal[2]; //S. No
                   if (!/^\d+?/.exec(sn)) {
                       continue;
                   }
                    console.log(">>>>>>>"+sn+"<<<<<<<<<<<<<<<<");
                    var confirmed = parseInt(rowVal[4]);
                    if(confirmed == 0) {
                        continue;
                    }
                    if (confirmed > largestInfected){
                        largestInfected = confirmed;
                    }
                    let state = rowVal[3];
                    state = state.replace(/[^a-zA-Z ]/g, "")
                    if(state == '') {
                        continue;
                    }
                    if(stateMap.get(state) === undefined) {
                        stateMap.set(state,[18.98,	67.76])
                    }
                    stateMap.get(state).push(confirmed);
                    var item = {
                    state: state,
                    current: confirmed,
                    cured: parseInt(rowVal[6].replace(/[^0-9 ]/g, "")),
                    death: parseInt(rowVal[0].replace(/[^0-9 ]/g, ""))  
                }
                    console.log(item);
                    current += item.current;
                    cured += item.cured;
                    death += item.death;
                    confirmedArr.push( item);
                }
                var inf = new DayInfection({
                    infections: confirmedArr,
                    updatedAt: thisUpdate
                });
            
                inf.save(function (err) {
                    if (err) {
                        console.log(err)
                    }
                });
               
                 SummaryInfection.update({day: thisUpdate.toISOString().slice(0,10)}, {
                    infections:  [{
                        state: "Total",
                        current: current,
                        cured: cured,
                        death: death        
                    }],
                    day: thisUpdate.toISOString().slice(0,10)
                }, { upsert : true}, (err, doc) => {
                    if (err) {
                        console.log("Something wrong when updating data!");
                    }
                
                    console.log(doc);
                })
                fillSummaryInf(res,largestInfected);
                
            } catch (err) {
                // Crawling failed...
                throw err;
            };
        }
      );


}

app.get('/update', function(req, res) {
        try {
            setStates();
            // ejs render automatically looks in the views folder
            update(res);
        }
    catch( err) {
        // Crawling failed...
        console.error(err);
        res.render('index');
    }

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

var job = new CronJob("0 21 * * *", function () {
    console.log("Running Cron Job");
    update(null);
}, null, true, 'Asia/Kolkata');
job.start();