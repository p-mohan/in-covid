const mongoose = require('mongoose');
var DayInfection = require('./models/infection.model');
var SummaryInfection = require('./models/summary.model');
require('dotenv').config({path: __dirname + '/.env'})


// Set up mongoose connection
const mongoDB = process.env.MONGODB_URI;

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once('open', () => {
    console.info('Connected to Mongo via Mongoose');
});
mongoose.connection.on('error', (err) => {
    console.error('Unable to connect to Mongo via Mongoose', err);
});
var myMap = new Map();

DayInfection.aggregate([
    [
        {
            $project: {
                   infections: "$infections",
                   updatedAt: "$updatedAt",
                   yearMonthDay: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }
            }
        },
       { $sort: {updatedAt: -1}},
       { $sort: {yearMonthDay: -1}}

     ]
  
    ]).sort({updatedAt: -1}).exec(function(err,dayInf){
        console.log("Got results");
   // console.log(dayInf)
    if(err) {
     console.error(err);
     res.render('index');
    }
     for(var i in dayInf){
         if(!myMap.has(dayInf[i].yearMonthDay)) {
            myMap.set(dayInf[i].yearMonthDay,dayInf[i] )
         }
      }
 /*    myMap.forEach((value, key, map) => {
        console.log(`map.get('${key}') = ${value.toISOString()}`)
    }) */
    
    myMap.forEach((value, key, map) => {
        let current = 0,cured = 0,death = 0;
        var infectionArr = [];
        for(i in value.infections) {
            var infection =  value.infections[i];
            current += infection.current;
            cured += infection.cured;
            death += infection.death;
        }
        console.log (current,cured,death)
        infectionArr.push( {
            state: "Total",
            current: current,
            cured: cured,
            death: death        
        });
        var inf = new SummaryInfection({
            infections: infectionArr,
            day: key
        });
        inf.save(function (err) {
            if (err) {
                console.log(err)
            }
        });
    });
    
    
     //console.log(converted);
 });