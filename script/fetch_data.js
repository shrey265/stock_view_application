require('dotenv').config({ path: "../.env" });

if (process.argv.length === 2) { 
    console.error('Expected at least one argument'); 
    process.exit(1); 
} 

const cliProgress = require('cli-progress');
const {connect,disconnect, getZipOnDate, getZip, unzip,unzipData,readAndInsert,readAndInsertData} = require('./utility.js');
const modes = ['-f','-y'];
const mode = process.argv[2];


const bar1 = new cliProgress.SingleBar({
    format: 'script running please wait... [{bar}] {percentage}% | ETA: {eta}s'
}, cliProgress.Presets.legacy);
    

if(modes.indexOf(mode)===-1) {
    console.error('Invalid argument');
    process.exit(1);
}



const getAndUpload50DaysData = async ()=>{
    bar1.start(100, 0);
    await getZip();
    await unzipData();
    bar1.update(50);
    await connect();
    await readAndInsertData();
    bar1.update(100);
    bar1.stop();
    disconnect();
}


const getAndUploadData = async ()=>{

    bar1.start(100, 0);
    const current_date = new Date();
    current_date.setDate(current_date.getDate()-1); // setting 1 day previous to present date
    const current_day = current_date.getDate();
    const current_month = current_date.getMonth()+1;
    const current_year = current_date.getFullYear();
    const monthDigit = current_month<10 ? '0' : '';
    const dayDigit = current_day<10 ? '0' : '';
    const file_name = `${dayDigit}${current_day.toString()}-${monthDigit}${current_month.toString()}-${current_year.toString()}.zip`
    const extract_name = `EQ${dayDigit}${current_day.toString()}${monthDigit}${current_month.toString()}${current_year.toString().substring(2,4)}.CSV`
    
    await getZipOnDate(current_date);
    await unzip(file_name);
    bar1.update(50);
    await connect();
    await readAndInsert(extract_name);
    bar1.update(100);
    bar1.stop();
    disconnect();
}



if(mode==='-f'){
    getAndUpload50DaysData();
}
else if(mode==='-y'){
    getAndUploadData()
}

