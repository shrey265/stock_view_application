const https = require('https')
const fs = require('fs');
const decompress = require("decompress");
const async = require("async");
const { resolve } = require('path');
const { parse } = require("csv-parse");
const mongoose = require("mongoose");
const Stock = require("../data_models/stock_data")
const cliProgress = require('cli-progress');
const trackFile = "../data_files/uploaded_files.txt"
mongoose.set('strictQuery',false);


const connect = async ()=> new Promise(
    (resolve)=>{
        mongoose.connect(
            process.env.MONGODB_CREDENTIALS,
            (err) => {
             if(err) console.log(err) ;
             else {
                resolve(true);
             }
            }
          );
    }
)


const disconnect = () => {
    mongoose.connection.close();
}



const getZipOnDate = (date) => new Promise(
    (resolve) =>{

            const day = date.getDate();
            const month = date.getMonth()+1;
            const year = date.getFullYear();
            const monthDigit = month<10 ? '0' : '';
            const dayDigit = day<10 ? '0' : '';
            const file_link = 'https://www.bseindia.com/download/BhavCopy/Equity/EQ'+dayDigit+day.toString()+monthDigit+month.toString()+year.toString().substring(2)+'_CSV.ZIP';
            
                
            const request = https.get(file_link, function(response) {
                if(response.statusCode===200){
                    const file = fs.createWriteStream(`../data_files/archives/${dayDigit}${day.toString()}-${monthDigit}${month.toString()}-${year.toString()}.zip`);
                    response.pipe(file);
                    file.on("finish", () => {
                        file.close();
                        // console.log("Download Completed");
                        resolve(true);
                        });
                }
                else{
                    resolve(false);
                }
            }
        );
    }
)



const getZip = () => new Promise(
    (resolve) =>{
        const date = new Date();
        const new_date = new Date();
        new_date.setDate(new_date.getDate()-50);
        
        dateList = []
        while(new_date.getTime()<date.getTime()){
            dateList.push(new Date(new_date));
            new_date.setDate(new_date.getDate()+1);
        }
        Promise.all(dateList.map((date)=>getZipOnDate(date))).then(()=>resolve(true))
    }
);


const unzip = (file) => new Promise(
    (resolve)=>{
    decompress(`../data_files/archives/${file}`, "../data_files/extract")
    .then(
        ()=>{resolve(true)}
    )
    .catch((error) => {
        console.log(error);
    })
    
}
)

const unzipData = () => new Promise(
    (resolve) => {
        fs.readdir('../data_files/archives', (err, files) => {
        if (err) throw err;
        Promise.all(files.map((file)=>unzip(file))).then(()=>{resolve(true)})
            }
        );
    }
);


const readAndInsert = (file) => new Promise(
async (resolve) => {
    
    const trackingFileContent = fs.existsSync(trackFile)
        ? fs.readFileSync(trackFile, 'utf8')
        : '';

    if (trackingFileContent.includes(file)) {
        // console.log(`File '${file}' already uploaded. Skipping.`);
        resolve(false);
        return;
    }

    const day = file.substring(2,4);
    const month = file.substring(4,6)-1;
    const year = `20${file.substring(6,8)}`;
    const date = new Date(year,month,day);
    
    let stocks = [];
    fs.createReadStream(`../data_files/extract/${file}`)
        .pipe(parse({ 
        delimiter: ",",
        columns: true,
        ltrim: true,
        rtrim: true
     }))
            .on("data", function (row) {
                stocks.push({
                code: row.SC_CODE,
                    name: row.SC_NAME,
                    open: row.OPEN,
                    high: row.HIGH,
                    low: row.LOW,
                    close: row.CLOSE,
                    date:date.toLocaleString()
                })
                })
                .on("error", function (error) {
                    console.log(error.message);
                    resolve(false);
                })
                    .on("end", async function () {
                        await Stock.insertMany(stocks);
                        // console.log("finished");
                        fs.appendFileSync(trackFile, file + '\n', 'utf8');
                        resolve(true);
                    })
        }
)


const readAndInsertData = () => new Promise(
    (resolve) => {
        fs.readdir('../data_files/extract', (err, files) => {
        if (err) throw err;
        Promise.all(files.map((file)=>readAndInsert(file))).then(()=>{resolve(true)})
        });
    }
);

module.exports = {
    connect,
    disconnect,
    getZipOnDate,
    getZip,
    unzip,
    unzipData,
    readAndInsert,
    readAndInsertData
}