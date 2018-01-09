const AWS = require('aws-sdk-proxy');
const async = require('async');
const Client = require('ftp');
const parser = require('json2csv');
const sql = require('mssql');
const util = require('util');
const fs = require('fs');
const s3 = new AWS.S3({apiVersion: '2006-03-01', sslEnabled: false});
const c = new Client();
const fileName = 'data.csv';
const fields = [	'unitId',
					'dealerCode',
					'stockNum',
					'reserveFlag',
					'comments',
					'vehicleTradedDate',
					'daysInStock',
					'rdrStatus'
				];
/*
 * TODO:
 * Code clean-up
 * Obfuscate sensitive info
 * Refactor as node package
 * README
*/

module.exports.dataRefresh = async function(event, context, callback) {
	var dealerCd = event;
	await connectSQL(dealerCd).then(writeToFTP);
 	writeToS3();
}

async function connectSQL(dealerCd){
	try {
		const sqlConfig = {
				user: 'dduser',
				password: 'ddu100',
				server: 'sqld07',
				port: 8025,
				database: 'DealerDailyFRDev'
		};
		
		const sqlQuery = "select v.UID as 'unitId', v.dlrcode as 'dealerCode', CASE v.stockno when '' then 'NULL' else v.stockno end as 'stockNum', reserveflag as 'reserveFlag', CASE vehicleComments WHEN '' then 'NULL' else vehicleComments end as 'comments', CONVERT(varchar(24), ReceivedDate, 127) as 'vehicleTradedDate', CASE LastKnownDIS WHEN null then 0 ELSE LastKnownDIS end as 'daysInStock', CASE r.TransactionStatusCode WHEN '50' then 'Pending' WHEN '10' then 'Pending' WHEN '120' then 'Canceled' WHEN '80' then 'Failed' WHEN '250' then 'Pending' WHEN '300' then 'Pending' end as 'rdrStatus' from dd.VehicleInventory v left outer join dd.VehicleRDR r on v.uid = r.uid and v.dlrcode = r.dlrcode"
						+ " where v.dlrcode in(" + dealerCd + ")";

        let pool = await sql.connect(sqlConfig);
        console.log("SQL Connection SUCCESSS");
        let result = await pool.request().query(sqlQuery);
        return result;
	} catch(err){
		console.log('SQL query error: ' + err);
		throw err;
	}
}

function writeToFTP(event){
	// Parse to CSV
	var csv = parser({data: event.recordset, fields: fields});
	// Write CSV to local directory
	fs.writeFile(fileName, csv, function(err){
		if (err){
			throw err;
		} else{
			console.log("Data saved locally");
			
			c.connect({
				host: 'ftp3.test.toyota.com',
				user: 'ddoa_d',
				password: 'ZAq12wsx',
				connTimeout: 5000
			});

			c.on('ready', function(){
				
				// TODO: save file to specific directory path
				c.put(fileName, fileName, function(err){
					if(err){
						console.log('FTP Copy error: ' + err);
						throw err;
					} else{
						console.log("Data uploaded to FTP");
					}
				});
			});   
		}
	});
}

function writeToS3(){
	
	console.log("before writeToS3");
	
	var params = {
			  Bucket: 'rti-dev-ftp-s3',
			  Key: fileName,
			  Body: fs.createReadStream(fileName)
	    	}
	    	
	s3.putObject(params, function(err, data){
		if(err){
			console.log('Error uploading data to S3 bucket: ' + err);
			throw err;
		} else{
			console.log("Data uploaded to S3 bucket: ");
        	// Delete data.csv from local directory
        	fs.unlink(fileName, function(err){
                if(err) {
                	return console.log("Delete error: " + err);
                }
                else{
                	console.log("Data deleted successfully");
                	process.exit();
                }
            });
		}
	});
}