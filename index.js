const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

//#region imports
const c = require("canvas-lms-api");
const { Client } = require("@notionhq/client");
require("dotenv").config();
// Render Canvas description as text for the database
const { htmlToText } = require("html-to-text");
//#endregion imports

//#region parker variables
const parker_auth_header = "secret_ckmON7BF6UIPVCcK6kMayTAe0E0uFf9qmeO4I7t7jFk";

let parkersReq = [
  {
    cdom: "canvas.unl.edu",
    cid: "123464", // Autonoma
    notionUri:
      "https://www.notion.so/202d2b74596448dea5993eb13350e909?v=4961a5a1a56e42caa8fe2f963594ae4c",
    ctoken:
      "6507~ClQvg5c5BnDZ3dPBpeJR8mmXz1BhWlfv90Q4r8zGk9YAslngivVU6hIwuCABCMyU",
    notion_token:
      "96bccfc109d09018a78912c7a21292706967f3c66ca4444cdd6383c922628be37e6b6640b48857f23cfb57b6b29878b72f08e3935c4de65ec3029ef91f22770f28659d6418383006114f128e0c5e",
  },
  {
    cdom: "canvas.unl.edu",
    cid: "127715", // Business Law
    notionUri:
      "https://www.notion.so/202d2b74596448dea5993eb13350e909?v=4961a5a1a56e42caa8fe2f963594ae4c",
    ctoken:
      "6507~ClQvg5c5BnDZ3dPBpeJR8mmXz1BhWlfv90Q4r8zGk9YAslngivVU6hIwuCABCMyU",
    notion_token:
      "96bccfc109d09018a78912c7a21292706967f3c66ca4444cdd6383c922628be37e6b6640b48857f23cfb57b6b29878b72f08e3935c4de65ec3029ef91f22770f28659d6418383006114f128e0c5e",
  },
  {
    cdom: "canvas.unl.edu",
    cid: "127711", // Data & Models III
    notionUri:
      "https://www.notion.so/202d2b74596448dea5993eb13350e909?v=4961a5a1a56e42caa8fe2f963594ae4c",
    ctoken:
      "6507~ClQvg5c5BnDZ3dPBpeJR8mmXz1BhWlfv90Q4r8zGk9YAslngivVU6hIwuCABCMyU",
    notion_token:
      "96bccfc109d09018a78912c7a21292706967f3c66ca4444cdd6383c922628be37e6b6640b48857f23cfb57b6b29878b72f08e3935c4de65ec3029ef91f22770f28659d6418383006114f128e0c5e",
  },
  {
    cdom: "canvas.unl.edu",
    cid: "123447", // DS
    notionUri:
      "https://www.notion.so/202d2b74596448dea5993eb13350e909?v=4961a5a1a56e42caa8fe2f963594ae4c",
    ctoken:
      "6507~ClQvg5c5BnDZ3dPBpeJR8mmXz1BhWlfv90Q4r8zGk9YAslngivVU6hIwuCABCMyU",
    notion_token:
      "96bccfc109d09018a78912c7a21292706967f3c66ca4444cdd6383c922628be37e6b6640b48857f23cfb57b6b29878b72f08e3935c4de65ec3029ef91f22770f28659d6418383006114f128e0c5e",
  },
];
//#endregion end parker variables

parkersReq.forEach((req) => {
  AssignmentsToDB(req, parker_auth_header);
});

