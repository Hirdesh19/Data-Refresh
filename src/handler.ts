// Imports
const AWS = require('aws-sdk-proxy');
const async = require('async');
const Client = require('ftp');
const parser = require('json2csv');
const sql = require('mssql');
const fs = require('fs');

// CSV Settings
const csvConfigParams = {
		 fileName: 'data.csv',
		 fields: [	'csvColumn1',
 					'csvColumn2',
 					'csvColumn3',
 					'csvColumn4'
 				]
}

// SQL Connection settings
const sqlConfigParams = {
		user: 'user',
		password: 'password',
		server: 'server',
		port: 8025,
		database: 'databaseName'
}

// FTP Connection settings
const c = new Client();
const ftpConfigParams = {
	host: 'host',
	user: 'user',
	password: 'password',
	connTimeout: 5000
}

// S3 Bucket Connection settings
const s3 = new AWS.S3({apiVersion: '2006-03-01', sslEnabled: false});
const s3ConfigParams = {
		  Bucket: 'bucketName',
		  Key: csvConfigParams.fileName,
		  Body: fs.createReadStream(csvConfigParams.fileName)
}

module.exports.dataRefresh = async function(event, context, callback) {
	await connectSQL(event).then(writeToFTP);
 	writeToS3();
}

async function connectSQL(query){
	try {
        let pool = await sql.connect(sqlConfigParams);
        
        console.log("SQL Connection SUCCESSS");
        
        let result = await pool.request().query(query);
        return result;
	} catch(err){
		console.err('SQL query error: ' + err);
		throw err;
	}
}

function writeToFTP(event){
	// Parse to CSV
	var csv = parser({data: event.recordset, fields: fields});
	// Write CSV to local directory
	fs.writeFile(csvConfigParams.fileName, csv, function(err){
		if (err){
			console.err('FTP Write error' + err);
			throw err;
		} else{
			console.log("Data saved locally");
			
			c.connect(ftpConfigParams);

			c.on('ready', function(){
				
				// TODO: save file to specific directory path
				c.put(csvConfigParams.fileName, csvConfigParams.fileName, function(err){
					if(err){
						console.err('FTP Copy error: ' + err);
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
	s3.putObject(s3ConfigParams, function(err, data){
		if(err){
			console.err('Error uploading data to S3 bucket: ' + err);
			throw err;
		} else{
			console.log("Data uploaded to S3 bucket: ");
			
        	// Delete data.csv from local directory
        	fs.unlink(csvConfigParams.fileName, function(err){
                if(err) {
                	return console.err("Delete error: " + err);
                }
                else{
                	console.log("Data deleted successfully");
                	process.exit();
                }
            });
		}
	});
}