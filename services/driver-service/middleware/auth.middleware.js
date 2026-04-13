const HttpClient = require('../../../shared/httpClient');

const { UnauthorizedError } = require('../../../shared/errors');

const logger = require('../../../shared/logger');


const authClient = new HttpClient(

 process.env.AUTH_SERVICE_URL ||

 'http://localhost:3001'

);



exports.authenticate = async(req,res,next)=>{

 try{


 const authHeader=req.headers.authorization;


 if(!authHeader){

 throw new UnauthorizedError(

 "Authorization header required"

 );

 }


 if(!authHeader.startsWith("Bearer ")){

 throw new UnauthorizedError(

 "Invalid token format"

 );

 }


 const token=authHeader.split(" ")[1];


 authClient.setAuthToken(token);


 const response=

 await authClient.get(

 "/api/auth/verify"

 );


 if(!response.success){

 throw new UnauthorizedError(

 "Invalid token"

 );

 }



 req.user={

 userId:response.data.user.id,

 email:response.data.user.email,

 role:response.data.user.role

 };



 logger.info(

 `Authenticated user ${req.user.userId}`

 );


 next();


 }catch(error){


 logger.error(

 "Auth error",

 error.message

 );


 if(error.response?.status===401){

 return next(

 new UnauthorizedError(

 "Invalid or expired token"

 )

 );

 }


 next(error);

 }

};