async function AssignmentsToDB(req, auth_header) {
  let notion;

  try {
    notion = new Client({ auth: auth_header });
  } catch (e) {
    console.log("Error authenticating");
    return;
  }

  // Get the Notion database ID, bugfix to fix problem identified by /u/nta103
  // Split by / to get URL path.
  const frags = req.notionUri.split("?")[0].split("/");

  // Get the last one, if this is empty then the URL probably ends with /, so get the second last one.
  const db_id =
    frags[frags.length - 1] == ""
      ? frags[frags.length - 2]
      : frags[frags.length - 1];

  // If the length is not 32, then it's invalid.
  if (db_id.replace("-", "").length !== 32) {
    console.log(
      "The Notion URL was not able to be parsed. Make sure it's in the format https://www.notion.so/user/380c311b9e2d4XXXX6c0125316a255d8 or https://www.notion.so/380c311b9e2d4XXXX6c0125316a255d8.\n\n\n"
    );
  }

  // Instantiate the Canvas API with the token we got from the client.
  const canvas = new c("https://" + req.cdom, {
    accessToken: req.ctoken,
  });

  let course;

  try {
    course = await canvas.get("courses/" + req.cid);
  } catch (e) {
    console.log("Error getting Canvas course\n\n\n");
    return;
  }

  const assignments = await canvas.get("courses/" + req.cid + "/assignments");
  let errors = [];

  for (let assn of assignments) {
    // Make a description with no HTML
    good_description = htmlToText(assn.description);

    try {
      const isDuplicate = await checkDuplicates(db_id, notion, assn);

      // // checks so that duplicates aren't created
      // const response = await notion.databases.query({
      //   database_id: db_id,
      //   page_size: 1000000, // make sure it gets all assignments
      // });
      // let results = response["results"];

      // let assignments = [];
      // results.forEach((result) => {
      //   let assignmentName = result.properties.Name.title[0]
      //     ? result.properties.Name.title[0].text.content
      //     : "";
      //   console.log(result.properties);
      //   assignments.push(assignmentName);
      // });

      if (isDuplicate) {
        console.log("Already in database");
      } else {
        //   Create a page under the database.
        await notion.pages.create({
          parent: {
            // Parent is the database from the ID.
            database_id: db_id,
          },

          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: assn.name,
                  },
                },
              ],
            },

            Course: {
              rich_text: [
                {
                  text: {
                    content: course.name,
                  },
                },
              ],
            },

            Description: {
              rich_text: [
                {
                  text: {
                    // Limit to 100 chars
                    content:
                      good_description.length < 100
                        ? good_description
                        : good_description.substring(0, 97) + "...",
                  },
                },
              ],
            },

            // Not sure how to get this from the API, for now just get the user to change it.
            Done: {
              checkbox: assn.has_submitted_submissions || false,
            },

            IncludedInFinalGrade: {
              checkbox: !assn.omit_from_final_grade,
            },

            Locked: {
              checkbox: assn.locked_for_user,
            },

            ...(assn.due_at
              ? {
                  Due: {
                    date: {
                      start: assn.due_at,
                      end: assn.due_at,
                    },
                  },
                }
              : {}),

            URL: {
              url: assn.html_url,
            },
            Status: {
              select: assn.has_submitted_submissions
                ? { name: "Complete", color: "green" }
                : { name: "Not Started", color: "red" },
            },
          },
        });
      }
    } catch (e) {
      console.log(e);
      console.error("Error on", assn.name);
      errors.push(assn);
    }
  }

  if (assignments.length > 0 && errors.length > 0) {
    if (errors.length == assignments.length) {
      console.log("All insertions wrong\n\n\n");
      return;
    } else {
      console.log("Some insertions wrong\n\n\n");
      return;
    }
  }

  console.log("Insertion complete");
}

async function checkDuplicates(db_id, notion, assn) {
  // checks so that duplicates aren't created
  let assignments = {};
  await notion.databases
    .query({
      database_id: db_id,
      page_size: 1000000, // make sure it gets all assignments
    })
    .then((response) => {
      let results = response["results"];

      results.forEach((result) => {
        let assignmentName = result.properties.Name.title[0]
          ? result.properties.Name.title[0].text.content
          : "";

        console.log(result.properties.Status.select.name);
        let doneWords = result.properties.Status.select.name;
        let isAssDone = doneWords === "Complete" ? true : false;
        assignments[assignmentName] = {
          isDone: isAssDone,
        };
      });

      console.log(assn.has_submitted_submissions);
      console.log(assignments);
    })
    .catch((e) => {
      console.log(e);
    });

  return assignments[assn.name] !== {};
}