//#region imports
const functions = require("firebase-functions");
import { parkersReq, parker_auth_header } from "./constants";
import { AssignmentsToDB } from "./util";
//#endregion imports

exports.updateAtEight = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("America/Chicago")
  .onRun((context) => {
    _runForPeople();

    return console.log("8am Script Complete!");
  });

function _runForPeople() {
  parkersReq.forEach((req) => {
    AssignmentsToDB(req, parker_auth_header);
  });

  return true;
}
