const path=require('path');require('dotenv').config({path:path.join(__dirname,'../.env')});
require('../services/emailService').verify().then(result=>console.log(result.message)).catch(()=>{console.error('Gmail SMTP verification failed. Check EMAIL_ENABLED, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env. No email was sent.');process.exitCode=1;});
