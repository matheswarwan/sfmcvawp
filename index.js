// //var pdf = require('html-pdf');

// const initx = async () => {
//   //1. Get Auth Token to read from DE 
//   auth =  getAccessTokent();
//   console.log(auth);
// }
// initx();


// function getAccessTokent() {
//   console.log('')
// }


const production  = 'https://sfmvawp.herokuapp.com/';
const development = 'http://localhost:8080/';
const url = (process.env.NODE_ENV ? production : development);
