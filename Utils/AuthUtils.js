const validator = require("validator");

// validating the information by the user in the form
const cleanUpAndValidate = ({ name, email, username, password }) => {
  // want to return a promise so that if any error happens then can handle it with try catch or .then .catch and send it to client side
  return new Promise((resolve, reject) => {
    if (typeof email != "string") reject("Invalid email");
    if (typeof name != "string") reject("Invalid name");
    if (typeof username != "string") reject("Invalid username");
    if (typeof password != "string") reject("Invalid password");

    // if of string type but empty string
    if (!email || !password || !username) reject("Invalid data");

    // use validator package to validate email
    // package checks only for email format and not if the email is authentic or not
    if (!validator.isEmail(email)) reject("Invalid email format");

    if (username.length < 5) reject("Username too short");
    if (username.length > 50) reject("Username too long");
    if (password.length < 5) reject("Password too short");
    if (password.length > 200) reject("Password too long");

    // if everything correcta
    resolve();
  });
  // there is no need for a promise in manual validation that is done, but is required only for validator package
};

// can also write directly export but here exporting multiple functions hence writing this way
module.exports = { cleanUpAndValidate };
