const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();


// Create Schema variable
const Schema = mongoose.Schema;

// Define userSchema
const userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User; // to be defined on new connection (see initialize)

// Initialize function
function initialize() {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(process.env.MONGODB);
        
        db.on('error', (err) => {
            reject(err); // reject the promise with the provided error
        });
        
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
}

// Register user function
// Register user function
function registerUser(userData) {
    return new Promise((resolve, reject) => {
        // Check if passwords match
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        } else {
            // Hash the password before saving
            bcrypt.hash(userData.password, 10)
                .then(hash => {
                    // Replace the plain password with the hashed version
                    userData.password = hash;
                    
                    // Create new user with hashed password
                    let newUser = new User(userData);
                    
                    return newUser.save();
                })
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    if (err.code === 11000) {
                        reject("User Name already taken");
                    } else {
                        reject("There was an error creating the user: " + err);
                    }
                })
                .catch(err => {
                    reject("There was an error encrypting the password");
                });
        }
    });
}


// Check user function
// Check user function
function checkUser(userData) {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName })
            .then(users => {
                if (users.length === 0) {
                    reject("Unable to find user: " + userData.userName);
                } else {
                    // Compare the hashed password with the entered password
                    bcrypt.compare(userData.password, users[0].password)
                        .then((result) => {
                            if (result === false) {
                                reject("Incorrect Password for user: " + userData.userName);
                            } else {
                                // Update login history
                                if (users[0].loginHistory.length === 8) {
                                    users[0].loginHistory.pop();
                                }
                                
                                users[0].loginHistory.unshift({
                                    dateTime: (new Date()).toString(),
                                    userAgent: userData.userAgent
                                });
                                
                                User.updateOne(
                                    { userName: users[0].userName },
                                    { $set: { loginHistory: users[0].loginHistory } }
                                )
                                .then(() => {
                                    resolve(users[0]);
                                })
                                .catch(err => {
                                    reject("There was an error verifying the user: " + err);
                                });
                            }
                        });
                }
            })
            .catch(err => {
                reject("Unable to find user: " + userData.userName);
            });
    });
}

module.exports = { initialize, registerUser, checkUser };