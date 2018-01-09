# CSV-data-refresh

Automated data refresh that parses results from SQL query to CSV, then uploads to FTP server and AWS S3 bucket. Deployed using Serverless to refresh data at user-specified intervals.

## Installation

```
https://github.com/roberthelmick08/CSV-data-refresh.git
```

```cd``` into the newly created directory.

```
npm install
```

## Deployment

* ```serverless.yml```:
    * At ```provider.iamRoleStatements.Resource```)(Rows 97-98):
       * Update with the desired source bucket name
    * At ```functions.copyFilesToS3.events.s3.bucket``` (Row 134):
       * Update with the source bucket name
* ```handler.ts```: 
    * Update value of ```srcBucket``` global variable (Row 4)
    * Update FTP ```host```, ```username``` and ```password``` values (Rows 16 - 18)
* In Git Bash, use command ```serverless deploy```

## Author

* Robert Helmick