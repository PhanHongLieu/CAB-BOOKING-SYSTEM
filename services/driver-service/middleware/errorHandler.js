const logger = require('../../../shared/logger');

const { AppError } = require('../../../shared/errors');


exports.errorHandler = (err,req,res,next)=>{

 let statusCode = err.statusCode || 500;

 let message = err.message || "Server Error";


 /* ===== LOG ERROR ===== */

 logger.error({

 message:err.message,

 stack:err.stack

 });


 /* ===== MONGOOSE CAST ERROR ===== */

 if(err.name==="CastError"){

 statusCode=404;

 message="Resource not found";

 }


 /* ===== DUPLICATE KEY ===== */

 if(err.code===11000){

 statusCode=400;

 message="Duplicate value entered";

 }


 /* ===== VALIDATION ERROR ===== */

 if(err.name==="ValidationError"){

 statusCode=400;

 message=Object.values(err.errors)

 .map(e=>e.message)

 .join(",");

 }


 /* ===== GEOJSON ERROR ===== */

 if(err.message && err.message.includes("geo")){

 statusCode=400;

 message="Invalid location format";

 }


 res.status(statusCode).json({

 success:false,

 error:message,

 ...(process.env.NODE_ENV==="development" && {

 stack:err.stack

 })

 });

};
