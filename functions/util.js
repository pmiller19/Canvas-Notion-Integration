//#region imports
const c = require("canvas-lms-api");
const { Client } = require("@notionhq/client");
const { htmlToText } = require("html-to-text");
//#endregion imports

export async function AssignmentsToDB(req, auth_header) {
  let { notion, db_id, course, assignments } = _instantiateVariables(
    req,
    auth_header
  );
  let errors = [];

  for await (let assn of assignments) {
    // Make a description with no HTML
    good_description = htmlToText(assn.description);

    try {
      let isDuplicate = await _checkDuplicates(
        db_id,
        notion,
        assn,
        auth_header
      );

      if (isDuplicate) {
        console.log("Already in database");
      } else {
        console.log("Adding ", assn.name);
        // Create a page under the database.
        _createNotionPage(db_id, assn, good_description, course);
      }
    } catch (e) {
      console.log(e);
      console.error("Error on", assn.name);
      errors.push(assn);
    }
  }

  _validateInsertions(assignments, errors);

  return true;
}

async function _instantiateVariables(req, auth_header) {
  let notion;
  try {
    notion = new Client({ auth: auth_header });
  } catch (e) {
    console.log("Error authenticating");
    return;
  }

  // Get the Notion database ID
  const frags = req.notionUri.split("?")[0].split("/");

  // Get the last one, if this is empty then the URL probably ends with /, so get the second last one.
  const db_id =
    frags[frags.length - 1] == ""
      ? frags[frags.length - 2]
      : frags[frags.length - 1];

  _validateNotionURL(db_id);

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

  return { notion, db_id, course, assignments };
}

function _validateNotionURL(db_id) {
  // If the length is not 32, then it's invalid.
  if (db_id.replace("-", "").length !== 32) {
    console.log(
      "The Notion URL was not able to be parsed. Make sure it's in the format https://www.notion.so/user/380c311b9e2d4XXXX6c0125316a255d8 or https://www.notion.so/380c311b9e2d4XXXX6c0125316a255d8.\n\n\n"
    );
  }
}

function _validateInsertions(assignments, errors) {
  if (assignments.length > 0 && errors.length > 0) {
    if (errors.length == assignments.length) {
      console.log("All insertions wrong\n\n\n");
      return;
    } else {
      console.log("Some insertions wrong\n\n\n");
      return;
    }
  }
}

async function _createNotionPage(db_id, assn, good_description, course) {
  await notion.pages.create({
    parent: {
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
        select: { name: "Not Started", color: "red" },
      },
    },
  });
}

function _checkDuplicates(db_id, notion, assn) {
  // checks so that duplicates aren't created
  return notion.databases
    .query({
      database_id: db_id,
      filter: {
        and: [
          {
            property: "Name",

            text: {
              equals: assn.name,
            },
          },
        ],
      },
    })
    .then((response) => {
      let results = response["results"];
      if (results.length > 0) {
        return true;
      } else {
        console.log(results);
        return false;
      }
    })
    .catch((e) => {
      console.log(e);
      return true;
    });
}
